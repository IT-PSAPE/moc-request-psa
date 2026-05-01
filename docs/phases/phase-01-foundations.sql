-- phase-01-foundations.sql
-- Extensions, private schema, and enums.

create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

create schema if not exists private;

create type public.member_status as enum ('pending', 'active', 'suspended', 'rejected');

create type public.request_status as enum (
  'submitted',
  'triaged',
  'in_progress',
  'blocked',
  'completed',
  'archived',
  'rejected'
);

create type public.request_priority as enum ('low', 'medium', 'high', 'urgent');

create type public.department_role as enum ('lead', 'member');

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

create type public.submission_source as enum ('public_form', 'internal', 'import');
