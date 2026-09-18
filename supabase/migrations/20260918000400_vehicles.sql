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
