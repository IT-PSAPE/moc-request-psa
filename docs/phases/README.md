# Phase 2 SQL migrations

Run in numbered order against a fresh Supabase project. These files realise the schema documented in [../schema.md](../schema.md) and the public RPCs that mediate `/submit` and `/track`.

| File | Purpose |
| --- | --- |
| `phase-00-nuke.sql` | DEV-ONLY. Drops every object created by later phases. |
| `phase-01-foundations.sql` | Extensions (pgcrypto, uuid-ossp), private schema, all enums. |
| `phase-02-platform-tables.sql` | profiles, workspaces, workspace_roles, workspace_members. |
| `phase-03-department-tables.sql` | departments, department_members. |
| `phase-04-category-tables.sql` | categories with default_department_id routing FK. |
| `phase-05-request-tables.sql` | requests, request_assignees, comments, activity_logs. |
| `phase-06-indexes.sql` | Composite indexes for common queries. |
| `phase-07-functions-and-triggers.sql` | updated_at triggers, generate_tracking_id(), audit triggers on requests. |
| `phase-08-private-helpers.sql` | RLS predicate helpers in the `private` schema. |
| `phase-09-rls-policies.sql` | Row-level security on every table. |
| `phase-10-rpcs.sql` | submit_public_request, lookup_request_by_tracking_id, approve_workspace_member. |
| `phase-11-seed-data.sql` | Sample workspaces / departments / categories / one request. |
| `phase-12-public-access.sql` | Anonymous role grants — anon only sees the two public RPCs. |

Phase 1 (mock layer) is **not** affected by these files. They're the blueprint for swapping to real Supabase later.
