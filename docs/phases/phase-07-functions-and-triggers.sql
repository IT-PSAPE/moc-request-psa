-- phase-07-functions-and-triggers.sql

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at before update on public.profiles
  for each row execute procedure public.touch_updated_at();

create trigger trg_workspaces_updated_at before update on public.workspaces
  for each row execute procedure public.touch_updated_at();

create trigger trg_departments_updated_at before update on public.departments
  for each row execute procedure public.touch_updated_at();

create trigger trg_requests_updated_at before update on public.requests
  for each row execute procedure public.touch_updated_at();

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

-- Auto-emit 'created' and 'department_routed' on insert. Every request is routed
-- at submit time (department_id is NOT NULL), so the routing log is unconditional.
create or replace function public.requests_after_insert()
returns trigger
language plpgsql
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

create trigger trg_requests_after_insert
  after insert on public.requests
  for each row execute procedure public.requests_after_insert();

-- Status / priority / department / category change → activity_logs.
create or replace function public.requests_after_update()
returns trigger
language plpgsql
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

create trigger trg_requests_after_update
  after update on public.requests
  for each row execute procedure public.requests_after_update();
