-- phase-06-indexes.sql

create index if not exists idx_workspace_members_workspace_user
  on public.workspace_members (workspace_id, user_id);

create index if not exists idx_workspace_members_pending
  on public.workspace_members (workspace_id) where status = 'pending';

create index if not exists idx_departments_workspace
  on public.departments (workspace_id, sort_order);

create index if not exists idx_department_members_user
  on public.department_members (user_id);

create index if not exists idx_categories_workspace_active
  on public.categories (workspace_id, is_active, sort_order);

create index if not exists idx_requests_workspace_status
  on public.requests (workspace_id, status);

create index if not exists idx_requests_department_status
  on public.requests (department_id, status) where department_id is not null;

create index if not exists idx_requests_due_date
  on public.requests (workspace_id, due_date) where due_date is not null;

create index if not exists idx_requests_tracking_id
  on public.requests (tracking_id);

create index if not exists idx_request_assignees_request
  on public.request_assignees (request_id);

create index if not exists idx_request_assignees_user
  on public.request_assignees (user_id);

create index if not exists idx_comments_request
  on public.comments (request_id, created_at);

create index if not exists idx_activity_logs_request
  on public.activity_logs (request_id, created_at desc);
