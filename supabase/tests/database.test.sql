-- ATL Work Cars — database tests. Run against a THROWAWAY database only.
-- Every check prints "PASS: …" or "FAIL: …". Run with psql; see supabase/tests/README.md.
--
-- Acting as a user switches the SESSION role (not "set local", which would revert
-- between statements and silently test as the table owner) and sets the JWT claims
-- that auth.uid() reads. test.reset() clears BOTH, so auth.uid() never lingers.

\set QUIET on
set client_min_messages = notice;

create schema test;
grant usage on schema test to anon, authenticated, service_role;

create function test.ok(cond boolean, label text) returns void language plpgsql as $$
begin
  if coalesce(cond, false) then raise notice 'PASS: %', label;
  else raise warning 'FAIL: %', label; end if;
end $$;

-- The statement must fail with the given SQLSTATE (or any error when NULL).
create function test.throws(stmt text, state text, label text) returns void language plpgsql as $$
begin
  execute stmt;
  raise warning 'FAIL: % (no error raised)', label;
exception when others then
  if state is null or sqlstate = state then raise notice 'PASS: %', label;
  else raise warning 'FAIL: % (got % %)', label, sqlstate, sqlerrm; end if;
end $$;

-- The statement must succeed and affect exactly n rows.
create function test.rows(stmt text, n int, label text) returns void language plpgsql as $$
declare c int;
begin
  execute stmt;
  get diagnostics c = row_count;
  if c = n then raise notice 'PASS: %', label;
  else raise warning 'FAIL: % (affected % rows, expected %)', label, c, n; end if;
exception when others then
  raise warning 'FAIL: % (error % %)', label, sqlstate, sqlerrm;
end $$;

create function test.count(q text) returns bigint language plpgsql as $$
declare c bigint;
begin
  execute 'select count(*) from (' || q || ') s' into c;
  return c;
end $$;

grant execute on all functions in schema test to anon, authenticated, service_role;

-- Fixed staff ids
create function test.id(name text) returns uuid language sql immutable as $$
  select case name
    when 'owner'  then '00000000-0000-0000-0000-00000000000a'::uuid
    when 'owner2' then '00000000-0000-0000-0000-00000000000b'::uuid
    when 'sales'  then '00000000-0000-0000-0000-00000000000c'::uuid
    when 'fleet'  then '00000000-0000-0000-0000-00000000000d'::uuid
    when 'viewer' then '00000000-0000-0000-0000-00000000000e'::uuid
    when 'gone'   then '00000000-0000-0000-0000-00000000000f'::uuid
  end
$$;
grant execute on function test.id(text) to anon, authenticated, service_role;

create function test.act_as(name text) returns void language plpgsql as $$
begin
  perform set_config('role', 'none', false);
  if name = 'anon' then
    perform set_config('request.jwt.claims', '{"role":"anon"}', false);
    perform set_config('role', 'anon', false);
  elsif name = 'service' then
    perform set_config('request.jwt.claims', '{"role":"service_role"}', false);
    perform set_config('role', 'service_role', false);
  else
    perform set_config('request.jwt.claims', json_build_object('sub', test.id(name), 'role', 'authenticated')::text, false);
    perform set_config('role', 'authenticated', false);
  end if;
end $$;

create function test.reset() returns void language plpgsql as $$
begin
  perform set_config('role', 'none', false);
  perform set_config('request.jwt.claims', '', false);
  perform set_config('app.actor_id', '', false);
end $$;
grant execute on function test.act_as(text), test.reset() to anon, authenticated, service_role;

-- =================================================================== setup (as postgres)
\echo '--- staff setup'
insert into auth.users (id, email, raw_user_meta_data) values
  (test.id('owner'),  'Malasadojude@Gmail.com', null),                                   -- first Owner, by hand
  (test.id('owner2'), 'o2@example.com',     '{"full_name":"Olive Two","role":"owner"}'),  -- metadata may not create an Owner
  (test.id('sales'),  's@example.com',      '{"full_name":"Sam Sales","role":"sales","invited_by":"00000000-0000-0000-0000-00000000000a"}'),
  (test.id('fleet'),  'f@example.com',      '{"full_name":"Fran Fleet","role":"fleet_manager"}'),
  (test.id('viewer'), 'v@example.com',      '{"full_name":"Vic Viewer","role":"viewer"}'),
  (test.id('gone'),   'g@example.com',      '{"full_name":"Gus Gone","role":"sales"}');

select test.ok((select role from profiles where id = test.id('owner')) = 'viewer', 'hand-made user starts as viewer');
select test.ok((select email from profiles where id = test.id('owner')) = 'malasadojude@gmail.com', 'profile email stored lowercase');
select test.ok((select full_name from profiles where id = test.id('owner')) = 'malasadojude', 'missing name falls back to email prefix');
select test.ok((select role from profiles where id = test.id('owner2')) = 'viewer', 'metadata cannot create an Owner');
select test.ok((select role from profiles where id = test.id('sales')) = 'sales', 'invite metadata sets role');
select test.ok((select count(*) from activity_log where action = 'staff_invited') = 6, 'staff_invited logged for each user');

-- Bootstrap: the ONLY time a role is set outside the admin (SQL editor = trusted session).
update profiles set role = 'owner' where email = 'malasadojude@gmail.com';
select test.ok((select role from profiles where id = test.id('owner')) = 'owner', 'first Owner promoted from SQL editor');

-- =================================================================== anon
\echo '--- anon (logged-out visitor)'
select test.act_as('anon');
select test.throws('select * from public.contacts', '42501', 'anon cannot read contacts');
select test.throws('select * from public.applications', '42501', 'anon cannot read applications');
select test.throws('select * from public.vehicles', '42501', 'anon cannot read vehicles');
select test.throws('select * from public.profiles', '42501', 'anon cannot read profiles');
select test.throws('select * from public.notes', '42501', 'anon cannot read notes');
select test.throws('select * from public.activity_log', '42501', 'anon cannot read history');
select test.throws('select * from public.public_vehicles', '42501', 'anon cannot read public_vehicles directly');
select test.throws($$insert into public.contacts (first_name,last_name,phone,source) values ('a','b','7705550100','manual')$$, '42501', 'anon cannot insert contacts');
select test.reset();

-- =================================================================== public website (service role)
\echo '--- public website submissions (secret key)'
select test.act_as('service');
insert into applications (reference, first_name, last_name, phone, email, zip, county, primary_use,
  platform_status, urgency, age, has_license, license_state, has_vehicle, consent, vehicle_id)
values ('AWC-20260918-K3F9Q', ' Jane ', 'Doe', '(770) 555-0100', 'Jane@Example.COM', '30043', 'Gwinnett County',
  'Rideshare', 'Yes, currently active', 'Within 3 days', 29, true, 'Georgia', false, true,
  (select id from vehicles where code = 'awc-102'));
select test.ok((select phone from applications where reference = 'AWC-20260918-K3F9Q') = '7705550100', 'application phone stored as 10 digits');
select test.ok((select email from applications where reference = 'AWC-20260918-K3F9Q') = 'jane@example.com', 'application email lowercased');
select test.ok((select first_name from applications where reference = 'AWC-20260918-K3F9Q') = 'Jane', 'application name trimmed');
select test.ok((select vehicle_label from applications where reference = 'AWC-20260918-K3F9Q') = '2021 Toyota Prius', 'vehicle label snapshot filled');
select test.ok((select action from activity_log where record_type = 'application' order by id desc limit 1) = 'submitted', 'website application logged as submitted');
select test.ok((select actor_id from activity_log where record_type = 'application' order by id desc limit 1) is null, 'website submission has no actor');

select test.throws($$insert into applications (reference, first_name, last_name, phone, email, zip, county, primary_use, platform_status, urgency, age, has_license, has_vehicle, consent)
  values ('AWC-20260918-00000','A','B','7705550101','a@b.co','30043','Gwinnett County','Rideshare','Yes, currently active','Today',30,false,false,true)$$,
  '23514', 'reference with 0 rejected (look-alike)');
select test.throws($$insert into applications (first_name, last_name, phone, email, zip, county, primary_use, platform_status, urgency, age, has_license, has_vehicle, consent)
  values ('A','B','770555010','a@b.co','30043','Gwinnett County','Rideshare','Yes, currently active','Today',30,false,false,true)$$,
  '23514', '9-digit phone rejected');
select test.throws($$insert into applications (first_name, last_name, phone, email, zip, county, primary_use, platform_status, urgency, age, has_license, has_vehicle, consent)
  values ('A','B','7705550101','a@b.co','30043','Gwinnett County','Rideshare','Yes, currently active','Today',30,true,false,true)$$,
  '23514', 'license Yes requires license state');
select test.throws($$insert into applications (first_name, last_name, phone, email, zip, county, primary_use, platform_status, urgency, age, has_license, license_state, has_vehicle, consent)
  values ('A','B','7705550101','a@b.co','30043','Gwinnett County','Rideshare','Yes, currently active','Today',30,false,'Georgia',false,true)$$,
  '23514', 'license No must not carry a state');
select test.throws($$insert into applications (first_name, last_name, phone, email, zip, county, primary_use, platform_status, urgency, age, has_license, has_vehicle, consent)
  values ('A','B','7705550101','a@b.co','30043','Gwinnett County','Rideshare','Yes, currently active','Today',30,false,false,false)$$,
  '23514', 'consent is required');
select test.throws($$insert into applications (first_name, last_name, phone, email, zip, county, primary_use, platform_status, urgency, age, has_license, has_vehicle, consent)
  values ('A','B','7705550101','a@b.co','30043','Fulton County','Rideshare','Yes, currently active','Today',15,false,false,true)$$,
  '23514', 'age sanity check (16–100)');

insert into applications (first_name, last_name, phone, email, zip, county, primary_use,
  platform_status, urgency, age, has_license, has_vehicle, consent)
values ('Default', 'Ref', '4045550123', 'd@example.com', '30303', 'Fulton County', 'Courier', 'No, not signed up yet', 'Today', 40, false, true, true);
select test.ok((select reference ~ '^AWC-[0-9]{8}-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{5}$' from applications where last_name = 'Ref'), 'database fallback reference uses the shared alphabet');

insert into contacts (first_name, last_name, phone, email, source, original_message)
values ('Mia', 'Form', '404-555-0199', 'MIA@EXAMPLE.COM', 'contact_form', 'Do you have minivans?');
select test.ok((select lead_category from contacts where last_name = 'Form') = 'unrated', 'new contact-form contact is Unrated');
select test.ok((select phone from contacts where last_name = 'Form') = '4045550199', 'contact phone normalised');
select test.ok((select action from activity_log where record_type = 'contact' order by id desc limit 1) = 'submitted', 'website contact logged as submitted');

select test.ok(test.count('select * from public.public_vehicles') = 6, 'service role reads six published cars');
select test.throws('update activity_log set details = null', '42501', 'service role cannot edit history');
select test.reset();

-- =================================================================== history immutability (even postgres)
\echo '--- history is immutable'
select test.throws('update activity_log set details = ''x''', 'AWC05', 'postgres cannot edit history');
select test.throws('delete from activity_log', 'AWC05', 'postgres cannot delete history');
select test.throws('truncate activity_log', 'AWC05', 'postgres cannot truncate history');

-- =================================================================== owner assigns roles
\echo '--- staff management'
select test.act_as('owner');
select test.rows($$update profiles set role = 'owner' where id = test.id('owner2')$$, 1, 'Owner promotes another Owner');
select test.throws($$update profiles set role = 'sales' where id = test.id('owner')$$, 'AWC02', 'Owner cannot change own role');
select test.throws($$update profiles set is_active = false where id = test.id('owner')$$, 'AWC02', 'Owner cannot deactivate self');
select test.rows($$update profiles set is_active = false where id = test.id('gone')$$, 1, 'Owner deactivates a staff member');
select test.ok((select count(*) from staff_directory()) = 6, 'Owner sees the staff directory');
select test.reset();

select test.act_as('owner2');
select test.rows($$update profiles set role = 'viewer' where id = test.id('owner')$$, 1, 'second Owner can demote first while another Owner remains');
select test.throws($$update profiles set role = 'sales' where id = test.id('owner2')$$, 'AWC02', 'last Owner cannot demote self');
select test.reset();
-- Last active Owner is protected even from the SQL editor.
select test.throws($$update profiles set role = 'viewer' where id = test.id('owner2')$$, 'AWC03', 'last active Owner cannot be demoted (SQL editor)');
select test.throws($$update profiles set is_active = false where id = test.id('owner2')$$, 'AWC03', 'last active Owner cannot be deactivated (SQL editor)');
update profiles set role = 'owner' where id = test.id('owner');   -- restore for later tests

select test.act_as('sales');
select test.rows($$update profiles set role = 'owner' where id = test.id('sales')$$, 0, 'Sales cannot change roles (0 rows)');
select test.ok((select count(*) from staff_directory()) = 0, 'staff directory empty for non-Owner');
select test.reset();

select test.act_as('service');
select test.throws($$select admin_set_staff_active(test.id('sales'), test.id('viewer'), false)$$, 'AWC01', 'secret-key deactivate refused when requester is not an Owner');
select admin_set_staff_active(test.id('owner'), test.id('gone'), true);
select test.ok((select is_active from profiles where id = test.id('gone')), 'secret-key reactivate works for an Owner requester');
select admin_set_staff_active(test.id('owner'), test.id('gone'), false);
select test.throws($$select admin_set_staff_active(test.id('owner'), test.id('owner'), false)$$, 'AWC02', 'Owner cannot deactivate self via secret key');
select test.reset();
select test.ok((select actor_id from activity_log where action = 'deactivated' order by id desc limit 1) = test.id('owner'), 'secret-key deactivation names the Owner in history');

select test.act_as('anon');
select test.throws($$select admin_set_staff_active(test.id('owner'), test.id('sales'), false)$$, '42501', 'anon cannot call admin RPC');
select test.reset();
select test.act_as('owner');
select test.throws($$select admin_set_staff_active(test.id('owner'), test.id('sales'), false)$$, '42501', 'logged-in staff cannot call admin RPC directly');
select test.reset();

-- =================================================================== deactivated user
\echo '--- deactivated staff'
select test.act_as('gone');
select test.ok(test.count('select * from contacts') = 0, 'deactivated user sees no contacts');
select test.throws($$insert into contacts (first_name,last_name,phone,source) values ('a','b','7705550111','manual')$$, '42501', 'deactivated user cannot add contacts');
select test.reset();

-- =================================================================== viewer
\echo '--- viewer: read-only'
select test.act_as('viewer');
select test.ok(test.count('select * from applications') = 2, 'Viewer can view applications');
select test.ok(test.count('select * from contacts') = 1, 'Viewer can view contacts');
select test.ok(test.count('select * from vehicles') = 6, 'Viewer can view cars');
select test.ok(test.count('select * from activity_log') > 0, 'Viewer can view history');
select test.rows($$update contacts set fit = 'high'$$, 0, 'Viewer cannot update contacts (0 rows)');
select test.rows($$update applications set contacted = true$$, 0, 'Viewer cannot update applications (0 rows)');
select test.rows($$update vehicles set status = 'in_repair'$$, 0, 'Viewer cannot update cars (0 rows)');
select test.rows($$delete from contacts$$, 0, 'Viewer cannot delete contacts (0 rows)');
select test.throws($$insert into contacts (first_name,last_name,phone,source) values ('a','b','7705550112','manual')$$, '42501', 'Viewer cannot add contacts');
select test.throws($$insert into notes (contact_id, body) select id, 'hi' from contacts limit 1$$, '42501', 'Viewer cannot add notes');
select test.throws($$insert into activity_log (record_type, record_id, action) values ('contact', gen_random_uuid(), 'x')$$, '42501', 'Viewer cannot write history');
select test.reset();

-- =================================================================== sales
\echo '--- sales'
select test.act_as('sales');
select test.rows($$update applications set contacted = true where reference = 'AWC-20260918-K3F9Q'$$, 1, 'Sales marks an application contacted');
select test.reset();
select test.ok((select contacted_by = test.id('sales') and contacted_at is not null from applications where reference = 'AWC-20260918-K3F9Q'), 'contacted records who and when');
select test.act_as('sales');
select test.rows($$update applications set contacted = false where reference = 'AWC-20260918-K3F9Q'$$, 1, 'Sales unticks contacted');
select test.reset();
select test.ok((select contacted_by is null and contacted_at is null from applications where reference = 'AWC-20260918-K3F9Q'), 'unticking clears who and when');
select test.act_as('sales');
select test.throws($$update applications set phone = '7705550999' where reference = 'AWC-20260918-K3F9Q'$$, 'AWC04', 'application answers cannot be edited');
select test.throws($$update applications set age = 30 where reference = 'AWC-20260918-K3F9Q'$$, 'AWC04', 'application age cannot be edited');
select test.rows($$update applications set contacted = true, contacted_by = test.id('owner') where reference = 'AWC-20260918-K3F9Q'$$, 1, 'Sales supplies a fake contacted_by…');
select test.reset();
select test.ok((select contacted_by from applications where reference = 'AWC-20260918-K3F9Q') = test.id('sales'), '…but the database records the real actor');
select test.act_as('sales');
select test.rows($$update applications set archived_at = now() where reference = 'AWC-20260918-K3F9Q'$$, 1, 'Sales archives an application');
select test.rows($$update applications set archived_at = null where reference = 'AWC-20260918-K3F9Q'$$, 1, 'Sales restores an application');

-- Create a contact from the application, then link it.
insert into contacts (first_name, last_name, phone, email, zip, county, source)
  select first_name, last_name, phone, email, zip, county, 'application' from applications where reference = 'AWC-20260918-K3F9Q';
select test.rows($$update applications set contact_id = (select id from contacts where last_name = 'Doe') where reference = 'AWC-20260918-K3F9Q'$$, 1, 'Sales links application to contact');
select test.throws($$update contacts set lead_category = 'hot' where last_name = 'Doe'$$, '428C9', 'lead category cannot be written directly');
select test.rows($$update contacts set fit = 'high', intent = 'high' where last_name = 'Doe'$$, 1, 'Sales sets fit and intent');
select test.ok((select lead_category from contacts where last_name = 'Doe') = 'hot', 'High fit + High intent = Hot');
select test.ok((select lead_rank from contacts where last_name = 'Doe') = 1, 'Hot sorts first (rank 1)');
select test.ok((select lead_rank from contacts where last_name = 'Form') = 2, 'Unrated sorts second (rank 2)');
update contacts set fit = 'high', intent = 'low' where last_name = 'Doe';
select test.ok((select lead_category from contacts where last_name = 'Doe') = 'warm', 'High fit + Low intent = Warm');
update contacts set fit = 'low', intent = 'high' where last_name = 'Doe';
select test.ok((select lead_category from contacts where last_name = 'Doe') = 'low_priority', 'Low fit + High intent = Low-priority');
update contacts set fit = 'low', intent = 'low' where last_name = 'Doe';
select test.ok((select lead_category from contacts where last_name = 'Doe') = 'dead', 'Low fit + Low intent = Dead');
select test.ok((select lead_rank from contacts where last_name = 'Doe') = 5, 'Dead sorts last (rank 5)');
select test.throws($$update contacts set lead_rank = 1 where last_name = 'Doe'$$, '428C9', 'lead rank cannot be written directly');
select test.ok((select archived_at is null from contacts where last_name = 'Doe'), 'Dead lead is not auto-archived');
update contacts set intent = null where last_name = 'Doe';
select test.ok((select lead_category from contacts where last_name = 'Doe') = 'unrated', 'missing intent = Unrated');
update contacts set fit = 'high', intent = 'high' where last_name = 'Doe';

select test.rows($$update contacts set phone = '(678) 555-0142', zip = '30044' where last_name = 'Doe'$$, 1, 'Sales edits contact details');
select test.throws($$update contacts set phone = '5550142' where last_name = 'Doe'$$, '23514', '7-digit phone rejected on edit');
select test.throws($$update contacts set email = 'not-an-email' where last_name = 'Doe'$$, '23514', 'bad email rejected on edit');
select test.throws($$update contacts set zip = '3004' where last_name = 'Doe'$$, '23514', '4-digit ZIP rejected on edit');
select test.throws($$update contacts set source = 'manual' where last_name = 'Doe'$$, 'AWC08', 'contact source cannot be changed');
select test.throws($$update contacts set original_message = 'x' where last_name = 'Form'$$, 'AWC08', 'original message cannot be changed');
select test.rows($$insert into contacts (first_name, last_name, phone, source) values ('Walk', 'In', '4705550177', 'manual')$$, 1, 'Sales adds a contact by hand');
select test.throws($$insert into contacts (first_name, last_name, source) values ('No', 'Way', 'manual')$$, '23514', 'contact needs a phone or email');
select test.rows($$insert into notes (application_id, body) select id, 'Called, left voicemail' from applications where reference = 'AWC-20260918-K3F9Q'$$, 1, 'Sales adds an application note');
select test.rows($$insert into notes (contact_id, body) select id, 'Prefers text' from contacts where last_name = 'Doe'$$, 1, 'Sales adds a contact note');
select test.throws($$insert into notes (vehicle_id, body) select id, 'x' from vehicles limit 1$$, '42501', 'Sales cannot add car notes');
select test.throws($$update notes set body = 'edited'$$, '42501', 'notes cannot be edited');
select test.rows($$delete from notes$$, 0, 'Sales cannot delete notes (0 rows)');
select test.rows($$update vehicles set status = 'in_repair'$$, 0, 'Sales cannot edit cars (0 rows)');
select test.throws($$insert into vehicles (code, year, make, model, body_type, seats) values ('awc-900', 2020, 'Kia', 'Rio', 'sedan', 5)$$, '42501', 'Sales cannot add cars');
select test.rows($$delete from applications$$, 0, 'Sales cannot delete applications (0 rows)');
select test.rows($$delete from contacts$$, 0, 'Sales cannot delete contacts (0 rows)');
select test.reset();

select test.ok((select details from activity_log where action = 'details_edited' and record_type = 'contact' order by id desc limit 1) like '%phone: (770) 555-0100 → (678) 555-0142%', 'contact edit history shows old and new phone');
select test.ok((select actor_name from activity_log where action = 'details_edited' and record_type = 'contact' order by id desc limit 1) = 'Sam Sales', 'history records the actor name');
select test.ok(exists (select 1 from activity_log where action = 'created_from_application'), 'contact created from application logged');
select test.ok(exists (select 1 from activity_log where action = 'linked_contact'), 'application link logged');
select test.ok(exists (select 1 from activity_log where action = 'rating_changed' and details like '%category%'), 'fit/intent change logged with category');
select test.ok((select count(*) from activity_log where action in ('contacted','not_contacted') and record_type = 'application') = 3, 'contacted / not contacted logged');
select test.ok(exists (select 1 from activity_log where action = 'archived') and exists (select 1 from activity_log where action = 'restored'), 'archive and restore logged');
select test.ok((select count(*) from activity_log where action = 'note_added') = 2, 'note additions logged');
select test.ok((select author_id from notes where body = 'Prefers text') = test.id('sales'), 'note author recorded by the database');

-- =================================================================== fleet manager
\echo '--- fleet manager'
select test.act_as('fleet');
select test.rows($$update contacts set first_name = 'X' where last_name = 'Doe'$$, 0, 'Fleet Manager cannot edit contacts (0 rows)');
select test.rows($$update contacts set fit = 'low' where last_name = 'Doe'$$, 0, 'Fleet Manager cannot set fit/intent (0 rows)');
select test.rows($$update contacts set contacted = true where last_name = 'Doe'$$, 0, 'Fleet Manager cannot mark contacted (0 rows)');
select test.rows($$update contacts set archived_at = now() where last_name = 'Doe'$$, 0, 'Fleet Manager cannot archive (0 rows)');
select test.rows($$update applications set contacted = true$$, 0, 'Fleet Manager cannot work applications (0 rows)');
select test.rows($$insert into notes (contact_id, body) select id, 'Picked up keys' from contacts where last_name = 'Doe'$$, 1, 'Fleet Manager can add a contact note');
select test.throws($$insert into notes (application_id, body) select id, 'x' from applications limit 1$$, '42501', 'Fleet Manager cannot add application notes');
select test.rows($$insert into vehicles (code, year, make, model, body_type, seats, photo_path, photo_alt) values ('awc-201', 2022, 'Toyota', 'Corolla', 'sedan', 5, 'awc-201.jpg', 'Silver 2022 Toyota Corolla, front three-quarter view')$$, 1, 'Fleet Manager adds a car with photo + description');
select test.throws($$insert into vehicles (code, year, make, model, body_type, seats, photo_path) values ('awc-202', 2022, 'Kia', 'Rio', 'sedan', 5, 'x.jpg')$$, '23514', 'photo requires a description');
select test.throws($$update vehicles set status = 'rented' where code = 'awc-201'$$, '23514', 'car cannot be Rented without a renter');
select test.throws($$update vehicles set renter_contact_id = (select id from contacts where last_name = 'Doe') where code = 'awc-201'$$, '23514', 'renter on a non-rented car raises (not silently dropped)');
select test.rows($$update vehicles set status = 'rented', renter_contact_id = (select id from contacts where last_name = 'Doe'), rented_since = '2026-09-18' where code = 'awc-201'$$, 1, 'Fleet Manager assigns a renter');
select test.rows($$update vehicles set status = 'rented', renter_contact_id = (select id from contacts where last_name = 'Doe'), rented_since = '2026-09-18' where code = 'awc-101'$$, 1, 'same contact can rent a second car (warning is app-level)');
select test.throws($$update vehicles set status = 'available' where code = 'awc-101'$$, '23514', 'leaving Rented without removing renter raises');
select test.rows($$update vehicles set status = 'available', renter_contact_id = null, rented_since = null where code = 'awc-101'$$, 1, 'status away from Rented with renter removed');
select test.rows($$update vehicles set is_published = true where code = 'awc-201'$$, 1, 'Fleet Manager shows a car on the website');
select test.rows($$insert into notes (vehicle_id, body) select id, 'Oil change due' from vehicles where code = 'awc-201'$$, 1, 'Fleet Manager adds a car note');
select test.rows($$delete from vehicles where code = 'awc-104'$$, 0, 'Fleet Manager cannot delete cars (0 rows)');
select test.throws($$update vehicles set code = 'awc-999' where code = 'awc-201'$$, 'AWC08', 'car code cannot be changed');
select test.reset();

select test.ok(exists (select 1 from activity_log where action = 'renter_assigned' and record_type = 'vehicle'), 'renter assignment logged');
select test.ok(exists (select 1 from activity_log where action = 'renter_removed' and record_type = 'vehicle'), 'renter removal logged');
select test.ok(exists (select 1 from activity_log where action = 'status_changed'), 'status change logged');
select test.ok(exists (select 1 from activity_log where action = 'shown_on_website'), 'show on website logged');
select test.ok(exists (select 1 from activity_log where action = 'added' and record_type = 'vehicle'), 'car added logged');

-- public view never exposes internals
select test.act_as('service');
select test.ok(test.count('select * from public_vehicles') = 7, 'published car appears in public view');
select test.ok(not exists (select 1 from information_schema.columns where table_name = 'public_vehicles' and column_name in ('renter_contact_id','rented_since','id','is_published')), 'public view has no renter or internal columns');
select test.reset();

-- storage
\echo '--- storage'
select test.act_as('fleet');
select test.rows($$insert into storage.objects (bucket_id, name) values ('vehicle-photos', 'awc-201.jpg')$$, 1, 'Fleet Manager uploads a photo');
select test.reset();
select test.act_as('sales');
select test.throws($$insert into storage.objects (bucket_id, name) values ('vehicle-photos', 'x.jpg')$$, '42501', 'Sales cannot upload photos');
select test.rows($$delete from storage.objects where bucket_id = 'vehicle-photos'$$, 0, 'Sales cannot delete photos (0 rows)');
select test.reset();

-- =================================================================== car photo + facts history
\echo '--- car photo and vehicle-facts edits (Fleet Manager)'
select test.act_as('fleet');
select test.rows($$update vehicles set photo_path = 'awc-103-1.jpg', photo_alt = 'White Nissan Sentra, front view' where code = 'awc-103'$$, 1, 'Fleet adds a photo with a description');
select test.rows($$update vehicles set photo_alt = 'White 2019 Nissan Sentra' where code = 'awc-103'$$, 1, 'Fleet edits the photo description');
select test.rows($$update vehicles set rideshare_note = '4 doors, seats 5.' where code = 'awc-103'$$, 1, 'Fleet edits the vehicle facts');
select test.rows($$update vehicles set photo_path = null, photo_alt = null where code = 'awc-103'$$, 1, 'Fleet removes the photo');
select test.reset();
select test.ok((select count(*) from activity_log a join vehicles v on v.id = a.record_id
  where v.code = 'awc-103' and a.action = 'edited' and a.details like '%photo%') = 3, 'photo changes logged as edits');
select test.ok(exists (select 1 from activity_log a join vehicles v on v.id = a.record_id
  where v.code = 'awc-103' and a.details = 'vehicle note updated'), 'vehicle facts change logged');

-- =================================================================== owner deletes
\echo '--- deletes (Owner)'
select test.act_as('owner');
select test.throws($$delete from vehicles where code = 'awc-201'$$, 'AWC06', 'rented car cannot be deleted');
select test.throws($$delete from contacts where last_name = 'Doe'$$, 'AWC07', 'renting contact cannot be deleted');
update vehicles set status = 'available', renter_contact_id = null, rented_since = null where code = 'awc-201';
select test.rows($$delete from contacts where last_name = 'Doe'$$, 1, 'Owner deletes a contact once no longer renting');
select test.ok((select contact_id is null from applications where reference = 'AWC-20260918-K3F9Q'), 'deleting a contact unlinks (keeps) its applications');
select test.ok(not exists (select 1 from notes where body in ('Prefers text', 'Picked up keys')), 'deleting a contact deletes its notes');
select test.rows($$delete from vehicles where code = 'awc-102'$$, 1, 'Owner deletes a car');
select test.ok((select vehicle_id is null and vehicle_label = '2021 Toyota Prius' from applications where reference = 'AWC-20260918-K3F9Q'), 'deleted car: application keeps its label');
select test.rows($$delete from applications where reference = 'AWC-20260918-K3F9Q'$$, 1, 'Owner deletes an application');
select test.ok(not exists (select 1 from notes where body = 'Called, left voicemail'), 'deleting an application deletes its notes');
select test.rows($$delete from notes where body = 'Oil change due'$$, 1, 'Owner deletes a note');
select test.throws($$delete from activity_log$$, '42501', 'Owner cannot delete history');
select test.reset();

select test.ok((select details from activity_log where action = 'deleted' and record_type = 'contact') = 'Contact deleted: Jane D.', 'delete entry is a short name only');
select test.ok((select details from activity_log where action = 'deleted' and record_type = 'application') like 'Application deleted: Jane D. (AWC-%', 'application delete entry is short');
select test.ok(exists (select 1 from activity_log where action = 'note_deleted'), 'direct note delete logged');
select test.ok(not exists (select 1 from activity_log where action = 'note_deleted' and record_type = 'contact'), 'cascaded note deletes not double-logged');

-- =================================================================== RLS everywhere
\echo '--- RLS enabled on every table'
select test.ok(not exists (
  select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
), 'RLS enabled on every public table');

\echo '--- done'
