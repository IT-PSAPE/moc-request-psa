-- phase-08-private-helpers.sql
-- Private-schema RLS helper predicates.

create or replace function private.current_workspace_role(target_workspace uuid)
returns public.workspace_roles
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select r.*
  from public.workspace_members m
  join public.workspace_roles r on r.id = m.workspace_role_id
  where m.user_id = auth.uid()
    and m.workspace_id = target_workspace
    and m.status = 'active'
  limit 1;
$$;

create or replace function private.is_workspace_admin(target_workspace uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce((
    select can_manage_roles
    from private.current_workspace_role(target_workspace)
  ), false);
$$;

create or replace function private.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (select is_platform_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

create or replace function private.is_department_member(target_department uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.department_members
    where user_id = auth.uid() and department_id = target_department
  );
$$;

create or replace function private.is_department_lead(target_department uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.department_members
    where user_id = auth.uid()
      and department_id = target_department
      and role = 'lead'
  );
$$;
