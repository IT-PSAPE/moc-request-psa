-- phase-02-tables.sql
--
-- Idempotent table definitions with full column-level + constraint-level
-- reconciliation.
--
-- Behavior:
--   • Missing tables          → CREATE TABLE …
--   • Existing tables         → left in place; columns and constraints are
--                                reconciled individually:
--       - Missing columns are added with the desired type / default / NOT NULL.
--       - Existing columns whose type / default / nullability differ from the
--         canonical spec are ALTERed to match. ALTER attempts that would fail
--         on existing data (e.g. setting NOT NULL on a column with NULLs and
--         no default) raise a NOTICE and are skipped instead of aborting.
--       - Missing PK / FK / UNIQUE / CHECK constraints are added.
--   • Constraint NAMES match Postgres's auto-generated naming convention
--     (`<table>_<column>_<kind>`), so a fresh CREATE TABLE and a later
--     reconcile pass agree on which constraints already exist.
--
-- Run AFTER phase-01 (which creates the `private` schema and the enums these
-- tables reference).

-- ───────────────────────────────────────────────────────────────────────────
-- 1. Reconcile helpers (live in `private` so they're not exposed to anon).
-- ───────────────────────────────────────────────────────────────────────────

create or replace function private.reconcile_column(
  p_table regclass,
  p_column text,
  p_type text,
  p_not_null boolean default false,
  p_default text default null
) returns void
language plpgsql
as $$
declare
  v_attnum smallint;
  v_atttypid oid;
  v_attnotnull boolean;
  v_target_typeoid oid;
  v_current_default text;
begin
  -- Resolve the desired type to its OID via pg_typeof so 'public.member_status'
  -- and 'member_status' (after search_path lookup) compare equal.
  execute format('select pg_typeof(null::%s)::regtype::oid', p_type) into v_target_typeoid;

  select a.attnum, a.atttypid, a.attnotnull
    into v_attnum, v_atttypid, v_attnotnull
  from pg_attribute a
  where a.attrelid = p_table
    and a.attname = p_column
    and not a.attisdropped;

  if v_attnum is null then
    -- Column missing — add it with the full desired spec.
    execute format('alter table %s add column %I %s', p_table::text, p_column, p_type);
    if p_default is not null then
      execute format('alter table %s alter column %I set default %s',
                     p_table::text, p_column, p_default);
      execute format('update %s set %I = default where %I is null',
                     p_table::text, p_column, p_column);
    end if;
    if p_not_null then
      execute format('alter table %s alter column %I set not null',
                     p_table::text, p_column);
    end if;
    return;
  end if;

  -- Reconcile type.
  if v_atttypid <> v_target_typeoid then
    begin
      execute format('alter table %s alter column %I type %s using %I::text::%s',
                     p_table::text, p_column, p_type, p_column, p_type);
    exception when others then
      raise notice 'reconcile_column(%.%): skipped type change (% → %): %',
                   p_table, p_column, format_type(v_atttypid, null), p_type, sqlerrm;
    end;
  end if;

  -- Reconcile default.
  select pg_get_expr(d.adbin, d.adrelid)
    into v_current_default
  from pg_attrdef d
  where d.adrelid = p_table and d.adnum = v_attnum;

  if p_default is null and v_current_default is not null then
    execute format('alter table %s alter column %I drop default', p_table::text, p_column);
  elsif p_default is not null and (v_current_default is null or v_current_default <> p_default) then
    execute format('alter table %s alter column %I set default %s',
                   p_table::text, p_column, p_default);
  end if;

  -- Reconcile NOT NULL.
  if p_not_null and not v_attnotnull then
    begin
      if p_default is not null then
        execute format('update %s set %I = default where %I is null',
                       p_table::text, p_column, p_column);
      end if;
      execute format('alter table %s alter column %I set not null',
                     p_table::text, p_column);
    exception when others then
      raise notice 'reconcile_column(%.%): skipped set-not-null: %',
                   p_table, p_column, sqlerrm;
    end;
  elsif not p_not_null and v_attnotnull then
    execute format('alter table %s alter column %I drop not null',
                   p_table::text, p_column);
  end if;
end;
$$;

create or replace function private.reconcile_constraint(
  p_table regclass,
  p_name text,
  p_definition text
) returns void
language plpgsql
as $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = p_table and conname = p_name
  ) then
    execute format('alter table %s add constraint %I %s',
                   p_table::text, p_name, p_definition);
  end if;
end;
$$;

-- ───────────────────────────────────────────────────────────────────────────
-- 2. profiles
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  name text not null,
  surname text,
  status public.member_status not null default 'active',
  is_platform_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

select private.reconcile_column('public.profiles'::regclass, 'email',             'text',                 true,  null);
select private.reconcile_column('public.profiles'::regclass, 'name',              'text',                 true,  null);
select private.reconcile_column('public.profiles'::regclass, 'surname',           'text',                 false, null);
select private.reconcile_column('public.profiles'::regclass, 'status',            'public.member_status', true,  '''active''::member_status');
select private.reconcile_column('public.profiles'::regclass, 'is_platform_admin', 'boolean',              true,  'false');
select private.reconcile_column('public.profiles'::regclass, 'created_at',        'timestamptz',          true,  'now()');
select private.reconcile_column('public.profiles'::regclass, 'updated_at',        'timestamptz',          true,  'now()');

select private.reconcile_constraint('public.profiles'::regclass, 'profiles_email_key',
  'unique (email)');
select private.reconcile_constraint('public.profiles'::regclass, 'profiles_id_fkey',
  'foreign key (id) references auth.users(id) on delete cascade');

-- ───────────────────────────────────────────────────────────────────────────
-- 3. workspaces
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  description text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

select private.reconcile_column('public.workspaces'::regclass, 'name',        'text',        true,  null);
select private.reconcile_column('public.workspaces'::regclass, 'slug',        'text',        true,  null);
select private.reconcile_column('public.workspaces'::regclass, 'description', 'text',        false, null);
select private.reconcile_column('public.workspaces'::regclass, 'created_by',  'uuid',        false, null);
select private.reconcile_column('public.workspaces'::regclass, 'created_at',  'timestamptz', true,  'now()');
select private.reconcile_column('public.workspaces'::regclass, 'updated_at',  'timestamptz', true,  'now()');

select private.reconcile_constraint('public.workspaces'::regclass, 'workspaces_slug_key',
  'unique (slug)');
select private.reconcile_constraint('public.workspaces'::regclass, 'workspaces_slug_check',
  $c$check (slug ~ '^[a-z0-9-]+$')$c$);
select private.reconcile_constraint('public.workspaces'::regclass, 'workspaces_created_by_fkey',
  'foreign key (created_by) references public.profiles(id)');

-- ───────────────────────────────────────────────────────────────────────────
-- 4. workspace_roles
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.workspace_roles (
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

select private.reconcile_column('public.workspace_roles'::regclass, 'workspace_id',     'uuid',    true,  null);
select private.reconcile_column('public.workspace_roles'::regclass, 'name',             'text',    true,  null);
select private.reconcile_column('public.workspace_roles'::regclass, 'can_create',       'boolean', true,  'false');
select private.reconcile_column('public.workspace_roles'::regclass, 'can_read',         'boolean', true,  'true');
select private.reconcile_column('public.workspace_roles'::regclass, 'can_update',       'boolean', true,  'false');
select private.reconcile_column('public.workspace_roles'::regclass, 'can_delete',       'boolean', true,  'false');
select private.reconcile_column('public.workspace_roles'::regclass, 'can_manage_roles', 'boolean', true,  'false');
select private.reconcile_column('public.workspace_roles'::regclass, 'is_system',        'boolean', true,  'false');

select private.reconcile_constraint('public.workspace_roles'::regclass, 'workspace_roles_workspace_id_name_key',
  'unique (workspace_id, name)');
select private.reconcile_constraint('public.workspace_roles'::regclass, 'workspace_roles_id_workspace_id_key',
  'unique (id, workspace_id)');
select private.reconcile_constraint('public.workspace_roles'::regclass, 'workspace_roles_workspace_id_fkey',
  'foreign key (workspace_id) references public.workspaces(id) on delete cascade');

-- ───────────────────────────────────────────────────────────────────────────
-- 5. workspace_members
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.workspace_members (
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

select private.reconcile_column('public.workspace_members'::regclass, 'workspace_id',      'uuid',                 true,  null);
select private.reconcile_column('public.workspace_members'::regclass, 'user_id',           'uuid',                 true,  null);
select private.reconcile_column('public.workspace_members'::regclass, 'status',            'public.member_status', true,  '''pending''::member_status');
select private.reconcile_column('public.workspace_members'::regclass, 'workspace_role_id', 'uuid',                 false, null);
select private.reconcile_column('public.workspace_members'::regclass, 'requested_at',      'timestamptz',          true,  'now()');
select private.reconcile_column('public.workspace_members'::regclass, 'approved_at',       'timestamptz',          false, null);
select private.reconcile_column('public.workspace_members'::regclass, 'approved_by',       'uuid',                 false, null);

select private.reconcile_constraint('public.workspace_members'::regclass, 'workspace_members_workspace_id_user_id_key',
  'unique (workspace_id, user_id)');
select private.reconcile_constraint('public.workspace_members'::regclass, 'workspace_members_workspace_id_fkey',
  'foreign key (workspace_id) references public.workspaces(id) on delete cascade');
select private.reconcile_constraint('public.workspace_members'::regclass, 'workspace_members_user_id_fkey',
  'foreign key (user_id) references public.profiles(id) on delete cascade');
select private.reconcile_constraint('public.workspace_members'::regclass, 'workspace_members_workspace_role_id_fkey',
  'foreign key (workspace_role_id) references public.workspace_roles(id)');
select private.reconcile_constraint('public.workspace_members'::regclass, 'workspace_members_workspace_role_scope_fkey',
  'foreign key (workspace_role_id, workspace_id) references public.workspace_roles(id, workspace_id)');
select private.reconcile_constraint('public.workspace_members'::regclass, 'workspace_members_approved_by_fkey',
  'foreign key (approved_by) references public.profiles(id)');

-- ───────────────────────────────────────────────────────────────────────────
-- 6. departments
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  description text,
  color_key text not null default 'blue',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, name)
);

select private.reconcile_column('public.departments'::regclass, 'workspace_id', 'uuid',        true,  null);
select private.reconcile_column('public.departments'::regclass, 'name',         'text',        true,  null);
select private.reconcile_column('public.departments'::regclass, 'description',  'text',        false, null);
select private.reconcile_column('public.departments'::regclass, 'color_key',    'text',        true,  '''blue''::text');
select private.reconcile_column('public.departments'::regclass, 'sort_order',   'integer',     true,  '0');
select private.reconcile_column('public.departments'::regclass, 'created_at',   'timestamptz', true,  'now()');
select private.reconcile_column('public.departments'::regclass, 'updated_at',   'timestamptz', true,  'now()');

select private.reconcile_constraint('public.departments'::regclass, 'departments_workspace_id_name_key',
  'unique (workspace_id, name)');
select private.reconcile_constraint('public.departments'::regclass, 'departments_id_workspace_id_key',
  'unique (id, workspace_id)');
select private.reconcile_constraint('public.departments'::regclass, 'departments_workspace_id_fkey',
  'foreign key (workspace_id) references public.workspaces(id) on delete cascade');

-- ───────────────────────────────────────────────────────────────────────────
-- 7. department_members (composite PK; no `id` column)
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.department_members (
  department_id uuid not null references public.departments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.department_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (department_id, user_id)
);

select private.reconcile_column('public.department_members'::regclass, 'department_id', 'uuid',                   true,  null);
select private.reconcile_column('public.department_members'::regclass, 'user_id',       'uuid',                   true,  null);
select private.reconcile_column('public.department_members'::regclass, 'role',          'public.department_role', true,  '''member''::department_role');
select private.reconcile_column('public.department_members'::regclass, 'created_at',    'timestamptz',            true,  'now()');

select private.reconcile_constraint('public.department_members'::regclass, 'department_members_department_id_fkey',
  'foreign key (department_id) references public.departments(id) on delete cascade');
select private.reconcile_constraint('public.department_members'::regclass, 'department_members_user_id_fkey',
  'foreign key (user_id) references public.profiles(id) on delete cascade');

-- ───────────────────────────────────────────────────────────────────────────
-- 8. categories
-- ───────────────────────────────────────────────────────────────────────────
-- default_department_id is nullable so an admin can stage a category before
-- picking its routing department; once set, the dept can't be deleted while
-- categories still reference it (mirrors the frontend deleteDepartment guard).
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  label text not null,
  color_key text not null default 'blue',
  default_department_id uuid references public.departments(id) on delete restrict,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  unique (workspace_id, label)
);

select private.reconcile_column('public.categories'::regclass, 'workspace_id',          'uuid',    true,  null);
select private.reconcile_column('public.categories'::regclass, 'label',                 'text',    true,  null);
select private.reconcile_column('public.categories'::regclass, 'color_key',             'text',    true,  '''blue''::text');
select private.reconcile_column('public.categories'::regclass, 'default_department_id', 'uuid',    false, null);
select private.reconcile_column('public.categories'::regclass, 'sort_order',            'integer', true,  '0');
select private.reconcile_column('public.categories'::regclass, 'is_active',             'boolean', true,  'true');

select private.reconcile_constraint('public.categories'::regclass, 'categories_workspace_id_label_key',
  'unique (workspace_id, label)');
select private.reconcile_constraint('public.categories'::regclass, 'categories_id_workspace_id_key',
  'unique (id, workspace_id)');
select private.reconcile_constraint('public.categories'::regclass, 'categories_workspace_id_fkey',
  'foreign key (workspace_id) references public.workspaces(id) on delete cascade');
select private.reconcile_constraint('public.categories'::regclass, 'categories_default_department_id_fkey',
  'foreign key (default_department_id) references public.departments(id) on delete restrict');
select private.reconcile_constraint('public.categories'::regclass, 'categories_default_department_scope_fkey',
  'foreign key (default_department_id, workspace_id) references public.departments(id, workspace_id) on delete restrict');

-- ───────────────────────────────────────────────────────────────────────────
-- 9. requests
-- ───────────────────────────────────────────────────────────────────────────
-- department_id is required: every request is routed at submit time. The
-- frontend refuses to delete a department that still has requests; the
-- on-delete-restrict FK is the DB-level guard that mirrors that contract.
create table if not exists public.requests (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  tracking_id text not null unique,
  title text not null,
  category_id uuid references public.categories(id) on delete set null,
  department_id uuid not null references public.departments(id) on delete restrict,
  priority public.request_priority not null default 'medium',
  status public.request_status not null default 'submitted',
  due_date timestamptz,
  requested_by_name text not null,
  requested_by_email text,
  submitted_by_user_id uuid references public.profiles(id) on delete set null,
  source public.submission_source not null default 'internal',
  who text not null default '',
  what text not null default '',
  when_text text not null default '',
  where_text text not null default '',
  why text not null default '',
  how text not null default '',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

select private.reconcile_column('public.requests'::regclass, 'workspace_id',         'uuid',                     true,  null);
select private.reconcile_column('public.requests'::regclass, 'tracking_id',          'text',                     true,  null);
select private.reconcile_column('public.requests'::regclass, 'title',                'text',                     true,  null);
select private.reconcile_column('public.requests'::regclass, 'category_id',          'uuid',                     false, null);
select private.reconcile_column('public.requests'::regclass, 'department_id',        'uuid',                     true,  null);
select private.reconcile_column('public.requests'::regclass, 'priority',             'public.request_priority',  true,  '''medium''::request_priority');
select private.reconcile_column('public.requests'::regclass, 'status',               'public.request_status',    true,  '''submitted''::request_status');
select private.reconcile_column('public.requests'::regclass, 'due_date',             'timestamptz',              false, null);
select private.reconcile_column('public.requests'::regclass, 'requested_by_name',    'text',                     true,  null);
select private.reconcile_column('public.requests'::regclass, 'requested_by_email',   'text',                     false, null);
select private.reconcile_column('public.requests'::regclass, 'submitted_by_user_id', 'uuid',                     false, null);
select private.reconcile_column('public.requests'::regclass, 'source',               'public.submission_source', true,  '''internal''::submission_source');
select private.reconcile_column('public.requests'::regclass, 'who',                  'text',                     true,  $c$''::text$c$);
select private.reconcile_column('public.requests'::regclass, 'what',                 'text',                     true,  $c$''::text$c$);
select private.reconcile_column('public.requests'::regclass, 'when_text',            'text',                     true,  $c$''::text$c$);
select private.reconcile_column('public.requests'::regclass, 'where_text',           'text',                     true,  $c$''::text$c$);
select private.reconcile_column('public.requests'::regclass, 'why',                  'text',                     true,  $c$''::text$c$);
select private.reconcile_column('public.requests'::regclass, 'how',                  'text',                     true,  $c$''::text$c$);
select private.reconcile_column('public.requests'::regclass, 'notes',                'text',                     false, null);
select private.reconcile_column('public.requests'::regclass, 'created_at',           'timestamptz',              true,  'now()');
select private.reconcile_column('public.requests'::regclass, 'updated_at',           'timestamptz',              true,  'now()');

select private.reconcile_constraint('public.requests'::regclass, 'requests_tracking_id_key',
  'unique (tracking_id)');
select private.reconcile_constraint('public.requests'::regclass, 'requests_workspace_id_fkey',
  'foreign key (workspace_id) references public.workspaces(id) on delete cascade');
select private.reconcile_constraint('public.requests'::regclass, 'requests_category_id_fkey',
  'foreign key (category_id) references public.categories(id) on delete set null');
select private.reconcile_constraint('public.requests'::regclass, 'requests_category_scope_fkey',
  'foreign key (category_id, workspace_id) references public.categories(id, workspace_id) on delete set null');
select private.reconcile_constraint('public.requests'::regclass, 'requests_department_id_fkey',
  'foreign key (department_id) references public.departments(id) on delete restrict');
select private.reconcile_constraint('public.requests'::regclass, 'requests_department_scope_fkey',
  'foreign key (department_id, workspace_id) references public.departments(id, workspace_id) on delete restrict');
select private.reconcile_constraint('public.requests'::regclass, 'requests_submitted_by_user_id_fkey',
  'foreign key (submitted_by_user_id) references public.profiles(id) on delete set null');

-- ───────────────────────────────────────────────────────────────────────────
-- 10. request_assignees
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.request_assignees (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  duty text not null default 'assignee',
  created_at timestamptz not null default now(),
  unique (request_id, user_id)
);

select private.reconcile_column('public.request_assignees'::regclass, 'request_id', 'uuid',        true,  null);
select private.reconcile_column('public.request_assignees'::regclass, 'user_id',    'uuid',        true,  null);
select private.reconcile_column('public.request_assignees'::regclass, 'duty',       'text',        true,  '''assignee''::text');
select private.reconcile_column('public.request_assignees'::regclass, 'created_at', 'timestamptz', true,  'now()');

select private.reconcile_constraint('public.request_assignees'::regclass, 'request_assignees_request_id_user_id_key',
  'unique (request_id, user_id)');
select private.reconcile_constraint('public.request_assignees'::regclass, 'request_assignees_request_id_fkey',
  'foreign key (request_id) references public.requests(id) on delete cascade');
select private.reconcile_constraint('public.request_assignees'::regclass, 'request_assignees_user_id_fkey',
  'foreign key (user_id) references public.profiles(id) on delete cascade');

-- ───────────────────────────────────────────────────────────────────────────
-- 11. comments
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (length(body) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

select private.reconcile_column('public.comments'::regclass, 'request_id', 'uuid',        true,  null);
select private.reconcile_column('public.comments'::regclass, 'author_id',  'uuid',        true,  null);
select private.reconcile_column('public.comments'::regclass, 'body',       'text',        true,  null);
select private.reconcile_column('public.comments'::regclass, 'created_at', 'timestamptz', true,  'now()');
select private.reconcile_column('public.comments'::regclass, 'updated_at', 'timestamptz', true,  'now()');

select private.reconcile_constraint('public.comments'::regclass, 'comments_body_check',
  'check (length(body) > 0)');
select private.reconcile_constraint('public.comments'::regclass, 'comments_request_id_fkey',
  'foreign key (request_id) references public.requests(id) on delete cascade');
select private.reconcile_constraint('public.comments'::regclass, 'comments_author_id_fkey',
  'foreign key (author_id) references public.profiles(id) on delete cascade');

-- ───────────────────────────────────────────────────────────────────────────
-- 12. activity_logs
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  action public.activity_action not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

select private.reconcile_column('public.activity_logs'::regclass, 'request_id', 'uuid',                   true,  null);
select private.reconcile_column('public.activity_logs'::regclass, 'actor_id',   'uuid',                   false, null);
select private.reconcile_column('public.activity_logs'::regclass, 'action',     'public.activity_action', true,  null);
select private.reconcile_column('public.activity_logs'::regclass, 'payload',    'jsonb',                  true,  $c$'{}'::jsonb$c$);
select private.reconcile_column('public.activity_logs'::regclass, 'created_at', 'timestamptz',            true,  'now()');

select private.reconcile_constraint('public.activity_logs'::regclass, 'activity_logs_request_id_fkey',
  'foreign key (request_id) references public.requests(id) on delete cascade');
select private.reconcile_constraint('public.activity_logs'::regclass, 'activity_logs_actor_id_fkey',
  'foreign key (actor_id) references public.profiles(id) on delete set null');

-- ───────────────────────────────────────────────────────────────────────────
-- 13. bug_reports
-- ───────────────────────────────────────────────────────────────────────────
-- Cross-workspace bug reports submitted from the in-app "Report a bug" modal.
-- Reporter context is captured at insert time so the platform team can triage
-- without asking the user follow-up questions.
create table if not exists public.bug_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles(id) on delete set null,
  reporter_name text,
  reporter_email text,
  workspace_id uuid references public.workspaces(id) on delete set null,
  description text not null check (length(description) between 1 and 2000),
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

select private.reconcile_column('public.bug_reports'::regclass, 'reporter_id',        'uuid',                      false, null);
select private.reconcile_column('public.bug_reports'::regclass, 'reporter_name',      'text',                      false, null);
select private.reconcile_column('public.bug_reports'::regclass, 'reporter_email',     'text',                      false, null);
select private.reconcile_column('public.bug_reports'::regclass, 'workspace_id',       'uuid',                      false, null);
select private.reconcile_column('public.bug_reports'::regclass, 'description',        'text',                      true,  null);
select private.reconcile_column('public.bug_reports'::regclass, 'url',                'text',                      true,  $c$''::text$c$);
select private.reconcile_column('public.bug_reports'::regclass, 'user_agent',         'text',                      true,  $c$''::text$c$);
select private.reconcile_column('public.bug_reports'::regclass, 'platform',           'text',                      false, null);
select private.reconcile_column('public.bug_reports'::regclass, 'language',           'text',                      false, null);
select private.reconcile_column('public.bug_reports'::regclass, 'timezone',           'text',                      false, null);
select private.reconcile_column('public.bug_reports'::regclass, 'viewport_width',     'integer',                   true,  '0');
select private.reconcile_column('public.bug_reports'::regclass, 'viewport_height',    'integer',                   true,  '0');
select private.reconcile_column('public.bug_reports'::regclass, 'screen_width',       'integer',                   true,  '0');
select private.reconcile_column('public.bug_reports'::regclass, 'screen_height',      'integer',                   true,  '0');
select private.reconcile_column('public.bug_reports'::regclass, 'device_pixel_ratio', 'numeric(5,2)',              true,  '1');
select private.reconcile_column('public.bug_reports'::regclass, 'status',             'public.bug_report_status', true,  '''new''::bug_report_status');
select private.reconcile_column('public.bug_reports'::regclass, 'created_at',         'timestamptz',              true,  'now()');

select private.reconcile_constraint('public.bug_reports'::regclass, 'bug_reports_description_check',
  'check (length(description) between 1 and 2000)');
select private.reconcile_constraint('public.bug_reports'::regclass, 'bug_reports_reporter_id_fkey',
  'foreign key (reporter_id) references public.profiles(id) on delete set null');
select private.reconcile_constraint('public.bug_reports'::regclass, 'bug_reports_workspace_id_fkey',
  'foreign key (workspace_id) references public.workspaces(id) on delete set null');
