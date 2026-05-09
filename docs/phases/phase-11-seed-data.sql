-- phase-11-seed-data.sql
-- Bare-minimum production seed: one workspace + its three system roles.
--
-- Intentionally NO departments, categories, members, or requests. The first
-- workspace admin (created via /platform/workspaces) populates those through
-- the app — that exercises the same code paths real customers will hit.
--
-- Add additional workspaces below as your tenancy needs grow.

insert into public.workspaces (id, name, slug, description, created_by, created_at, updated_at) values
  ('10000000-0000-4000-a000-000000000001', 'Acme Studio', 'acme', 'Initial production workspace.', null, now(), now())
on conflict (slug) do nothing;

insert into public.workspace_roles (workspace_id, name, can_create, can_read, can_update, can_delete, can_manage_roles, is_system) values
  ('10000000-0000-4000-a000-000000000001', 'Admin',  true,  true, true,  true,  true,  true),
  ('10000000-0000-4000-a000-000000000001', 'Editor', true,  true, true,  false, false, true),
  ('10000000-0000-4000-a000-000000000001', 'Viewer', false, true, false, false, false, true)
on conflict (workspace_id, name) do nothing;
