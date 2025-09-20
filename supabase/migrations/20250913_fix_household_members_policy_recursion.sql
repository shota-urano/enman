-- Fix infinite recursion in household_members RLS by avoiding self-referencing subqueries
-- Introduce helper functions executed as table owner (security definer)

create or replace function public.is_household_member(_household uuid, _user uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.household_members hm
    where hm.household_id = _household
      and hm.user_id = _user
  );
$$;

create or replace function public.is_household_owner(_household uuid, _user uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.household_members hm
    where hm.household_id = _household
      and hm.user_id = _user
      and hm.role = 'owner'
  );
$$;

grant execute on function public.is_household_member(uuid, uuid) to authenticated;
grant execute on function public.is_household_owner(uuid, uuid) to authenticated;

-- Replace recursive policies on household_members
drop policy if exists hm_select on public.household_members;
drop policy if exists hm_mod on public.household_members;

create policy hm_select on public.household_members
  for select using (
    public.is_household_member(household_members.household_id, auth.uid())
  );

-- Restrict modifications to owners; application uses service role for server-side admin updates
create policy hm_update_owner on public.household_members
  for update using (
    public.is_household_owner(household_members.household_id, auth.uid())
  ) with check (
    public.is_household_owner(household_members.household_id, auth.uid())
  );

create policy hm_delete_owner on public.household_members
  for delete using (
    public.is_household_owner(household_members.household_id, auth.uid())
  );

-- Optional: self-insert (kept strict off for now; onboarding uses service role)
-- create policy hm_insert_self on public.household_members
--   for insert with check (user_id = auth.uid());

-- EOF

