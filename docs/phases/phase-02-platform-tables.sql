-- phase-02-platform-tables.sql
-- profiles + workspaces + workspace_roles + workspace_members.

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  name text not null,
  surname text,
  status public.member_status not null default 'active',
  is_platform_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  description text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_roles (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  can_create boolean not null default false,
  can_read boolean not null default true,
  can_update boolean not null default false,
  can_delete boolean not null default false,
  can_manage_roles boolean not null default false,
  is_system boolean not null default false,
  unique (workspace_id, name)
);

create table public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status public.member_status not null default 'pending',
  workspace_role_id uuid references public.workspace_roles(id),
  requested_at timestamptz not null default now(),
  approved_at timestamptz,
  approved_by uuid references public.profiles(id),
  unique (workspace_id, user_id)
);
