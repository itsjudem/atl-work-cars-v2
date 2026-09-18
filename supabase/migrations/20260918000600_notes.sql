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
