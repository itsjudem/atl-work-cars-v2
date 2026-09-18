-- ATL Work Cars — make the first Owner. Run ONCE per project, AFTER:
--   1. setup-all.sql has been run, and
--   2. the user was added in Authentication → Users → Add user → Create new user
--      (email below, "Auto Confirm User" ticked).
-- This is the only time a role is set outside the admin.

update public.profiles
set role = 'owner'
where email = 'malasadojude@gmail.com';

-- Optional: set the name shown in the admin (defaults to the part before the @).
-- update public.profiles set full_name = 'Your Name' where email = 'malasadojude@gmail.com';

-- Should show one row with role = owner:
select email, full_name, role, is_active from public.profiles;
