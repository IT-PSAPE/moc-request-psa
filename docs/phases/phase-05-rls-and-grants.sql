-- phase-05-rls-and-grants.sql
--
-- Row-level security on every table + role grants for `anon` and
-- `authenticated`. Both concerns are about who can see / do what; keeping them
-- in the same file makes it obvious that a policy without a matching grant
-- (or vice-versa) is a misconfiguration.
--
-- Idempotency: every policy is dropped and recreated; ENABLE ROW LEVEL
-- SECURITY is a no-op if already enabled; GRANT/REVOKE are idempotent.

-- ───────────────────────────────────────────────────────────────────────────
-- 1. Enable RLS on every table.
-- ───────────────────────────────────────────────────────────────────────────
alter table public.profiles            enable row level security;
alter table public.workspaces          enable row level security;
alter table public.workspace_roles     enable row level security;
alter table public.workspace_members   enable row level security;
alter table public.departments         enable row level security;
alter table public.department_members  enable row level security;
alter table public.categories          enable row level security;
alter table public.requests            enable row level security;
alter table public.request_assignees   enable row level security;
alter table public.comments            enable row level security;
alter table public.activity_logs       enable row level security;
alter table public.bug_reports         enable row level security;

-- ───────────────────────────────────────────────────────────────────────────
-- 2. profiles
-- ───────────────────────────────────────────────────────────────────────────
drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read on public.profiles
  for select using (
    id = auth.uid() or private.is_platform_admin() or exists (
      select 1
      from public.workspace_members m
      join public.workspace_members me
        on me.user_id = auth.uid() and me.workspace_id = m.workspace_id
      where m.user_id = profiles.id and me.status = 'active'
    )
  );

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- ───────────────────────────────────────────────────────────────────────────
-- 3. workspaces
-- Pending members need to see their workspace's name on the /pending screen,
-- so SELECT is allowed for any-status membership. WRITE is platform-admin only.
-- ───────────────────────────────────────────────────────────────────────────
drop policy if exists workspaces_read on public.workspaces;
create policy workspaces_read on public.workspaces
  for select using (
    private.is_platform_admin() or exists (
      select 1 from public.workspace_members
      where workspace_id = workspaces.id and user_id = auth.uid()
    )
  );

drop policy if exists workspaces_modify on public.workspaces;
create policy workspaces_modify on public.workspaces
  for all using (private.is_platform_admin())
  with check (private.is_platform_admin());

-- ───────────────────────────────────────────────────────────────────────────
-- 4. workspace_roles
-- ───────────────────────────────────────────────────────────────────────────
drop policy if exists workspace_roles_read on public.workspace_roles;
create policy workspace_roles_read on public.workspace_roles
  for select using (
    private.is_platform_admin() or exists (
      select 1 from public.workspace_members
      where workspace_id = workspace_roles.workspace_id
        and user_id = auth.uid()
        and status = 'active'
    )
  );

drop policy if exists workspace_roles_modify on public.workspace_roles;
create policy workspace_roles_modify on public.workspace_roles
  for all using (private.is_workspace_admin(workspace_id))
  with check (private.is_workspace_admin(workspace_id));

-- ───────────────────────────────────────────────────────────────────────────
-- 5. workspace_members
-- ───────────────────────────────────────────────────────────────────────────
drop policy if exists workspace_members_read on public.workspace_members;
create policy workspace_members_read on public.workspace_members
  for select using (
    user_id = auth.uid()
    or private.is_platform_admin()
    or private.is_workspace_admin(workspace_id)
  );

drop policy if exists workspace_members_self_insert on public.workspace_members;
create policy workspace_members_self_insert on public.workspace_members
  for insert with check (user_id = auth.uid() and status = 'pending');

drop policy if exists workspace_members_admin_modify on public.workspace_members;
create policy workspace_members_admin_modify on public.workspace_members
  for update using (private.is_workspace_admin(workspace_id) or private.is_platform_admin())
  with check (private.is_workspace_admin(workspace_id) or private.is_platform_admin());

drop policy if exists workspace_members_admin_delete on public.workspace_members;
create policy workspace_members_admin_delete on public.workspace_members
  for delete using (private.is_workspace_admin(workspace_id) or private.is_platform_admin());

-- ───────────────────────────────────────────────────────────────────────────
-- 6. departments
-- ───────────────────────────────────────────────────────────────────────────
drop policy if exists departments_read on public.departments;
create policy departments_read on public.departments
  for select using (
    private.is_platform_admin() or exists (
      select 1 from public.workspace_members
      where workspace_id = departments.workspace_id
        and user_id = auth.uid() and status = 'active'
    )
  );

drop policy if exists departments_admin_modify on public.departments;
create policy departments_admin_modify on public.departments
  for all using (private.is_workspace_admin(workspace_id))
  with check (private.is_workspace_admin(workspace_id));

-- ───────────────────────────────────────────────────────────────────────────
-- 7. department_members
-- ───────────────────────────────────────────────────────────────────────────
drop policy if exists department_members_read on public.department_members;
create policy department_members_read on public.department_members
  for select using (
    user_id = auth.uid() or exists (
      select 1 from public.departments d
      where d.id = department_members.department_id
        and (private.is_workspace_admin(d.workspace_id) or private.is_department_lead(d.id))
    )
  );

drop policy if exists department_members_admin_modify on public.department_members;
create policy department_members_admin_modify on public.department_members
  for all using (
    exists (
      select 1 from public.departments d
      where d.id = department_members.department_id
        and private.is_workspace_admin(d.workspace_id)
    )
  ) with check (
    exists (
      select 1 from public.departments d
      where d.id = department_members.department_id
        and private.is_workspace_admin(d.workspace_id)
    )
  );

-- ───────────────────────────────────────────────────────────────────────────
-- 8. categories
-- ───────────────────────────────────────────────────────────────────────────
drop policy if exists categories_read on public.categories;
create policy categories_read on public.categories
  for select using (
    private.is_platform_admin() or exists (
      select 1 from public.workspace_members
      where workspace_id = categories.workspace_id
        and user_id = auth.uid() and status = 'active'
    )
  );

drop policy if exists categories_admin_modify on public.categories;
create policy categories_admin_modify on public.categories
  for all using (private.is_workspace_admin(workspace_id))
  with check (private.is_workspace_admin(workspace_id));

-- ───────────────────────────────────────────────────────────────────────────
-- 9. requests
-- Visibility mirrors the frontend's canSeeRequest: platform admins and
-- workspace admins see everything in-scope; everyone else only sees requests
-- routed to a department they belong to.
-- ───────────────────────────────────────────────────────────────────────────
drop policy if exists requests_read on public.requests;
create policy requests_read on public.requests
  for select using (
    private.is_platform_admin()
    or private.is_workspace_admin(workspace_id)
    or private.is_department_member(department_id)
  );

drop policy if exists requests_modify on public.requests;
create policy requests_modify on public.requests
  for all using (
    private.is_workspace_admin(workspace_id)
    or private.is_department_member(department_id)
  ) with check (
    private.is_workspace_admin(workspace_id)
    or private.is_department_member(department_id)
  );

-- ───────────────────────────────────────────────────────────────────────────
-- 10. request_assignees
-- ───────────────────────────────────────────────────────────────────────────
drop policy if exists request_assignees_read on public.request_assignees;
create policy request_assignees_read on public.request_assignees
  for select using (exists (select 1 from public.requests r where r.id = request_assignees.request_id));

drop policy if exists request_assignees_modify on public.request_assignees;
create policy request_assignees_modify on public.request_assignees
  for all using (
    exists (
      select 1 from public.requests r
      where r.id = request_assignees.request_id
        and (private.is_workspace_admin(r.workspace_id) or private.is_department_member(r.department_id))
    )
  ) with check (
    exists (
      select 1 from public.requests r
      where r.id = request_assignees.request_id
        and (private.is_workspace_admin(r.workspace_id) or private.is_department_member(r.department_id))
    )
  );

-- ───────────────────────────────────────────────────────────────────────────
-- 11. comments
-- ───────────────────────────────────────────────────────────────────────────
drop policy if exists comments_read on public.comments;
create policy comments_read on public.comments
  for select using (exists (select 1 from public.requests r where r.id = comments.request_id));

drop policy if exists comments_insert on public.comments;
create policy comments_insert on public.comments
  for insert with check (
    author_id = auth.uid() and exists (select 1 from public.requests r where r.id = comments.request_id)
  );

drop policy if exists comments_modify on public.comments;
create policy comments_modify on public.comments
  for update using (author_id = auth.uid()) with check (author_id = auth.uid());

drop policy if exists comments_delete on public.comments;
create policy comments_delete on public.comments
  for delete using (author_id = auth.uid());

-- ───────────────────────────────────────────────────────────────────────────
-- 12. activity_logs
-- Client-side emits (assignee_added, assignee_removed, comment_posted,
-- field_updated) come from mutate-activity.ts. The actor must be writing as
-- themselves and must have access to the underlying request. Server-
-- authoritative emits from the requests_after_* triggers bypass this via
-- SECURITY DEFINER.
-- ───────────────────────────────────────────────────────────────────────────
drop policy if exists activity_logs_read on public.activity_logs;
create policy activity_logs_read on public.activity_logs
  for select using (exists (select 1 from public.requests r where r.id = activity_logs.request_id));

drop policy if exists activity_logs_insert on public.activity_logs;
create policy activity_logs_insert on public.activity_logs
  for insert with check (
    actor_id = auth.uid()
    and exists (select 1 from public.requests r where r.id = activity_logs.request_id)
  );

-- ───────────────────────────────────────────────────────────────────────────
-- 13. bug_reports
-- A reporter sees and creates only their own reports. Platform admins triage.
-- Workspace admins do NOT get visibility — bug reports are routed to the
-- platform team, not the workspace.
-- ───────────────────────────────────────────────────────────────────────────
drop policy if exists bug_reports_self_read on public.bug_reports;
create policy bug_reports_self_read on public.bug_reports
  for select using (
    reporter_id = auth.uid() or private.is_platform_admin()
  );

drop policy if exists bug_reports_self_insert on public.bug_reports;
create policy bug_reports_self_insert on public.bug_reports
  for insert with check (
    reporter_id = auth.uid() or reporter_id is null
  );

drop policy if exists bug_reports_platform_modify on public.bug_reports;
create policy bug_reports_platform_modify on public.bug_reports
  for update using (private.is_platform_admin())
  with check (private.is_platform_admin());

drop policy if exists bug_reports_platform_delete on public.bug_reports;
create policy bug_reports_platform_delete on public.bug_reports
  for delete using (private.is_platform_admin());

-- ───────────────────────────────────────────────────────────────────────────
-- 14. Role grants.
-- `anon` must NOT have direct table access; it only sees the public RPCs.
-- `authenticated` has full DML on every public table; RLS gates the rows.
-- ───────────────────────────────────────────────────────────────────────────
revoke all on schema public from anon;
grant usage on schema public to anon;

grant execute on function public.submit_public_request(uuid, uuid, jsonb)        to anon;
grant execute on function public.lookup_request_by_tracking_id(text)             to anon;
grant execute on function public.lookup_workspace_by_slug(text)                  to anon, authenticated;
grant execute on function public.list_public_categories(uuid)                    to anon, authenticated;

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on function public.approve_workspace_member(uuid, uuid)            to authenticated;

-- bug_reports gets the same DML grants the catch-all above already covers; the
-- explicit re-grant below documents the intent (RLS scopes who can do what).
grant select, insert, update, delete on public.bug_reports to authenticated;
