-- phase-10-rpcs.sql
-- Security-definer RPCs for public anonymous access and admin operations.

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

  v_tracking_id := public.generate_tracking_id();
  v_id := gen_random_uuid();

  insert into public.requests (
    id, workspace_id, tracking_id, title,
    category_id, department_id,
    priority, status,
    due_date,
    requested_by_name, requested_by_email,
    submitted_by_user_id, source,
    who, what, when_text, where_text, why, how
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
    coalesce(p_payload->>'how', '')
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

  update public.workspace_members
  set status = 'active',
      workspace_role_id = p_role_id,
      approved_at = now(),
      approved_by = auth.uid()
  where id = p_membership_id;
end;
$$;
