-- phase-14-auth-and-realtime.sql
-- Two things the app needs that don't fit in earlier phases:
--   1. A trigger that creates a public.profiles row whenever a new auth.users
--      row is inserted (i.e. someone signs up). The metadata fields name /
--      surname come from the signUp options.data payload. If the same payload
--      carries `pending_workspace_id`, a pending workspace_members row is
--      created alongside it so the admin can approve.
--   2. Realtime publication entries so the app can subscribe to per-request
--      activity_logs and comments without polling.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Auto-create a profiles row (and optional pending workspace_member) when
--    a Supabase auth user signs up. SECURITY DEFINER so the trigger can write
--    regardless of RLS / session state — important because email-confirmation
--    flows return no session, so the client can't perform these inserts itself.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_workspace_id uuid;
begin
  insert into public.profiles (id, email, name, surname)
  values (
    new.id,
    new.email,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), split_part(new.email, '@', 1)),
    nullif(trim(new.raw_user_meta_data ->> 'surname'), '')
  )
  on conflict (id) do nothing;

  v_workspace_id := nullif(new.raw_user_meta_data ->> 'pending_workspace_id', '')::uuid;
  if v_workspace_id is not null then
    insert into public.workspace_members (workspace_id, user_id, status)
    values (v_workspace_id, new.id, 'pending')
    on conflict (workspace_id, user_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Add the live-update tables to the supabase_realtime publication so the
--    JS client can subscribe to row-level changes.
--    Idempotent: ALTER PUBLICATION ADD TABLE errors if the table is already
--    a member, so we wrap each call in a try-block.
-- ─────────────────────────────────────────────────────────────────────────────
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
