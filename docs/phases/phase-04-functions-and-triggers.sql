-- phase-04-functions-and-triggers.sql
--
-- Every function, trigger, RPC, and the realtime publication setup, in one
-- dependency-correct order:
--
--   1. RLS predicate helpers in `private`            (used by RLS in phase-05
--                                                      and by the RPCs below).
--   2. Public utility functions / triggers           (touch_updated_at,
--                                                      generate_tracking_id,
--                                                      requests_after_*).
--   3. The auth.users → public.profiles signup hook  (handle_new_user).
--   4. Public security-definer RPCs.
--   5. Realtime publication memberships.
--
-- All functions use CREATE OR REPLACE; every trigger is dropped before
-- recreate so the script is idempotent on re-run.

-- ───────────────────────────────────────────────────────────────────────────
-- 1. Private helpers (RLS predicate functions).
-- ───────────────────────────────────────────────────────────────────────────

create or replace function private.current_workspace_role(target_workspace uuid)
returns public.workspace_roles
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select r.*
  from public.workspace_members m
  join public.workspace_roles r
    on r.id = m.workspace_role_id
   and r.workspace_id = m.workspace_id
  where m.user_id = auth.uid()
    and m.workspace_id = target_workspace
    and m.status = 'active'
  limit 1;
$$;

create or replace function private.is_workspace_admin(target_workspace uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce((
    select can_manage_roles
    from private.current_workspace_role(target_workspace)
  ), false);
$$;

create or replace function private.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (select is_platform_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

create or replace function private.is_department_member(target_department uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.department_members
    where user_id = auth.uid() and department_id = target_department
  );
$$;

create or replace function private.is_department_lead(target_department uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.department_members
    where user_id = auth.uid()
      and department_id = target_department
      and role = 'lead'
  );
$$;

-- ───────────────────────────────────────────────────────────────────────────
-- 2. Public utility functions + their triggers.
-- ───────────────────────────────────────────────────────────────────────────

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at before update on public.profiles
  for each row execute procedure public.touch_updated_at();

drop trigger if exists trg_workspaces_updated_at on public.workspaces;
create trigger trg_workspaces_updated_at before update on public.workspaces
  for each row execute procedure public.touch_updated_at();

drop trigger if exists trg_departments_updated_at on public.departments;
create trigger trg_departments_updated_at before update on public.departments
  for each row execute procedure public.touch_updated_at();

drop trigger if exists trg_requests_updated_at on public.requests;
create trigger trg_requests_updated_at before update on public.requests
  for each row execute procedure public.touch_updated_at();

drop trigger if exists trg_comments_updated_at on public.comments;
create trigger trg_comments_updated_at before update on public.comments
  for each row execute procedure public.touch_updated_at();

-- Crockford base32 alphabet, 8 chars, retry on collision.
create or replace function public.generate_tracking_id()
returns text
language plpgsql
as $$
declare
  alphabet text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  result text;
  i integer;
  attempts integer := 0;
begin
  loop
    result := '';
    for i in 1..8 loop
      result := result || substr(alphabet, 1 + (random() * 31)::int, 1);
    end loop;
    exit when not exists (select 1 from public.requests where tracking_id = result);
    attempts := attempts + 1;
    if attempts > 10 then
      raise exception 'Could not allocate tracking_id after 10 attempts';
    end if;
  end loop;
  return result;
end;
$$;

-- Auto-emit 'created' and 'department_routed' on insert. Every request is
-- routed at submit time (department_id is NOT NULL), so the routing log is
-- unconditional. SECURITY DEFINER so the trigger's writes to activity_logs
-- aren't subject to the caller's RLS — these emits are server-authoritative.
create or replace function public.requests_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.activity_logs (request_id, actor_id, action, payload)
  values (
    new.id,
    new.submitted_by_user_id,
    'created',
    jsonb_build_object(
      'source', new.source::text,
      'requestedByName', new.requested_by_name
    )
  );
  insert into public.activity_logs (request_id, actor_id, action, payload)
  values (
    new.id,
    new.submitted_by_user_id,
    'department_routed',
    jsonb_build_object('fromId', null, 'toId', new.department_id)
  );
  return new;
end;
$$;

drop trigger if exists trg_requests_after_insert on public.requests;
create trigger trg_requests_after_insert
  after insert on public.requests
  for each row execute procedure public.requests_after_insert();

-- Status / priority / department / category change → activity_logs.
-- SECURITY DEFINER for the same reason as requests_after_insert above.
create or replace function public.requests_after_update()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if old.status is distinct from new.status then
    insert into public.activity_logs (request_id, actor_id, action, payload)
    values (new.id, auth.uid(), 'status_changed',
      jsonb_build_object('from', old.status::text, 'to', new.status::text));
  end if;
  if old.priority is distinct from new.priority then
    insert into public.activity_logs (request_id, actor_id, action, payload)
    values (new.id, auth.uid(), 'priority_changed',
      jsonb_build_object('from', old.priority::text, 'to', new.priority::text));
  end if;
  if old.category_id is distinct from new.category_id then
    insert into public.activity_logs (request_id, actor_id, action, payload)
    values (new.id, auth.uid(), 'category_changed',
      jsonb_build_object('fromId', old.category_id, 'toId', new.category_id));
  end if;
  if old.department_id is distinct from new.department_id then
    insert into public.activity_logs (request_id, actor_id, action, payload)
    values (new.id, auth.uid(), 'department_routed',
      jsonb_build_object('fromId', old.department_id, 'toId', new.department_id));
  end if;
  return new;
end;
$$;

drop trigger if exists trg_requests_after_update on public.requests;
create trigger trg_requests_after_update
  after update on public.requests
  for each row execute procedure public.requests_after_update();

-- ───────────────────────────────────────────────────────────────────────────
-- 3. Auth signup hook.
--
-- Goals (tightened from the previous version after a bug where a profile was
-- created but the matching workspace_members row was missing):
--   • Creating a profile is unconditional and never blocks signup.
--   • Workspace-membership creation is best-effort: if the metadata is missing
--     or inconsistent we RAISE NOTICE and return successfully, instead of
--     aborting the auth.users insert.
--   • Both `pending_workspace_id` (UUID) and `pending_workspace_slug` (string)
--     are accepted in raw_user_meta_data, so a caller that forgot to resolve
--     the slug ahead of time still ends up with the right membership.
-- ───────────────────────────────────────────────────────────────────────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_workspace_id uuid;
  v_workspace_slug text;
  v_workspace_exists boolean;
begin
  -- Always insert the profile. Never let this branch fail loud — auth signup
  -- should not be blocked by a downstream profile race.
  begin
    insert into public.profiles (id, email, name, surname)
    values (
      new.id,
      new.email,
      coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), split_part(new.email, '@', 1)),
      nullif(trim(new.raw_user_meta_data ->> 'surname'), '')
    )
    on conflict (id) do nothing;
  exception when others then
    raise notice 'handle_new_user(%): profile insert failed: %', new.id, sqlerrm;
    return new;
  end;

  -- Resolve a workspace from metadata. Try the explicit UUID first; fall back
  -- to slug lookup if the caller passed only the slug.
  v_workspace_id := nullif(trim(new.raw_user_meta_data ->> 'pending_workspace_id'), '')::uuid;

  if v_workspace_id is null then
    v_workspace_slug := nullif(trim(new.raw_user_meta_data ->> 'pending_workspace_slug'), '');
    if v_workspace_slug is not null then
      select id into v_workspace_id
      from public.workspaces
      where slug = lower(v_workspace_slug)
      limit 1;
    end if;
  end if;

  if v_workspace_id is null then
    -- Common case: someone created a user via the Supabase dashboard (no
    -- metadata) or hit /signup without a workspace context. The profile is
    -- in place; an admin can grant membership later.
    raise notice 'handle_new_user(%): no workspace context in metadata; skipping workspace_members insert', new.id;
    return new;
  end if;

  -- Verify the workspace actually exists before inserting the membership —
  -- otherwise an FK violation would abort the entire auth signup.
  select exists (select 1 from public.workspaces where id = v_workspace_id)
    into v_workspace_exists;
  if not v_workspace_exists then
    raise notice 'handle_new_user(%): workspace % not found; skipping workspace_members insert',
                 new.id, v_workspace_id;
    return new;
  end if;

  begin
    insert into public.workspace_members (workspace_id, user_id, status)
    values (v_workspace_id, new.id, 'pending')
    on conflict (workspace_id, user_id) do nothing;
  exception when others then
    raise notice 'handle_new_user(%): workspace_members insert failed (workspace %): %',
                 new.id, v_workspace_id, sqlerrm;
  end;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ───────────────────────────────────────────────────────────────────────────
-- 4. Public security-definer RPCs.
-- ───────────────────────────────────────────────────────────────────────────

create or replace function public.submit_public_request(
  p_workspace_id uuid,
  p_category_id uuid,
  p_payload jsonb
) returns table(tracking_id text, request_id uuid)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_workspace public.workspaces;
  v_category public.categories;
  v_tracking_id text;
  v_id uuid;
begin
  select * into v_workspace from public.workspaces where id = p_workspace_id;
  if v_workspace is null then raise exception 'Workspace not found'; end if;

  select * into v_category from public.categories where id = p_category_id;
  if v_category is null or v_category.workspace_id != p_workspace_id then
    raise exception 'Category not found in workspace';
  end if;
  if not v_category.is_active then
    raise exception 'Category not accepting submissions';
  end if;
  if v_category.default_department_id is null then
    raise exception 'Category has no default department — ask the workspace admin to configure routing';
  end if;

  v_tracking_id := public.generate_tracking_id();
  v_id := gen_random_uuid();

  insert into public.requests (
    id, workspace_id, tracking_id, title,
    category_id, department_id,
    priority, status,
    due_date,
    requested_by_name, requested_by_email,
    submitted_by_user_id, source,
    who, what, when_text, where_text, why, how,
    notes
  ) values (
    v_id,
    p_workspace_id,
    v_tracking_id,
    coalesce(p_payload->>'title', ''),
    p_category_id,
    v_category.default_department_id,
    coalesce((p_payload->>'priority')::public.request_priority, 'medium'),
    'submitted',
    nullif(p_payload->>'dueDate', '')::timestamptz,
    coalesce(p_payload->>'requestedByName', ''),
    nullif(p_payload->>'requestedByEmail', ''),
    null,
    'public_form',
    coalesce(p_payload->>'who', ''),
    coalesce(p_payload->>'what', ''),
    coalesce(p_payload->>'when', ''),
    coalesce(p_payload->>'where', ''),
    coalesce(p_payload->>'why', ''),
    coalesce(p_payload->>'how', ''),
    nullif(p_payload->>'notes', '')
  );

  return query select v_tracking_id, v_id;
end;
$$;

create or replace function public.lookup_request_by_tracking_id(p_tracking_id text)
returns table (
  tracking_id text,
  title text,
  status public.request_status,
  priority public.request_priority,
  category_label text,
  category_color text,
  department_name text,
  workspace_name text,
  requested_by_name text,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
set search_path = public, pg_temp
as $$
  select
    r.tracking_id,
    r.title,
    r.status,
    r.priority,
    c.label,
    coalesce(c.color_key, 'gray'),
    d.name,
    w.name,
    r.requested_by_name,
    r.created_at,
    r.updated_at
  from public.requests r
  join public.workspaces w on w.id = r.workspace_id
  left join public.categories c on c.id = r.category_id
  left join public.departments d on d.id = r.department_id
  where r.tracking_id = upper(trim(p_tracking_id));
$$;

create or replace function public.approve_workspace_member(
  p_membership_id uuid,
  p_role_id uuid
) returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_member public.workspace_members;
begin
  select * into v_member from public.workspace_members where id = p_membership_id;
  if v_member is null then raise exception 'Membership not found'; end if;
  if not (private.is_workspace_admin(v_member.workspace_id) or private.is_platform_admin()) then
    raise exception 'Not authorized';
  end if;
  if not exists (
    select 1
    from public.workspace_roles r
    where r.id = p_role_id
      and r.workspace_id = v_member.workspace_id
  ) then
    raise exception 'Role not found in workspace';
  end if;

  update public.workspace_members
  set status = 'active',
      workspace_role_id = p_role_id,
      approved_at = now(),
      approved_by = auth.uid()
  where id = p_membership_id;
end;
$$;

-- Anonymous users need to resolve a workspace from its URL slug (for both
-- /submit/<slug> and /signup/<slug>) and list a workspace's active categories
-- (for the public submit form). RLS on `workspaces` and `categories` requires
-- an active membership, so direct table reads from `anon` return nothing —
-- these two SECURITY DEFINER RPCs are the only public window into them.

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

-- ───────────────────────────────────────────────────────────────────────────
-- 5. Realtime publication.
-- Adds the live-update tables to the supabase_realtime publication so the
-- JS client can subscribe to row-level changes. ALTER PUBLICATION ADD TABLE
-- raises duplicate_object if the table is already a member; we catch and
-- swallow so the script is idempotent.
-- ───────────────────────────────────────────────────────────────────────────
do $$
begin
  begin
    execute 'alter publication supabase_realtime add table public.activity_logs';
  exception when duplicate_object then null;
  end;
  begin
    execute 'alter publication supabase_realtime add table public.comments';
  exception when duplicate_object then null;
  end;
  begin
    execute 'alter publication supabase_realtime add table public.requests';
  exception when duplicate_object then null;
  end;
end $$;
