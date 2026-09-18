-- ATL Work Cars — 0009: server-only staff functions and the staff directory
--
-- Staff invites and deactivation need the Supabase admin API (secret key). The
-- server confirms the requester is an active Owner, then calls these functions
-- with the requester's id so the guards and history still name the right person.

-- Deactivate / reactivate a staff member. Service role only.
create function public.admin_set_staff_active(p_actor uuid, p_target uuid, p_active boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not exists (select 1 from public.profiles where id = p_actor and role = 'owner' and is_active) then
    raise exception 'Only an active Owner can do this.' using errcode = 'AWC01';
  end if;
  -- This function runs as a trusted role, so the profile guard's own-account rule
  -- would not fire; enforce it here explicitly. (The last-Owner rule always fires.)
  if p_actor = p_target then
    raise exception 'You cannot change your own role or deactivate yourself.' using errcode = 'AWC02';
  end if;
  perform set_config('app.actor_id', p_actor::text, true);
  update public.profiles set is_active = p_active where id = p_target;
  if not found then
    raise exception 'Staff member not found.' using errcode = 'AWC10';
  end if;
end;
$$;

revoke execute on function public.admin_set_staff_active(uuid, uuid, boolean) from public, anon, authenticated;
grant execute on function public.admin_set_staff_active(uuid, uuid, boolean) to service_role;

-- Everyone with admin access, for the Staff page. Owner only (checked here, so a
-- non-Owner calling it directly gets nothing). Includes last sign-in from auth.users.
create function public.staff_directory()
returns table (
  id uuid, email text, full_name text, role public.staff_role, is_active boolean,
  invited_by uuid, invited_at timestamptz, last_sign_in_at timestamptz
)
language sql stable security definer set search_path = ''
as $$
  select p.id, p.email, p.full_name, p.role, p.is_active, p.invited_by, p.created_at, u.last_sign_in_at
  from public.profiles p
  join auth.users u on u.id = p.id
  where public.has_role('owner')
  order by p.is_active desc, p.full_name
$$;

revoke execute on function public.staff_directory() from public, anon;
grant execute on function public.staff_directory() to authenticated;
