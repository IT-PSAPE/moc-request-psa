-- Patch: let workspace admins update their workspace's name/description.
--
-- Context: the admin settings page (src/screens/admin/settings/page.tsx) is
-- gated on role.canManageRoles, so any workspace admin can open it and submit
-- a name/description change via updateWorkspace(). But the RLS policy
-- `workspaces_modify` was `for all using (is_platform_admin())`, so the write
-- was rejected for anyone who isn't a PLATFORM admin. Result: workspace admins
-- saw "Save failed" and the name never changed.
--
-- This patch:
--   • Keeps platform-admin full write (insert / update / delete) on workspaces.
--   • Adds an UPDATE policy for workspace admins (is_workspace_admin(id)), so
--     they can edit their own workspace. Insert/delete stay platform-only.
--   • Scopes the authenticated UPDATE grant to (name, description) so neither
--     workspace admins nor anyone else can change the platform-managed slug
--     (or id / created_by / timestamps) via a direct API call. Nothing in the
--     app updates slug post-creation, so this breaks nothing.
--
-- Folded into docs/phases/phase-05-rls-and-grants.sql going forward. Idempotent:
-- policies are dropped before recreate and the grants are re-derived, so
-- re-running against a current database is a no-op.

-- platform admins: full write (insert / update / delete).
drop policy if exists workspaces_modify on public.workspaces;
create policy workspaces_modify on public.workspaces
  for all using (private.is_platform_admin())
  with check (private.is_platform_admin());

-- workspace admins: may update their own workspace (name/description only,
-- enforced by the column grant below).
drop policy if exists workspaces_admin_update on public.workspaces;
create policy workspaces_admin_update on public.workspaces
  for update using (private.is_workspace_admin(id))
  with check (private.is_workspace_admin(id));

-- Restrict which columns authenticated users may update; slug stays
-- platform-managed.
revoke update on public.workspaces from authenticated;
grant update (name, description) on public.workspaces to authenticated;
