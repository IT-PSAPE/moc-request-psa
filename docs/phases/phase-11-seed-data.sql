-- phase-11-seed-data.sql
-- Mirrors src/data/mocks/*.json so the swap from mock to real Supabase is data-faithful.
-- Run AFTER all auth.users for these emails have been provisioned.
-- This is a partial sample — generate full INSERT statements from the mock JSON when promoting.

insert into public.workspaces (id, name, slug, description, created_by, created_at, updated_at) values
  ('10000000-0000-4000-a000-000000000001', 'Acme Studio', 'acme', 'Sample multi-department production workspace.', null, now(), now()),
  ('10000000-0000-4000-a000-000000000002', 'Northwind Productions', 'northwind', 'Second example workspace for testing multi-tenancy.', null, now(), now())
on conflict (slug) do nothing;

insert into public.workspace_roles (workspace_id, name, can_create, can_read, can_update, can_delete, can_manage_roles, is_system) values
  ('10000000-0000-4000-a000-000000000001', 'Admin',  true, true, true, true, true, true),
  ('10000000-0000-4000-a000-000000000001', 'Editor', true, true, true, false, false, true),
  ('10000000-0000-4000-a000-000000000001', 'Viewer', false, true, false, false, false, true),
  ('10000000-0000-4000-a000-000000000002', 'Admin',  true, true, true, true, true, true),
  ('10000000-0000-4000-a000-000000000002', 'Editor', true, true, true, false, false, true),
  ('10000000-0000-4000-a000-000000000002', 'Viewer', false, true, false, false, false, true)
on conflict (workspace_id, name) do nothing;

insert into public.departments (id, workspace_id, name, description, color_key, sort_order) values
  ('40000000-0000-4000-a000-000000000001', '10000000-0000-4000-a000-000000000001', 'Production', 'Video shoots, cameras, audio.', 'blue', 0),
  ('40000000-0000-4000-a000-000000000002', '10000000-0000-4000-a000-000000000001', 'Design', 'Graphics, motion, branding.', 'purple', 1),
  ('40000000-0000-4000-a000-000000000003', '10000000-0000-4000-a000-000000000001', 'Events', 'Live events and on-site coverage.', 'green', 2),
  ('40000000-0000-4000-a000-000000000011', '10000000-0000-4000-a000-000000000002', 'Editorial', 'Writing and proofing.', 'orange', 0),
  ('40000000-0000-4000-a000-000000000012', '10000000-0000-4000-a000-000000000002', 'Field Ops', 'On-location production.', 'teal', 1)
on conflict (workspace_id, name) do nothing;

insert into public.categories (id, workspace_id, label, color_key, default_department_id, sort_order, is_active) values
  ('60000000-0000-4000-a000-000000000001', '10000000-0000-4000-a000-000000000001', 'Video production', 'blue', '40000000-0000-4000-a000-000000000001', 0, true),
  ('60000000-0000-4000-a000-000000000002', '10000000-0000-4000-a000-000000000001', 'Graphic design', 'purple', '40000000-0000-4000-a000-000000000002', 1, true),
  ('60000000-0000-4000-a000-000000000003', '10000000-0000-4000-a000-000000000001', 'Live event', 'green', '40000000-0000-4000-a000-000000000003', 2, true),
  ('60000000-0000-4000-a000-000000000011', '10000000-0000-4000-a000-000000000002', 'Article', 'orange', '40000000-0000-4000-a000-000000000011', 0, true),
  ('60000000-0000-4000-a000-000000000012', '10000000-0000-4000-a000-000000000002', 'Field shoot', 'teal', '40000000-0000-4000-a000-000000000012', 1, true)
on conflict (workspace_id, label) do nothing;
