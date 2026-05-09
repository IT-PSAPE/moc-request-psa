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
| `phase-11-seed-data.sql` | Bare-minimum production seed: one workspace + its three system roles. No departments, categories, members, or requests — admins create those through the app. |
| `phase-12-public-access.sql` | Anonymous role grants — anon only sees the two public RPCs. |
| `phase-13-bug-reports.sql` | Cross-workspace bug-report table + RLS, routed to the platform team. |
| `phase-14-auth-and-realtime.sql` | `handle_new_user` trigger on `auth.users` (auto-inserts the matching `public.profiles` row on sign-up) + adds `activity_logs`, `comments`, `requests` to the `supabase_realtime` publication. |
| `phase-15-public-lookups.sql` | `lookup_workspace_by_slug` + `list_public_categories` RPCs granted to `anon`. Powers the workspace-scoped public URLs (`/submit/<slug>`, `/signup/<slug>`) without exposing the underlying tables. |
| `nuke-everything.sql` | DEV-ONLY. Out-of-band project-wide nuke. Discovers and drops every user-created object in `public` and other non-Supabase schemas, deletes all `auth.users`, empties storage. Use when you want a true blank-slate reset before re-running the phases. |

The frontend (`src/data/`) talks to Supabase directly via `@supabase/supabase-js`. Apply these phases once against a fresh Supabase project, then point the app at it via `.env.local` (see [`docs/README.md`](../README.md#quick-start)).

## Production-readiness notes

- `requests.department_id` is `not null` (phase-05). Every request is routed at submit time; "unrouted" is not a state the data model allows. The on-delete behavior on `requests.department_id` and `categories.default_department_id` is `restrict`, so a department in use can't be deleted at the DB layer.
- The `submit_public_request` RPC rejects categories whose `default_department_id` is null (phase-10). The frontend admin UI also blocks saving a category without a department.
- After running phase-11, add the first platform-admin profile manually (set `is_platform_admin = true` on the row in `public.profiles` once that user signs up via Supabase Auth), then use `/platform/workspaces` to assign a workspace admin and let the admin populate departments / categories from the app.
