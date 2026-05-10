-- phase-01-extensions-and-enums.sql
--
-- Idempotent project foundations:
--   • Required Postgres extensions (pgcrypto, uuid-ossp).
--   • The `private` schema (host for RLS predicate helpers + the column-
--     reconcile helpers used by phase-02).
--   • Every enum the project relies on.
--
-- Re-running this script against a project that already has these objects is
-- a no-op: extensions and the schema use IF NOT EXISTS, and each enum is
-- guarded by a pg_type lookup.

create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

create schema if not exists private;

do $$
begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where n.nspname = 'public' and t.typname = 'member_status') then
    create type public.member_status as enum ('pending', 'active', 'suspended', 'rejected');
  end if;

  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where n.nspname = 'public' and t.typname = 'request_status') then
    create type public.request_status as enum (
      'submitted',
      'triaged',
      'in_progress',
      'blocked',
      'completed',
      'archived',
      'rejected'
    );
  end if;

  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where n.nspname = 'public' and t.typname = 'request_priority') then
    create type public.request_priority as enum ('low', 'medium', 'high', 'urgent');
  end if;

  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where n.nspname = 'public' and t.typname = 'department_role') then
    create type public.department_role as enum ('lead', 'member');
  end if;

  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where n.nspname = 'public' and t.typname = 'activity_action') then
    create type public.activity_action as enum (
      'created',
      'status_changed',
      'priority_changed',
      'category_changed',
      'department_routed',
      'assignee_added',
      'assignee_removed',
      'field_updated',
      'comment_posted'
    );
  end if;

  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where n.nspname = 'public' and t.typname = 'submission_source') then
    create type public.submission_source as enum ('public_form', 'internal', 'import');
  end if;

  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where n.nspname = 'public' and t.typname = 'bug_report_status') then
    create type public.bug_report_status as enum ('new', 'reviewing', 'resolved', 'wont_fix');
  end if;
end $$;
