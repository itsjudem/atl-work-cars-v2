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
