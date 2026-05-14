-- phase-07-invitations.sql
--
-- Adds the targeted email-invite flow:
--   • Extends member_status with 'invited'.
--   • Extends handle_new_user() to recognise invite metadata and create the
--     workspace_members + department_members rows in 'invited' state instead
--     of the self-signup 'pending' state.
--   • Exposes a complete_invitation() RPC the invitee calls after setting
--     their password; it flips every one of their 'invited' memberships to
--     'active'. (Earlier revisions used a trigger that promoted on email
--     confirmation, but that fired before the password-setup screen ran and
--     was dropped.)
--
-- Idempotent: the enum extension uses `if not exists`, every function uses
-- CREATE OR REPLACE, and triggers are dropped before recreate.

-- ───────────────────────────────────────────────────────────────────────────
-- 1. Enum extension.
-- ───────────────────────────────────────────────────────────────────────────
alter type public.member_status add value if not exists 'invited' before 'active';

-- ───────────────────────────────────────────────────────────────────────────
-- 2. Replace handle_new_user() with an invite-aware version.
--
-- Metadata keys recognised:
--   Self-signup (pre-existing):
--     • pending_workspace_id (uuid) | pending_workspace_slug (text)
--   Invite (new):
--     • invite_workspace_id (uuid)
--     • invite_workspace_role_id (uuid, optional)
--     • invite_department_assignments (jsonb array of {department_id, role})
--
-- If invite_workspace_id is present we ignore the pending_* keys and create
-- the membership in 'invited' state with the pre-assigned role + departments.
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
  v_invite_workspace_id uuid;
  v_invite_role_id uuid;
  v_invite_assignments jsonb;
  v_assignment jsonb;
  v_membership_id uuid;
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

  -- Invite path takes precedence over self-signup.
  v_invite_workspace_id := nullif(trim(new.raw_user_meta_data ->> 'invite_workspace_id'), '')::uuid;

  if v_invite_workspace_id is not null then
    select exists (select 1 from public.workspaces where id = v_invite_workspace_id)
      into v_workspace_exists;
    if not v_workspace_exists then
      raise notice 'handle_new_user(%): invite workspace % not found; skipping', new.id, v_invite_workspace_id;
      return new;
    end if;

    v_invite_role_id := nullif(trim(new.raw_user_meta_data ->> 'invite_workspace_role_id'), '')::uuid;

    begin
      insert into public.workspace_members (workspace_id, user_id, status, workspace_role_id)
      values (v_invite_workspace_id, new.id, 'invited', v_invite_role_id)
      on conflict (workspace_id, user_id) do nothing
      returning id into v_membership_id;
    exception when others then
      raise notice 'handle_new_user(%): invited workspace_members insert failed: %', new.id, sqlerrm;
      return new;
    end;

    -- Pre-assign departments. Failures here are logged but do not abort.
    v_invite_assignments := coalesce(new.raw_user_meta_data -> 'invite_department_assignments', '[]'::jsonb);
    if jsonb_typeof(v_invite_assignments) = 'array' then
      for v_assignment in select * from jsonb_array_elements(v_invite_assignments)
      loop
        begin
          insert into public.department_members (department_id, user_id, role)
          values (
            (v_assignment ->> 'department_id')::uuid,
            new.id,
            coalesce((v_assignment ->> 'role')::public.department_role, 'member')
          )
          on conflict (department_id, user_id) do nothing;
        exception when others then
          raise notice 'handle_new_user(%): department_members insert failed for %: %',
                       new.id, v_assignment, sqlerrm;
        end;
      end loop;
    end if;

    return new;
  end if;

  -- Self-signup fallback (unchanged from prior version).
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
    raise notice 'handle_new_user(%): no workspace context in metadata; skipping workspace_members insert', new.id;
    return new;
  end if;

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

-- The trigger itself is already declared in phase-04; left alone here.

-- ───────────────────────────────────────────────────────────────────────────
-- 3. Promote 'invited' → 'active' when the invitee finishes password setup.
--
-- Earlier versions fired a trigger on auth.users.email_confirmed_at, but that
-- ran the instant the magic link was consumed — before the invitee reached
-- the /accept-invitation password screen. The screen would then see an
-- already-'active' membership and skip the password step entirely.
--
-- The trigger is dropped here. Promotion is now driven by the invitee
-- explicitly calling complete_invitation() after a successful
-- supabase.auth.updateUser({ password }) on the accept-invitation screen.
-- ───────────────────────────────────────────────────────────────────────────

drop trigger if exists on_auth_user_email_confirmed on auth.users;
drop function if exists public.promote_invited_memberships_on_email_confirmed();

create or replace function public.complete_invitation()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update public.workspace_members
     set status = 'active',
         approved_at = coalesce(approved_at, now())
   where user_id = auth.uid()
     and status = 'invited';
end;
$$;

revoke all on function public.complete_invitation() from public;
grant execute on function public.complete_invitation() to authenticated;
