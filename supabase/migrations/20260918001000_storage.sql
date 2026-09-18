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
