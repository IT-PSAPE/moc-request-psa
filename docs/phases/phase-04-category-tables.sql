-- phase-04-category-tables.sql

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  label text not null,
  color_key text not null default 'blue',
  -- Nullable so an admin can stage a category before picking its routing dept.
  -- Once set, the dept can't be deleted while categories still reference it
  -- (mirrors the frontend deleteDepartment guard).
  default_department_id uuid references public.departments(id) on delete restrict,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  unique (workspace_id, label)
);
