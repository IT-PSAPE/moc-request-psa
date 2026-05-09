-- phase-15-public-lookups.sql
-- Anonymous users need to resolve a workspace from its URL slug (for both
-- /submit/<slug> and /signup/<slug>) and list a workspace's active categories
-- (for the public submit form). RLS on `workspaces` and `categories` requires
-- an active membership, so direct table reads from `anon` return nothing.
--
-- Two SECURITY DEFINER RPCs solve this without loosening table-level RLS:
--   • lookup_workspace_by_slug(p_slug)   — returns id, name, slug, description
--   • list_public_categories(p_workspace_id) — returns active categories only

create or replace function public.lookup_workspace_by_slug(p_slug text)
returns table (
  id uuid,
  name text,
  slug text,
  description text
)
language sql
security definer
set search_path = public, pg_temp
as $$
  select w.id, w.name, w.slug, w.description
  from public.workspaces w
  where w.slug = lower(trim(p_slug))
$$;

create or replace function public.list_public_categories(p_workspace_id uuid)
returns table (
  id uuid,
  workspace_id uuid,
  label text,
  color_key text,
  default_department_id uuid,
  sort_order integer,
  is_active boolean
)
language sql
security definer
set search_path = public, pg_temp
as $$
  select c.id, c.workspace_id, c.label, c.color_key, c.default_department_id, c.sort_order, c.is_active
  from public.categories c
  where c.workspace_id = p_workspace_id
    and c.is_active = true
  order by c.sort_order asc
$$;

grant execute on function public.lookup_workspace_by_slug(text) to anon, authenticated;
grant execute on function public.list_public_categories(uuid) to anon, authenticated;
