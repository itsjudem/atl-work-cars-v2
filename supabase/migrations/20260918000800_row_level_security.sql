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
