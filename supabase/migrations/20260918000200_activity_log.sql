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
