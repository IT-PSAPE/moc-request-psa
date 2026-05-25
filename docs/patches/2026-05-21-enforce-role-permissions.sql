-- Patch: enforce the workspace_roles capability flags on requests.
--
-- Context: workspace_roles carries can_create / can_update / can_delete, and
-- the seeded Editor / Viewer roles set them meaningfully — but nothing read
-- them. The old `requests_modify` policy was `for all using (is_workspace_admin
-- OR is_department_member)`, so ANY department member could insert, update, and
-- delete requests regardless of their role. A "Viewer" had the same write
-- access as an "Editor" or "Admin".
--
-- This patch:
--   • Adds private.can_create_requests / can_update_requests /
--     can_delete_requests — capability checks backed by the caller's role.
--   • Replaces `requests_modify` with per-operation policies that require the
--     matching capability AND department membership (workspace admins bypass).
--   • Tightens request_assignees_modify the same way (assigning is an edit).
--   • Re-grants complete_invitation() to `authenticated` (defensive; see below).
--
-- Folded into docs/phases/phase-04 and phase-05 going forward. Idempotent:
-- every function is CREATE OR REPLACE and every policy is dropped before
-- recreate, so re-running against a current database is a no-op.

-- ───────────────────────────────────────────────────────────────────────────
-- 1. Capability helpers (private; not exposed to anon).
-- ───────────────────────────────────────────────────────────────────────────
create or replace function private.can_create_requests(target_workspace uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce((
    select can_create from private.current_workspace_role(target_workspace)
  ), false);
$$;

create or replace function private.can_update_requests(target_workspace uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce((
    select can_update from private.current_workspace_role(target_workspace)
  ), false);
$$;

create or replace function private.can_delete_requests(target_workspace uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce((
    select can_delete from private.current_workspace_role(target_workspace)
  ), false);
$$;

-- ───────────────────────────────────────────────────────────────────────────
-- 2. requests: replace the combined policy with per-operation policies.
-- ───────────────────────────────────────────────────────────────────────────
drop policy if exists requests_modify on public.requests;

drop policy if exists requests_insert on public.requests;
create policy requests_insert on public.requests
  for insert with check (
    private.is_workspace_admin(workspace_id)
    or (
      private.can_create_requests(workspace_id)
      and private.is_department_member(department_id)
    )
  );

drop policy if exists requests_update on public.requests;
create policy requests_update on public.requests
  for update using (
    private.is_workspace_admin(workspace_id)
    or (
      private.can_update_requests(workspace_id)
      and private.is_department_member(department_id)
    )
  ) with check (
    private.is_workspace_admin(workspace_id)
    or (
      private.can_update_requests(workspace_id)
      and private.is_department_member(department_id)
    )
  );

drop policy if exists requests_delete on public.requests;
create policy requests_delete on public.requests
  for delete using (
    private.is_workspace_admin(workspace_id)
    or (
      private.can_delete_requests(workspace_id)
      and private.is_department_member(department_id)
    )
  );

-- ───────────────────────────────────────────────────────────────────────────
-- 3. request_assignees: assigning is an edit, so it needs can_update.
-- ───────────────────────────────────────────────────────────────────────────
drop policy if exists request_assignees_modify on public.request_assignees;
create policy request_assignees_modify on public.request_assignees
  for all using (
    exists (
      select 1 from public.requests r
      join public.workspace_members m
        on m.workspace_id = r.workspace_id
       and m.user_id = request_assignees.user_id
       and m.status = 'active'
      where r.id = request_assignees.request_id
        and (
          private.is_workspace_admin(r.workspace_id)
          or (
            private.can_update_requests(r.workspace_id)
            and private.is_department_member(r.department_id)
          )
        )
    )
  ) with check (
    exists (
      select 1 from public.requests r
      join public.workspace_members m
        on m.workspace_id = r.workspace_id
       and m.user_id = request_assignees.user_id
       and m.status = 'active'
      where r.id = request_assignees.request_id
        and (
          private.is_workspace_admin(r.workspace_id)
          or (
            private.can_update_requests(r.workspace_id)
            and private.is_department_member(r.department_id)
          )
        )
    )
  );

-- ───────────────────────────────────────────────────────────────────────────
-- 4. Re-grant complete_invitation() to authenticated.
-- phase-05's blanket `revoke execute … from authenticated` strips this grant
-- if phase-05 is re-run on its own; restore it here. Guarded so it's safe even
-- if phase-07 was never applied.
-- ───────────────────────────────────────────────────────────────────────────
do $$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'complete_invitation'
  ) then
    execute 'grant execute on function public.complete_invitation() to authenticated';
  end if;
end $$;
