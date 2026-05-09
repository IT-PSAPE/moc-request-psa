-- phase-09-rls-policies.sql
-- Row-level security on every table.

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_roles enable row level security;
alter table public.workspace_members enable row level security;
alter table public.departments enable row level security;
alter table public.department_members enable row level security;
alter table public.categories enable row level security;
alter table public.requests enable row level security;
alter table public.request_assignees enable row level security;
alter table public.comments enable row level security;
alter table public.activity_logs enable row level security;

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

create policy profiles_self_update on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy workspaces_read on public.workspaces
  for select using (
    private.is_platform_admin() or exists (
      select 1 from public.workspace_members
      where workspace_id = workspaces.id and user_id = auth.uid() and status = 'active'
    )
  );

create policy workspaces_modify on public.workspaces
  for all using (private.is_platform_admin())
  with check (private.is_platform_admin());

create policy workspace_roles_read on public.workspace_roles
  for select using (
    private.is_platform_admin() or exists (
      select 1 from public.workspace_members
      where workspace_id = workspace_roles.workspace_id
        and user_id = auth.uid()
        and status = 'active'
    )
  );

create policy workspace_roles_modify on public.workspace_roles
  for all using (private.is_workspace_admin(workspace_id))
  with check (private.is_workspace_admin(workspace_id));

create policy workspace_members_read on public.workspace_members
  for select using (
    user_id = auth.uid()
    or private.is_platform_admin()
    or private.is_workspace_admin(workspace_id)
  );

create policy workspace_members_self_insert on public.workspace_members
  for insert with check (user_id = auth.uid() and status = 'pending');

create policy workspace_members_admin_modify on public.workspace_members
  for update using (private.is_workspace_admin(workspace_id) or private.is_platform_admin())
  with check (private.is_workspace_admin(workspace_id) or private.is_platform_admin());

create policy workspace_members_admin_delete on public.workspace_members
  for delete using (private.is_workspace_admin(workspace_id) or private.is_platform_admin());

create policy departments_read on public.departments
  for select using (
    private.is_platform_admin() or exists (
      select 1 from public.workspace_members
      where workspace_id = departments.workspace_id
        and user_id = auth.uid() and status = 'active'
    )
  );

create policy departments_admin_modify on public.departments
  for all using (private.is_workspace_admin(workspace_id))
  with check (private.is_workspace_admin(workspace_id));

create policy department_members_read on public.department_members
  for select using (
    user_id = auth.uid() or exists (
      select 1 from public.departments d
      where d.id = department_members.department_id
        and (private.is_workspace_admin(d.workspace_id) or private.is_department_lead(d.id))
    )
  );

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

create policy categories_read on public.categories
  for select using (
    private.is_platform_admin() or exists (
      select 1 from public.workspace_members
      where workspace_id = categories.workspace_id
        and user_id = auth.uid() and status = 'active'
    )
  );

create policy categories_admin_modify on public.categories
  for all using (private.is_workspace_admin(workspace_id))
  with check (private.is_workspace_admin(workspace_id));

-- Visibility mirrors the frontend's canSeeRequest: platform admins and workspace
-- admins see everything in-scope; everyone else only sees requests routed to a
-- department they belong to. department_id is NOT NULL so we no longer have a
-- separate "unrouted" branch.
create policy requests_read on public.requests
  for select using (
    private.is_platform_admin()
    or private.is_workspace_admin(workspace_id)
    or private.is_department_member(department_id)
  );

create policy requests_modify on public.requests
  for all using (
    private.is_workspace_admin(workspace_id)
    or private.is_department_member(department_id)
  ) with check (
    private.is_workspace_admin(workspace_id)
    or private.is_department_member(department_id)
  );

create policy request_assignees_read on public.request_assignees
  for select using (exists (select 1 from public.requests r where r.id = request_assignees.request_id));

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

create policy comments_read on public.comments
  for select using (exists (select 1 from public.requests r where r.id = comments.request_id));

create policy comments_insert on public.comments
  for insert with check (
    author_id = auth.uid() and exists (select 1 from public.requests r where r.id = comments.request_id)
  );

create policy comments_modify on public.comments
  for update using (author_id = auth.uid()) with check (author_id = auth.uid());

create policy comments_delete on public.comments
  for delete using (author_id = auth.uid());

create policy activity_logs_read on public.activity_logs
  for select using (exists (select 1 from public.requests r where r.id = activity_logs.request_id));
