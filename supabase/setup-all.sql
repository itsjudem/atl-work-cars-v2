-- ATL Work Cars — complete database setup (all migrations in order).
-- Generated from supabase/migrations/*.sql. Paste into Supabase → SQL Editor → Run, ONCE per project.
-- Do not edit here; edit the migration files and regenerate.


-- >>> migrations/20260918000100_types_and_profiles.sql
-- ATL Work Cars — 0001: types, staff profiles, permission helpers
--
-- Conventions used by every migration:
--   * Timestamps are timestamptz, stored UTC; the admin shows America/New_York.
--   * Phones are stored as exactly 10 digits; emails lowercase. Triggers normalise.
--   * Deliberate errors use SQLSTATE AWC01–AWC99 so the app can map them to
--     friendly wording. A forbidden UPDATE/DELETE under RLS affects 0 rows
--     instead of raising — the app must treat "0 rows" as "no permission".
--   * The "actor" for history and guards is auth.uid(); trusted server code using
--     the secret key names the responsible staff member through RPCs that set
--     app.actor_id (see 0009_admin_rpcs).

-- ---------------------------------------------------------------- types
create type public.staff_role as enum ('owner', 'sales', 'fleet_manager', 'viewer');
create type public.contact_source as enum ('contact_form', 'application', 'manual');
create type public.rating as enum ('high', 'low');
create type public.lead_category as enum ('hot', 'warm', 'low_priority', 'dead', 'unrated');
create type public.vehicle_status as enum ('available', 'rented', 'in_repair');

-- ---------------------------------------------------------------- small pure helpers
-- Digits only; a leading US country code 1 on an 11-digit number is dropped.
create function public.normalize_phone(p text) returns text
language sql immutable parallel safe set search_path = ''
as $$
  select case
    when p is null then null
    when length(regexp_replace(p, '\D', '', 'g')) = 11
         and left(regexp_replace(p, '\D', '', 'g'), 1) = '1'
      then substr(regexp_replace(p, '\D', '', 'g'), 2)
    else nullif(regexp_replace(p, '\D', '', 'g'), '')
  end
$$;

-- "7705550100" → "(770) 555-0100"
create function public.format_phone(p text) returns text
language sql immutable parallel safe set search_path = ''
as $$
  select case when p ~ '^\d{10}$'
    then '(' || substr(p, 1, 3) || ') ' || substr(p, 4, 3) || '-' || substr(p, 7)
    else p end
$$;

-- ---------------------------------------------------------------- profiles
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null unique check (email = lower(email) and email like '%_@_%'),
  full_name   text not null check (length(btrim(full_name)) between 1 and 100),
  role        public.staff_role not null default 'viewer',
  is_active   boolean not null default true,
  invited_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);

comment on table public.profiles is
  'One row per staff member who can log in. Created automatically when an auth user is created (invite).';

-- ---------------------------------------------------------------- permission helpers
-- Defined AFTER profiles: SQL-bodied functions are validated at creation.
-- Role and active status are read from the table on EVERY call, so a role change
-- or deactivation takes effect on the very next request.

-- The logged-in staff member's role, or NULL if not staff or deactivated.
create function public.current_staff_role() returns public.staff_role
language sql stable security definer set search_path = ''
as $$
  select p.role from public.profiles p where p.id = auth.uid() and p.is_active
$$;

create function public.is_staff() returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.current_staff_role() is not null
$$;

create function public.has_role(variadic roles public.staff_role[]) returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(public.current_staff_role() = any (roles), false)
$$;

-- Who is responsible for the current change: the logged-in user, or the staff
-- member named by trusted server code via app.actor_id. NULL = public website.
create function public.actor_id() returns uuid
language sql stable set search_path = ''
as $$
  select coalesce(auth.uid(), nullif(current_setting('app.actor_id', true), '')::uuid)
$$;

-- Role of the actor (works for secret-key RPCs that set app.actor_id).
create function public.actor_role() returns public.staff_role
language sql stable security definer set search_path = ''
as $$
  select p.role from public.profiles p where p.id = public.actor_id() and p.is_active
$$;

-- True when running as a trusted database role (dashboard SQL editor, migrations),
-- i.e. not through the API as anon / authenticated / service_role.
create function public.is_trusted_session() returns boolean
language sql stable set search_path = ''
as $$
  select current_user not in ('anon', 'authenticated', 'service_role')
$$;

-- ---------------------------------------------------------------- profile creation
-- Invites are sent by the server (secret key) with user metadata
-- { full_name, role, invited_by }. The first Owner is created by hand in the
-- dashboard with no metadata, lands as a 'viewer', and is promoted with one SQL
-- statement — the only time a role is set outside the admin.
create function public.handle_new_auth_user() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  wanted_role public.staff_role;
  inviter uuid;
begin
  begin
    wanted_role := coalesce(nullif(meta ->> 'role', '')::public.staff_role, 'viewer');
  exception when invalid_text_representation then
    wanted_role := 'viewer';
  end;
  -- Never create an Owner from metadata; Owners are promoted deliberately.
  if wanted_role = 'owner' then
    wanted_role := 'viewer';
  end if;

  begin
    inviter := nullif(meta ->> 'invited_by', '')::uuid;
  exception when invalid_text_representation then
    inviter := null;
  end;
  if inviter is not null and not exists (select 1 from public.profiles where id = inviter) then
    inviter := null;
  end if;

  insert into public.profiles (id, email, full_name, role, invited_by)
  values (
    new.id,
    lower(new.email),
    coalesce(nullif(btrim(meta ->> 'full_name'), ''), split_part(lower(new.email), '@', 1)),
    wanted_role,
    inviter
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- ---------------------------------------------------------------- profile guard
-- Rules: only an Owner changes role / active status / name; nobody changes their
-- own role or deactivates themselves; there is always at least one active Owner.
create function public.guard_profile_update() returns trigger
language plpgsql set search_path = ''
as $$
declare
  actor uuid := public.actor_id();
begin
  if new.id <> old.id or new.email <> old.email or new.created_at <> old.created_at
     or new.invited_by is distinct from old.invited_by then
    if not public.is_trusted_session() then
      raise exception 'These staff details cannot be changed.' using errcode = 'AWC08';
    end if;
  end if;

  if new.role <> old.role or new.is_active <> old.is_active or new.full_name <> old.full_name then
    if not public.is_trusted_session() then
      if public.actor_role() is distinct from 'owner' then
        raise exception 'Only an Owner can change staff members.' using errcode = 'AWC01';
      end if;
      if actor = new.id and (new.role <> old.role or new.is_active <> old.is_active) then
        raise exception 'You cannot change your own role or deactivate yourself.' using errcode = 'AWC02';
      end if;
    end if;
  end if;

  -- Always enforced, even from the SQL editor.
  if old.role = 'owner' and old.is_active and not (new.role = 'owner' and new.is_active) then
    if not exists (
      select 1 from public.profiles
      where role = 'owner' and is_active and id <> old.id
    ) then
      raise exception 'There must always be at least one active Owner.' using errcode = 'AWC03';
    end if;
  end if;

  return new;
end;
$$;

create trigger guard_profile_update
  before update on public.profiles
  for each row execute function public.guard_profile_update();

create function public.guard_profile_delete() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if old.role = 'owner' and old.is_active and not exists (
    select 1 from public.profiles where role = 'owner' and is_active and id <> old.id
  ) then
    raise exception 'There must always be at least one active Owner.' using errcode = 'AWC03';
  end if;
  return old;
end;
$$;

create trigger guard_profile_delete
  before delete on public.profiles
  for each row execute function public.guard_profile_delete();

-- >>> migrations/20260918000200_activity_log.sql
-- ATL Work Cars — 0002: change history
--
-- Every change is recorded here by database triggers (0007), so history cannot be
-- skipped by forgetting a line of app code. Nobody can edit or delete history —
-- not even an Owner, not even from the SQL editor.

create table public.activity_log (
  id           bigint generated always as identity primary key,
  -- Deliberately no foreign key: history must survive the staff member's removal,
  -- and a FK "on delete set null" would need an UPDATE, which is forbidden.
  actor_id     uuid,
  actor_name   text,
  record_type  text not null check (record_type in ('application', 'contact', 'vehicle', 'staff')),
  record_id    uuid not null,
  action       text not null check (action ~ '^[a-z_]{2,40}$'),
  details      text,
  created_at   timestamptz not null default now()
);

create index activity_log_record_idx on public.activity_log (record_type, record_id, created_at desc);

comment on table public.activity_log is
  'Immutable change history. actor_id NULL = submitted from the public website.';

create function public.forbid_history_change() returns trigger
language plpgsql set search_path = ''
as $$
begin
  raise exception 'History cannot be edited or deleted.' using errcode = 'AWC05';
end;
$$;

create trigger activity_log_no_update
  before update or delete on public.activity_log
  for each row execute function public.forbid_history_change();

create trigger activity_log_no_truncate
  before truncate on public.activity_log
  for each statement execute function public.forbid_history_change();

-- Append one entry. SECURITY DEFINER so triggers can write history even though
-- no API role may insert into activity_log directly.
create function public.log_activity(
  p_record_type text,
  p_record_id   uuid,
  p_action      text,
  p_details     text default null
) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  a uuid := public.actor_id();
begin
  insert into public.activity_log (actor_id, actor_name, record_type, record_id, action, details)
  values (a, (select full_name from public.profiles where id = a), p_record_type, p_record_id, p_action, p_details);
end;
$$;

revoke all on function public.log_activity(text, uuid, text, text) from public;

-- >>> migrations/20260918000300_contacts.sql
-- ATL Work Cars — 0003: contacts (one row per person) and lead categories

create table public.contacts (
  id                uuid primary key default gen_random_uuid(),
  first_name        text not null check (length(btrim(first_name)) between 1 and 50),
  last_name         text not null check (length(btrim(last_name)) between 1 and 50),
  -- Exactly 10 digits with a valid US area code and exchange (same rule as the site).
  phone             text check (phone ~ '^[2-9][0-9]{2}[2-9][0-9]{6}$'),
  email             text check (email = lower(email) and length(email) <= 254
                                and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]{2,}$'),
  zip               text check (zip ~ '^[0-9]{5}$'),
  county            text check (county in (
                      'Gwinnett County', 'Fulton County', 'DeKalb County', 'Cobb County',
                      'Clayton County', 'Other Metro Atlanta county', 'Outside Metro Atlanta')),
  source            public.contact_source not null,
  original_message  text check (length(original_message) <= 2000),
  fit               public.rating,
  intent            public.rating,
  -- Computed by the database from fit and intent. Nobody writes it directly
  -- (writing a generated column is an error).
  lead_category     public.lead_category not null generated always as (
                      case
                        when fit is null or intent is null then 'unrated'::public.lead_category
                        when fit = 'high' and intent = 'high' then 'hot'::public.lead_category
                        when fit = 'high' and intent = 'low'  then 'warm'::public.lead_category
                        when fit = 'low'  and intent = 'high' then 'low_priority'::public.lead_category
                        else 'dead'::public.lead_category
                      end) stored,
  contacted         boolean not null default false,
  contacted_at      timestamptz,
  contacted_by      uuid references public.profiles (id) on delete set null,
  archived_at       timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint contacts_reachable check (phone is not null or email is not null),
  constraint contacts_contacted_consistent check (contacted = (contacted_at is not null)),
  constraint contacts_message_only_from_form check (original_message is null or source = 'contact_form')
);

create index contacts_phone_idx on public.contacts (phone) where phone is not null;
create index contacts_email_idx on public.contacts (email) where email is not null;
create index contacts_attention_idx on public.contacts (archived_at, contacted, lead_category, created_at desc);

-- Sort order for the "Needs attention" view: Hot, Unrated, Warm, Low-priority, Dead.
create function public.lead_category_rank(c public.lead_category) returns int
language sql immutable parallel safe set search_path = ''
as $$
  select case c when 'hot' then 1 when 'unrated' then 2 when 'warm' then 3
                when 'low_priority' then 4 else 5 end
$$;

-- Normalise, stamp contacted_*, protect write-once fields, bump updated_at.
create function public.contacts_before_write() returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.first_name := btrim(new.first_name);
  new.last_name  := btrim(new.last_name);
  new.phone      := public.normalize_phone(new.phone);
  new.email      := nullif(lower(btrim(new.email)), '');
  new.zip        := nullif(btrim(new.zip), '');

  if tg_op = 'INSERT' then
    if new.contacted then
      new.contacted_at := coalesce(new.contacted_at, now());
      new.contacted_by := public.actor_id();
    else
      new.contacted_at := null;
      new.contacted_by := null;
    end if;
    new.created_at := now();
    new.updated_at := now();
    return new;
  end if;

  if new.source <> old.source
     or new.original_message is distinct from old.original_message
     or new.created_at <> old.created_at then
    raise exception 'The source, original message and created date cannot be changed.' using errcode = 'AWC08';
  end if;

  -- Who/when is recorded by the database, not supplied by the client.
  if new.contacted and not old.contacted then
    new.contacted_at := now();
    new.contacted_by := public.actor_id();
  elsif not new.contacted and old.contacted then
    new.contacted_at := null;
    new.contacted_by := null;
  else
    new.contacted_at := old.contacted_at;
    new.contacted_by := old.contacted_by;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger contacts_before_write
  before insert or update on public.contacts
  for each row execute function public.contacts_before_write();

-- >>> migrations/20260918000400_vehicles.sql
-- ATL Work Cars — 0004: vehicles (replaces src/data/vehicles.ts)

create table public.vehicles (
  id                 uuid primary key default gen_random_uuid(),
  -- Stable public code used in links: /apply/?vehicle=awc-102. Never renumber.
  code               text not null unique check (code ~ '^[a-z0-9-]{1,40}$'),
  year               int not null check (year between 1990 and 2100),
  make               text not null check (length(btrim(make)) between 1 and 40),
  model              text not null check (length(btrim(model)) between 1 and 40),
  trim               text check (length(btrim(trim)) between 1 and 40),
  body_type          text not null check (body_type in ('sedan', 'compact', 'hatchback', 'hybrid', 'suv', 'minivan')),
  -- Whole US dollars. NULL renders "Contact us for pricing" — never an invented number.
  weekly_rate        int check (weekly_rate between 0 and 100000),
  deposit            int check (deposit between 0 and 100000),
  mileage_policy     text check (length(mileage_policy) <= 200),
  odometer           int check (odometer between 0 and 2000000),
  seats              int not null check (seats between 1 and 15),
  fuel_economy       numeric(5, 1) check (fuel_economy > 0 and fuel_economy < 1000),
  -- Plain vehicle facts only (age, doors, seats). Never a platform promise.
  rideshare_note     text check (length(rideshare_note) <= 300),
  pickup_location    text check (length(pickup_location) <= 120),
  photo_path         text check (length(photo_path) <= 300),
  photo_alt          text check (length(photo_alt) <= 300),
  status             public.vehicle_status not null default 'available',
  renter_contact_id  uuid references public.contacts (id) on delete restrict,
  rented_since       date,
  is_featured        boolean not null default false,
  is_published       boolean not null default false,
  is_sample          boolean not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  -- A rented car has a renter and a start date; every other car has neither.
  -- (Setting a renter on a car that is not rented RAISES — it is never silently dropped.)
  constraint vehicles_renter_matches_status check (
    (status = 'rented' and renter_contact_id is not null and rented_since is not null)
    or (status <> 'rented' and renter_contact_id is null and rented_since is null)
  ),
  constraint vehicles_photo_needs_alt check (photo_path is null or coalesce(length(btrim(photo_alt)), 0) > 0)
);

create index vehicles_renter_idx on public.vehicles (renter_contact_id) where renter_contact_id is not null;

create function public.vehicles_before_write() returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.make  := btrim(new.make);
  new.model := btrim(new.model);
  new.trim  := nullif(btrim(new.trim), '');
  if tg_op = 'INSERT' then
    new.created_at := now();
  elsif new.created_at <> old.created_at or new.code <> old.code then
    raise exception 'A car''s code and created date cannot be changed.' using errcode = 'AWC08';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger vehicles_before_write
  before insert or update on public.vehicles
  for each row execute function public.vehicles_before_write();

create function public.vehicles_before_delete() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if old.status = 'rented' then
    raise exception 'This car is rented. Change the car''s status first.' using errcode = 'AWC06';
  end if;
  return old;
end;
$$;

create trigger vehicles_before_delete
  before delete on public.vehicles
  for each row execute function public.vehicles_before_delete();

-- A contact who is renting a car cannot be deleted.
create function public.contacts_before_delete() returns trigger
language plpgsql set search_path = ''
as $$
declare
  car text;
begin
  select concat_ws(' ', v.year, v.make, v.model, v.trim) into car
  from public.vehicles v where v.renter_contact_id = old.id
  limit 1;
  if car is not null then
    raise exception 'Remove them as the renter of % first.', car using errcode = 'AWC07';
  end if;
  return old;
end;
$$;

create trigger contacts_before_delete
  before delete on public.contacts
  for each row execute function public.contacts_before_delete();

-- What the public website may see: published cars, public columns only. Never the
-- renter, notes, history or anything internal. Read by the server with the secret key.
create view public.public_vehicles with (security_invoker = true) as
  select code, year, make, model, trim, body_type, weekly_rate, deposit, mileage_policy,
         odometer, seats, fuel_economy, rideshare_note, pickup_location, photo_path,
         photo_alt, status, is_featured, is_sample
  from public.vehicles
  where is_published;

-- >>> migrations/20260918000500_applications.sql
-- ATL Work Cars — 0005: applications (a record of what was submitted)

-- The ONE reference alphabet (no 0/O/1/I) — identical to src/lib/leads/reference-id.ts.
create function public.reference_alphabet() returns text
language sql immutable parallel safe set search_path = ''
as $$ select '23456789ABCDEFGHJKLMNPQRSTUVWXYZ' $$;

-- Fallback only: the website server generates the reference. Same format and alphabet.
create function public.generate_reference() returns text
language plpgsql volatile set search_path = ''
as $$
declare
  a text := public.reference_alphabet();
  s text := '';
begin
  for i in 1..5 loop
    s := s || substr(a, 1 + floor(random() * 32)::int, 1);
  end loop;
  return 'AWC-' || to_char(now() at time zone 'America/New_York', 'YYYYMMDD') || '-' || s;
end;
$$;

create table public.applications (
  id                      uuid primary key default gen_random_uuid(),
  reference               text not null unique default public.generate_reference()
                            check (reference ~ '^AWC-[0-9]{8}-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{5}$'),
  submitted_at            timestamptz not null default now(),

  -- The answers, exactly as submitted. Never editable (see guard below).
  first_name              text not null check (length(btrim(first_name)) between 1 and 50),
  last_name               text not null check (length(btrim(last_name)) between 1 and 50),
  phone                   text not null check (phone ~ '^[2-9][0-9]{2}[2-9][0-9]{6}$'),
  email                   text not null check (email = lower(email) and length(email) <= 254
                                              and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]{2,}$'),
  zip                     text not null check (zip ~ '^[0-9]{5}$'),
  county                  text not null check (county in (
                            'Gwinnett County', 'Fulton County', 'DeKalb County', 'Cobb County',
                            'Clayton County', 'Other Metro Atlanta county', 'Outside Metro Atlanta')),
  primary_use             text not null check (primary_use in (
                            'Rideshare', 'Food Delivery', 'Grocery Delivery', 'Courier',
                            'Package Delivery', 'Multiple Apps', 'Other')),
  platforms               text check (length(platforms) <= 200),
  platform_status         text not null check (platform_status in (
                            'Yes, currently active', 'Yes, but not active right now', 'No, not signed up yet')),
  urgency                 text not null check (urgency in ('Today', 'Within 3 days', 'Within 1 week', 'Just researching')),
  -- A plain number — never a date of birth. 16–100 is an input sanity check, NOT an eligibility rule.
  age                     int not null check (age between 16 and 100),
  has_license             boolean not null,
  license_state           text check (length(license_state) <= 40),
  has_vehicle             boolean not null,
  preferred_vehicle_type  text check (length(preferred_vehicle_type) <= 40),
  pickup_area             text check (length(pickup_area) <= 60),
  consent                 boolean not null check (consent),
  -- The applicant's "Additional notes" — named so it is never confused with staff notes.
  applicant_notes         text check (length(applicant_notes) <= 1000),

  vehicle_id              uuid references public.vehicles (id) on delete set null,
  -- The car's name when they applied, so the record still makes sense if the car changes.
  vehicle_label           text check (length(vehicle_label) <= 120),

  -- Staff workflow (editable by Owner/Sales).
  contact_id              uuid references public.contacts (id) on delete set null,
  contacted               boolean not null default false,
  contacted_at            timestamptz,
  contacted_by            uuid references public.profiles (id) on delete set null,
  archived_at             timestamptz,

  constraint applications_license_state check (
    (has_license and license_state is not null) or (not has_license and license_state is null)
  ),
  constraint applications_contacted_consistent check (contacted = (contacted_at is not null))
);

create index applications_list_idx on public.applications (archived_at, submitted_at desc);
create index applications_contact_idx on public.applications (contact_id) where contact_id is not null;
create index applications_phone_idx on public.applications (phone);
create index applications_email_idx on public.applications (email);

create function public.applications_before_write() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.first_name := btrim(new.first_name);
    new.last_name  := btrim(new.last_name);
    new.phone      := public.normalize_phone(new.phone);
    new.email      := lower(btrim(new.email));
    if new.vehicle_id is not null and new.vehicle_label is null then
      select concat_ws(' ', v.year, v.make, v.model, v.trim) into new.vehicle_label
      from public.vehicles v where v.id = new.vehicle_id;
    end if;
    if new.contacted then
      new.contacted_at := coalesce(new.contacted_at, now());
      new.contacted_by := public.actor_id();
    else
      new.contacted_at := null;
      new.contacted_by := null;
    end if;
    return new;
  end if;

  -- Answers are a record of what was submitted and can never be edited.
  -- (vehicle_id may become NULL only through "on delete set null" when the car is deleted.)
  if (new.reference, new.submitted_at, new.first_name, new.last_name, new.phone, new.email,
      new.zip, new.county, new.primary_use, new.platforms, new.platform_status, new.urgency,
      new.age, new.has_license, new.license_state, new.has_vehicle, new.preferred_vehicle_type,
      new.pickup_area, new.consent, new.applicant_notes, new.vehicle_label)
     is distinct from
     (old.reference, old.submitted_at, old.first_name, old.last_name, old.phone, old.email,
      old.zip, old.county, old.primary_use, old.platforms, old.platform_status, old.urgency,
      old.age, old.has_license, old.license_state, old.has_vehicle, old.preferred_vehicle_type,
      old.pickup_area, old.consent, old.applicant_notes, old.vehicle_label)
     or (new.vehicle_id is distinct from old.vehicle_id and new.vehicle_id is not null)
  then
    raise exception 'Application answers cannot be edited. Update the linked contact instead.'
      using errcode = 'AWC04';
  end if;

  if new.contacted and not old.contacted then
    new.contacted_at := now();
    new.contacted_by := public.actor_id();
  elsif not new.contacted and old.contacted then
    new.contacted_at := null;
    new.contacted_by := null;
  else
    new.contacted_at := old.contacted_at;
    new.contacted_by := old.contacted_by;
  end if;
  return new;
end;
$$;

create trigger applications_before_write
  before insert or update on public.applications
  for each row execute function public.applications_before_write();

-- >>> migrations/20260918000600_notes.sql
-- ATL Work Cars — 0006: staff notes on an application, a contact, or a car

create table public.notes (
  id              uuid primary key default gen_random_uuid(),
  application_id  uuid references public.applications (id) on delete cascade,
  contact_id      uuid references public.contacts (id) on delete cascade,
  vehicle_id      uuid references public.vehicles (id) on delete cascade,
  body            text not null check (length(btrim(body)) between 1 and 5000),
  author_id       uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  -- A note belongs to exactly one record.
  constraint notes_exactly_one_parent check (num_nonnulls(application_id, contact_id, vehicle_id) = 1)
);

create index notes_application_idx on public.notes (application_id, created_at desc) where application_id is not null;
create index notes_contact_idx on public.notes (contact_id, created_at desc) where contact_id is not null;
create index notes_vehicle_idx on public.notes (vehicle_id, created_at desc) where vehicle_id is not null;

create function public.notes_before_write() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    raise exception 'Notes cannot be edited.' using errcode = 'AWC09';
  end if;
  new.body := btrim(new.body);
  new.author_id := public.actor_id();   -- recorded by the database, not the client
  new.created_at := now();
  return new;
end;
$$;

create trigger notes_before_write
  before insert or update on public.notes
  for each row execute function public.notes_before_write();

-- >>> migrations/20260918000700_history_triggers.sql
-- ATL Work Cars — 0007: record every change in activity_log
--
-- Covers: application/contact submitted from the website; contact created; contact
-- details edited (old → new); fit or intent changed; marked contacted / not
-- contacted; archived; restored; note added; application linked to a contact;
-- contact created from an application; car added or edited; status changed;
-- renter assigned or removed; shown/hidden on the website; staff invited; role
-- changed; staff deactivated / reactivated; anything deleted.
--
-- Delete entries record the kind of record and a short name ("Contact deleted:
-- Jane D."), never all of the person's details.

create function public.short_name(first text, last text) returns text
language sql immutable parallel safe set search_path = ''
as $$ select btrim(first) || coalesce(' ' || left(btrim(last), 1) || '.', '') $$;

create function public.change_line(label text, old_v text, new_v text) returns text
language sql immutable parallel safe set search_path = ''
as $$ select label || ': ' || coalesce(nullif(old_v, ''), '(empty)') || ' → ' || coalesce(nullif(new_v, ''), '(empty)') $$;

-- ------------------------------------------------------------ applications
create function public.history_applications() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  c record;
begin
  if tg_op = 'INSERT' then
    perform public.log_activity('application', new.id,
      case when public.actor_id() is null then 'submitted' else 'created' end,
      'Reference ' || new.reference || coalesce('; car: ' || new.vehicle_label, ''));
    return new;
  elsif tg_op = 'DELETE' then
    perform public.log_activity('application', old.id, 'deleted',
      'Application deleted: ' || public.short_name(old.first_name, old.last_name) || ' (' || old.reference || ')');
    return old;
  end if;

  if new.contacted <> old.contacted then
    perform public.log_activity('application', new.id,
      case when new.contacted then 'contacted' else 'not_contacted' end);
  end if;
  if new.archived_at is distinct from old.archived_at then
    perform public.log_activity('application', new.id,
      case when new.archived_at is null then 'restored' else 'archived' end);
  end if;
  if new.contact_id is distinct from old.contact_id then
    if new.contact_id is null then
      perform public.log_activity('application', new.id, 'unlinked_contact');
    else
      select first_name, last_name into c from public.contacts where id = new.contact_id;
      perform public.log_activity('application', new.id, 'linked_contact',
        'Linked to ' || public.short_name(c.first_name, c.last_name));
      perform public.log_activity('contact', new.contact_id, 'linked_application',
        'Application ' || new.reference);
    end if;
  end if;
  if new.vehicle_id is null and old.vehicle_id is not null then
    perform public.log_activity('application', new.id, 'vehicle_removed',
      'The car applied for was deleted' || coalesce(' (' || old.vehicle_label || ')', ''));
  end if;
  return new;
end;
$$;

create trigger history_applications
  after insert or update or delete on public.applications
  for each row execute function public.history_applications();

-- ------------------------------------------------------------ contacts
create function public.history_contacts() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  changes text[] := '{}';
begin
  if tg_op = 'INSERT' then
    perform public.log_activity('contact', new.id,
      case
        when public.actor_id() is null then 'submitted'
        when new.source = 'application' then 'created_from_application'
        else 'created'
      end,
      'Source: ' || replace(new.source::text, '_', ' '));
    return new;
  elsif tg_op = 'DELETE' then
    perform public.log_activity('contact', old.id, 'deleted',
      'Contact deleted: ' || public.short_name(old.first_name, old.last_name));
    return old;
  end if;

  if new.first_name <> old.first_name then changes := changes || public.change_line('first name', old.first_name, new.first_name); end if;
  if new.last_name  <> old.last_name  then changes := changes || public.change_line('last name', old.last_name, new.last_name); end if;
  if new.phone is distinct from old.phone then changes := changes || public.change_line('phone', public.format_phone(old.phone), public.format_phone(new.phone)); end if;
  if new.email is distinct from old.email then changes := changes || public.change_line('email', old.email, new.email); end if;
  if new.zip is distinct from old.zip then changes := changes || public.change_line('ZIP', old.zip, new.zip); end if;
  if new.county is distinct from old.county then changes := changes || public.change_line('county', old.county, new.county); end if;
  if array_length(changes, 1) > 0 then
    perform public.log_activity('contact', new.id, 'details_edited', array_to_string(changes, '; '));
  end if;

  if new.fit is distinct from old.fit or new.intent is distinct from old.intent then
    perform public.log_activity('contact', new.id, 'rating_changed',
      concat_ws('; ',
        case when new.fit is distinct from old.fit then public.change_line('fit', old.fit::text, new.fit::text) end,
        case when new.intent is distinct from old.intent then public.change_line('intent', old.intent::text, new.intent::text) end,
        public.change_line('category', replace(old.lead_category::text, '_', '-'), replace(new.lead_category::text, '_', '-'))));
  end if;
  if new.contacted <> old.contacted then
    perform public.log_activity('contact', new.id,
      case when new.contacted then 'contacted' else 'not_contacted' end);
  end if;
  if new.archived_at is distinct from old.archived_at then
    perform public.log_activity('contact', new.id,
      case when new.archived_at is null then 'restored' else 'archived' end);
  end if;
  return new;
end;
$$;

create trigger history_contacts
  after insert or update or delete on public.contacts
  for each row execute function public.history_contacts();

-- ------------------------------------------------------------ vehicles
create function public.history_vehicles() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  label text;
  edited text[] := '{}';
  r record;
begin
  if tg_op = 'DELETE' then
    perform public.log_activity('vehicle', old.id, 'deleted',
      'Car deleted: ' || old.code || ' (' || concat_ws(' ', old.year, old.make, old.model, old.trim) || ')');
    return old;
  end if;

  label := concat_ws(' ', new.year, new.make, new.model, new.trim);
  if tg_op = 'INSERT' then
    perform public.log_activity('vehicle', new.id, 'added', new.code || ' — ' || label);
    return new;
  end if;

  if new.status <> old.status then
    perform public.log_activity('vehicle', new.id, 'status_changed',
      public.change_line('status', replace(old.status::text, '_', ' '), replace(new.status::text, '_', ' ')));
  end if;
  if new.renter_contact_id is distinct from old.renter_contact_id then
    if old.renter_contact_id is not null then
      select first_name, last_name into r from public.contacts where id = old.renter_contact_id;
      perform public.log_activity('vehicle', new.id, 'renter_removed',
        'Renter removed: ' || coalesce(public.short_name(r.first_name, r.last_name), 'contact'));
      perform public.log_activity('contact', old.renter_contact_id, 'renter_removed', 'No longer renting ' || label);
    end if;
    if new.renter_contact_id is not null then
      select first_name, last_name into r from public.contacts where id = new.renter_contact_id;
      perform public.log_activity('vehicle', new.id, 'renter_assigned',
        'Renter: ' || public.short_name(r.first_name, r.last_name) || coalesce(' since ' || new.rented_since::text, ''));
      perform public.log_activity('contact', new.renter_contact_id, 'renter_assigned', 'Now renting ' || label);
    end if;
  end if;
  if new.is_published <> old.is_published then
    perform public.log_activity('vehicle', new.id, case when new.is_published then 'shown_on_website' else 'hidden_from_website' end);
  end if;

  if new.year <> old.year then edited := edited || public.change_line('year', old.year::text, new.year::text); end if;
  if new.make <> old.make then edited := edited || public.change_line('make', old.make, new.make); end if;
  if new.model <> old.model then edited := edited || public.change_line('model', old.model, new.model); end if;
  if new.trim is distinct from old.trim then edited := edited || public.change_line('trim', old.trim, new.trim); end if;
  if new.body_type <> old.body_type then edited := edited || public.change_line('body type', old.body_type, new.body_type); end if;
  if new.weekly_rate is distinct from old.weekly_rate then edited := edited || public.change_line('weekly rate', old.weekly_rate::text, new.weekly_rate::text); end if;
  if new.deposit is distinct from old.deposit then edited := edited || public.change_line('deposit', old.deposit::text, new.deposit::text); end if;
  if new.mileage_policy is distinct from old.mileage_policy then edited := edited || public.change_line('mileage policy', old.mileage_policy, new.mileage_policy); end if;
  if new.odometer is distinct from old.odometer then edited := edited || public.change_line('odometer', old.odometer::text, new.odometer::text); end if;
  if new.seats <> old.seats then edited := edited || public.change_line('seats', old.seats::text, new.seats::text); end if;
  if new.fuel_economy is distinct from old.fuel_economy then edited := edited || public.change_line('fuel economy', old.fuel_economy::text, new.fuel_economy::text); end if;
  if new.rideshare_note is distinct from old.rideshare_note then edited := edited || 'vehicle note updated'; end if;
  if new.pickup_location is distinct from old.pickup_location then edited := edited || public.change_line('pickup', old.pickup_location, new.pickup_location); end if;
  if new.photo_path is distinct from old.photo_path then edited := edited || 'photo changed'; end if;
  if new.photo_alt is distinct from old.photo_alt then edited := edited || 'photo description changed'; end if;
  if new.is_featured <> old.is_featured then edited := edited || public.change_line('featured', old.is_featured::text, new.is_featured::text); end if;
  if new.is_sample <> old.is_sample then edited := edited || public.change_line('sample listing', old.is_sample::text, new.is_sample::text); end if;
  if array_length(edited, 1) > 0 then
    perform public.log_activity('vehicle', new.id, 'edited', array_to_string(edited, '; '));
  end if;
  return new;
end;
$$;

create trigger history_vehicles
  after insert or update or delete on public.vehicles
  for each row execute function public.history_vehicles();

-- ------------------------------------------------------------ notes
create function public.history_notes() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  rt text;
  rid uuid;
begin
  if tg_op = 'INSERT' then
    rt := case when new.application_id is not null then 'application'
               when new.contact_id is not null then 'contact' else 'vehicle' end;
    rid := coalesce(new.application_id, new.contact_id, new.vehicle_id);
    perform public.log_activity(rt, rid, 'note_added', left(new.body, 120));
    return new;
  end if;

  -- DELETE: skip when the parent itself is being deleted (cascade) — that delete is logged.
  rt := case when old.application_id is not null then 'application'
             when old.contact_id is not null then 'contact' else 'vehicle' end;
  rid := coalesce(old.application_id, old.contact_id, old.vehicle_id);
  if (rt = 'application' and exists (select 1 from public.applications where id = rid))
     or (rt = 'contact' and exists (select 1 from public.contacts where id = rid))
     or (rt = 'vehicle' and exists (select 1 from public.vehicles where id = rid)) then
    perform public.log_activity(rt, rid, 'note_deleted');
  end if;
  return old;
end;
$$;

create trigger history_notes
  after insert or delete on public.notes
  for each row execute function public.history_notes();

-- ------------------------------------------------------------ staff
create function public.history_profiles() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform public.log_activity('staff', new.id, 'staff_invited',
      new.full_name || ' <' || new.email || '> as ' || replace(new.role::text, '_', ' '));
    return new;
  elsif tg_op = 'DELETE' then
    perform public.log_activity('staff', old.id, 'deleted', 'Staff removed: ' || old.full_name);
    return old;
  end if;
  if new.role <> old.role then
    perform public.log_activity('staff', new.id, 'role_changed',
      public.change_line('role', replace(old.role::text, '_', ' '), replace(new.role::text, '_', ' ')));
  end if;
  if new.is_active <> old.is_active then
    perform public.log_activity('staff', new.id, case when new.is_active then 'reactivated' else 'deactivated' end);
  end if;
  if new.full_name <> old.full_name then
    perform public.log_activity('staff', new.id, 'details_edited', public.change_line('name', old.full_name, new.full_name));
  end if;
  return new;
end;
$$;

create trigger history_profiles
  after insert or update or delete on public.profiles
  for each row execute function public.history_profiles();

-- >>> migrations/20260918000800_row_level_security.sql
-- ATL Work Cars — 0008: permissions. The DATABASE enforces every permission;
-- hiding a button in the admin is only a convenience.
--
-- Matrix (O = Owner, S = Sales, F = Fleet Manager, V = Viewer):
--   applications  view OSFV · update (notes/contacted/archive/link) OS · delete O
--   contacts      view OSFV · insert/update OS · delete O
--   vehicles      view OSFV · insert/update OF · delete O
--   notes         view OSFV · add: application OS, contact OSF, vehicle OF · delete O · never edited
--   activity_log  view OSFV · nobody writes directly, nobody edits or deletes
--   profiles      view OSFV (names for "contacted by", note authors) · update O
-- Logged-out visitors (anon) have NO access to any table.
-- The server's secret key (service_role) bypasses RLS and is used for exactly:
-- saving public form submissions, reading public_vehicles, and staff invites /
-- deactivation after confirming the requester is an active Owner.

alter table public.profiles     enable row level security;
alter table public.contacts     enable row level security;
alter table public.applications enable row level security;
alter table public.vehicles     enable row level security;
alter table public.notes        enable row level security;
alter table public.activity_log enable row level security;

-- Belt and braces: anon gets nothing, whatever the project's default grants are.
revoke all on public.profiles, public.contacts, public.applications, public.vehicles,
              public.notes, public.activity_log, public.public_vehicles from anon;
revoke all on public.public_vehicles from authenticated;

grant select, insert, update, delete on public.contacts, public.applications, public.vehicles to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, delete on public.notes to authenticated;
grant select on public.activity_log to authenticated;
revoke insert, update, delete, truncate on public.activity_log from authenticated;
revoke insert, delete, truncate on public.profiles from authenticated;
revoke update, truncate on public.notes from authenticated;

grant all on public.profiles, public.contacts, public.applications, public.vehicles,
             public.notes to service_role;
grant select on public.activity_log, public.public_vehicles to service_role;
revoke insert, update, delete, truncate on public.activity_log from service_role;

-- ------------------------------------------------------------ profiles
create policy profiles_select on public.profiles
  for select to authenticated using (public.is_staff());
create policy profiles_update on public.profiles
  for update to authenticated
  using (public.has_role('owner')) with check (public.has_role('owner'));

-- ------------------------------------------------------------ contacts
create policy contacts_select on public.contacts
  for select to authenticated using (public.is_staff());
create policy contacts_insert on public.contacts
  for insert to authenticated with check (public.has_role('owner', 'sales'));
create policy contacts_update on public.contacts
  for update to authenticated
  using (public.has_role('owner', 'sales')) with check (public.has_role('owner', 'sales'));
create policy contacts_delete on public.contacts
  for delete to authenticated using (public.has_role('owner'));

-- ------------------------------------------------------------ applications
-- No insert policy: applications only arrive from the public form (secret key).
create policy applications_select on public.applications
  for select to authenticated using (public.is_staff());
create policy applications_update on public.applications
  for update to authenticated
  using (public.has_role('owner', 'sales')) with check (public.has_role('owner', 'sales'));
create policy applications_delete on public.applications
  for delete to authenticated using (public.has_role('owner'));

-- ------------------------------------------------------------ vehicles
create policy vehicles_select on public.vehicles
  for select to authenticated using (public.is_staff());
create policy vehicles_insert on public.vehicles
  for insert to authenticated with check (public.has_role('owner', 'fleet_manager'));
create policy vehicles_update on public.vehicles
  for update to authenticated
  using (public.has_role('owner', 'fleet_manager')) with check (public.has_role('owner', 'fleet_manager'));
create policy vehicles_delete on public.vehicles
  for delete to authenticated using (public.has_role('owner'));

-- ------------------------------------------------------------ notes
create policy notes_select on public.notes
  for select to authenticated using (public.is_staff());
create policy notes_insert on public.notes
  for insert to authenticated with check (
    (application_id is not null and public.has_role('owner', 'sales'))
    or (contact_id is not null and public.has_role('owner', 'sales', 'fleet_manager'))
    or (vehicle_id is not null and public.has_role('owner', 'fleet_manager'))
  );
create policy notes_delete on public.notes
  for delete to authenticated using (public.has_role('owner'));

-- ------------------------------------------------------------ activity_log
create policy activity_log_select on public.activity_log
  for select to authenticated using (public.is_staff());

-- ------------------------------------------------------------ functions
-- Internal helpers are not callable through the API.
revoke execute on function public.log_activity(text, uuid, text, text) from anon, authenticated, service_role;
revoke execute on function public.handle_new_auth_user() from anon, authenticated, service_role;

-- >>> migrations/20260918000900_admin_rpcs.sql
-- ATL Work Cars — 0009: server-only staff functions and the staff directory
--
-- Staff invites and deactivation need the Supabase admin API (secret key). The
-- server confirms the requester is an active Owner, then calls these functions
-- with the requester's id so the guards and history still name the right person.

-- Deactivate / reactivate a staff member. Service role only.
create function public.admin_set_staff_active(p_actor uuid, p_target uuid, p_active boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not exists (select 1 from public.profiles where id = p_actor and role = 'owner' and is_active) then
    raise exception 'Only an active Owner can do this.' using errcode = 'AWC01';
  end if;
  -- This function runs as a trusted role, so the profile guard's own-account rule
  -- would not fire; enforce it here explicitly. (The last-Owner rule always fires.)
  if p_actor = p_target then
    raise exception 'You cannot change your own role or deactivate yourself.' using errcode = 'AWC02';
  end if;
  perform set_config('app.actor_id', p_actor::text, true);
  update public.profiles set is_active = p_active where id = p_target;
  if not found then
    raise exception 'Staff member not found.' using errcode = 'AWC10';
  end if;
end;
$$;

revoke execute on function public.admin_set_staff_active(uuid, uuid, boolean) from public, anon, authenticated;
grant execute on function public.admin_set_staff_active(uuid, uuid, boolean) to service_role;

-- Everyone with admin access, for the Staff page. Owner only (checked here, so a
-- non-Owner calling it directly gets nothing). Includes last sign-in from auth.users.
create function public.staff_directory()
returns table (
  id uuid, email text, full_name text, role public.staff_role, is_active boolean,
  invited_by uuid, invited_at timestamptz, last_sign_in_at timestamptz
)
language sql stable security definer set search_path = ''
as $$
  select p.id, p.email, p.full_name, p.role, p.is_active, p.invited_by, p.created_at, u.last_sign_in_at
  from public.profiles p
  join auth.users u on u.id = p.id
  where public.has_role('owner')
  order by p.is_active desc, p.full_name
$$;

revoke execute on function public.staff_directory() from public, anon;
grant execute on function public.staff_directory() to authenticated;

-- >>> migrations/20260918001000_storage.sql
-- ATL Work Cars — 0010: car photo storage
-- Bucket "vehicle-photos": anyone can view (the public site shows the photos);
-- only Owners and Fleet Managers can upload, replace or delete. Max 500 KB.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vehicle-photos', 'vehicle-photos', true, 512000, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy vehicle_photos_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'vehicle-photos' and public.has_role('owner', 'fleet_manager'));

create policy vehicle_photos_update on storage.objects
  for update to authenticated
  using (bucket_id = 'vehicle-photos' and public.has_role('owner', 'fleet_manager'))
  with check (bucket_id = 'vehicle-photos' and public.has_role('owner', 'fleet_manager'));

create policy vehicle_photos_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'vehicle-photos' and public.has_role('owner', 'fleet_manager'));

-- >>> migrations/20260918001100_seed_sample_vehicles.sql
-- ATL Work Cars — 0011: load the six sample cars from the old src/data/vehicles.ts
-- Codes awc-101 … awc-106 are kept so shared links keep working. All are sample
-- listings: the site shows only the "Sample listing" badge, no odometer or MPG.
-- Prices, odometer and fuel economy stay NULL — never invented.
-- Old availability → new status: available/limited/reserved/rented → available
-- (a car cannot be "rented" without a real renter); maintenance → in_repair.

insert into public.vehicles
  (code, year, make, model, trim, body_type, seats, rideshare_note, status, is_featured, is_published, is_sample)
values
  ('awc-101', 2020, 'Toyota', 'Camry',         'LE', 'sedan',     5, '4 doors, seats 5, model year 2020.', 'available', true,  true, true),
  ('awc-102', 2021, 'Toyota', 'Prius',         null, 'hybrid',    5, '4 doors, seats 5, model year 2021.', 'available', true,  true, true),
  ('awc-103', 2019, 'Nissan', 'Sentra',        'S',  'compact',   5, '4 doors, seats 5, model year 2019.', 'available', true,  true, true),
  ('awc-104', 2019, 'Honda',  'Fit',           null, 'hatchback', 5, '4 doors, seats 5, model year 2019.', 'available', false, true, true),
  ('awc-105', 2020, 'Toyota', 'RAV4',          'LE', 'suv',       5, '4 doors, seats 5, model year 2020.', 'available', false, true, true),
  ('awc-106', 2018, 'Dodge',  'Grand Caravan', 'SE', 'minivan',   7, '4 doors plus sliding rear doors, seats 7, model year 2018.', 'in_repair', false, true, true)
on conflict (code) do nothing;
