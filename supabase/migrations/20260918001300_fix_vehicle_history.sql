-- ATL Work Cars — 0013: fix car history for photo and vehicle-facts changes
-- In 0007, appending a plain string literal to the text[] of edits made Postgres read
-- it as an array literal ("malformed array literal"), so uploading, replacing or
-- removing a photo, editing its description, or editing the vehicle facts failed.
-- Same function, with those three strings cast to text. Safe to run more than once.

create or replace function public.history_vehicles() returns trigger
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
  if new.rideshare_note is distinct from old.rideshare_note then edited := edited || 'vehicle note updated'::text; end if;
  if new.pickup_location is distinct from old.pickup_location then edited := edited || public.change_line('pickup', old.pickup_location, new.pickup_location); end if;
  if new.photo_path is distinct from old.photo_path then edited := edited || 'photo changed'::text; end if;
  if new.photo_alt is distinct from old.photo_alt then edited := edited || 'photo description changed'::text; end if;
  if new.is_featured <> old.is_featured then edited := edited || public.change_line('featured', old.is_featured::text, new.is_featured::text); end if;
  if new.is_sample <> old.is_sample then edited := edited || public.change_line('sample listing', old.is_sample::text, new.is_sample::text); end if;
  if array_length(edited, 1) > 0 then
    perform public.log_activity('vehicle', new.id, 'edited', array_to_string(edited, '; '));
  end if;
  return new;
end;
$$;
