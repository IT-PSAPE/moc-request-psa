-- phase-00-nuke.sql
-- DEV-ONLY. Drops every object created by later phases. Run with care.

drop table if exists public.bug_reports cascade;
drop table if exists public.activity_logs cascade;
drop table if exists public.comments cascade;
drop table if exists public.request_assignees cascade;
drop table if exists public.requests cascade;
drop table if exists public.categories cascade;
drop table if exists public.department_members cascade;
drop table if exists public.departments cascade;
drop table if exists public.workspace_members cascade;
drop table if exists public.workspace_roles cascade;
drop table if exists public.workspaces cascade;
drop table if exists public.profiles cascade;

drop type if exists public.bug_report_status cascade;
drop type if exists public.member_status cascade;
drop type if exists public.request_status cascade;
drop type if exists public.request_priority cascade;
drop type if exists public.department_role cascade;
drop type if exists public.activity_action cascade;
drop type if exists public.submission_source cascade;

drop function if exists public.submit_public_request(uuid, uuid, jsonb) cascade;
drop function if exists public.lookup_request_by_tracking_id(text) cascade;
drop function if exists public.approve_workspace_member(uuid, uuid) cascade;
drop function if exists public.generate_tracking_id() cascade;
drop function if exists public.touch_updated_at() cascade;
drop function if exists public.requests_after_insert() cascade;
drop function if exists public.requests_after_update() cascade;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.lookup_workspace_by_slug(text) cascade;
drop function if exists public.list_public_categories(uuid) cascade;

drop function if exists private.current_workspace_role(uuid) cascade;
drop function if exists private.is_workspace_admin(uuid) cascade;
drop function if exists private.is_platform_admin() cascade;
drop function if exists private.is_department_member(uuid) cascade;
drop function if exists private.is_department_lead(uuid) cascade;

drop schema if exists private cascade;
