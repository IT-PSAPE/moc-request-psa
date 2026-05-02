-- phase-13-bug-reports.sql
-- Cross-workspace bug reports submitted from the in-app "Report a bug" modal.
-- Reporter context (workspace, profile, device) is captured at insert time so the
-- platform team can triage without asking the user follow-up questions.

create type public.bug_report_status as enum ('new', 'reviewing', 'resolved', 'wont_fix');

create table public.bug_reports (
  id uuid primary key default gen_random_uuid(),

  -- Reporter snapshot. Nullable so a future unauthenticated bug-report endpoint
  -- can still record submissions, and so deleting a profile doesn't cascade away
  -- the report itself.
  reporter_id uuid references public.profiles(id) on delete set null,
  reporter_name text,
  reporter_email text,
  workspace_id uuid references public.workspaces(id) on delete set null,

  -- The only field the user actually fills in.
  description text not null check (length(description) between 1 and 2000),

  -- Auto-captured device / browser context. All optional — never block a report
  -- because the browser refused to expose one of these fields.
  url text not null default '',
  user_agent text not null default '',
  platform text,
  language text,
  timezone text,
  viewport_width integer not null default 0,
  viewport_height integer not null default 0,
  screen_width integer not null default 0,
  screen_height integer not null default 0,
  device_pixel_ratio numeric(5, 2) not null default 1,

  status public.bug_report_status not null default 'new',
  created_at timestamptz not null default now()
);

create index bug_reports_status_created_idx on public.bug_reports (status, created_at desc);
create index bug_reports_workspace_idx on public.bug_reports (workspace_id);

-- RLS: a reporter can only see and create their own reports. Platform admins
-- can see and triage everything. Workspace admins do not get visibility — bug
-- reports are routed to the platform team, not the workspace.

alter table public.bug_reports enable row level security;

create policy bug_reports_self_read on public.bug_reports
  for select using (
    reporter_id = auth.uid() or private.is_platform_admin()
  );

create policy bug_reports_self_insert on public.bug_reports
  for insert with check (
    reporter_id = auth.uid() or reporter_id is null
  );

create policy bug_reports_platform_modify on public.bug_reports
  for update using (private.is_platform_admin())
  with check (private.is_platform_admin());

create policy bug_reports_platform_delete on public.bug_reports
  for delete using (private.is_platform_admin());

grant select, insert on public.bug_reports to authenticated;
grant select, insert, update, delete on public.bug_reports to authenticated;
