-- Patch: grant public-form RPCs to `authenticated` as well as `anon`.
--
-- Context: `/submit` and `/track` are public pages that don't sign the user
-- out. A signed-in user hitting these pages calls the RPCs with the
-- `authenticated` role, which was not in the original grant list, so they
-- got "permission denied for function submit_public_request".
--
-- This patch is folded into phase-05-rls-and-grants.sql going forward.
-- Re-running it against an up-to-date database is a no-op.

grant execute on function public.submit_public_request(uuid, uuid, jsonb) to authenticated;
grant execute on function public.lookup_request_by_tracking_id(text)      to authenticated;
