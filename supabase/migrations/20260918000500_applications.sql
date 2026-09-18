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
