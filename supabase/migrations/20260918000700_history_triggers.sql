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
