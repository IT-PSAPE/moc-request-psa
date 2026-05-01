-- phase-12-public-access.sql
-- Anonymous role grants. anon must NOT have direct table access.

revoke all on schema public from anon;
grant usage on schema public to anon;

grant execute on function public.submit_public_request(uuid, uuid, jsonb) to anon;
grant execute on function public.lookup_request_by_tracking_id(text) to anon;

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on function public.approve_workspace_member(uuid, uuid) to authenticated;
