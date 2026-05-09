# MOC Request — Documentation

This folder is the source of truth for the MOC Request app.

## Index

- **[overview.md](./overview.md)** — high-level product description and how each feature surface fits together.
- **[schema.md](./schema.md)** — the canonical data model: tables, columns, enums, foreign keys.
- **[phases/](./phases/)** — ordered Supabase SQL migrations that build the schema, RLS, RPCs, auth trigger, and realtime publication. Run them once against a fresh Supabase project.

## How the app talks to the backend

`src/data/*` are thin wrappers around `@supabase/supabase-js`. Every mutation is a direct `supabase.from(table).insert/update/delete` (or an RPC for the public submit / track flows), and every fetch is a `supabase.from(table).select(...)` honouring the RLS policies in [`docs/phases/phase-09-rls-policies.sql`](./phases/phase-09-rls-policies.sql). Auth is `supabase.auth` — sessions persist in localStorage automatically.

`src/data/store/current-context.ts` carries two ambient values that mutations need synchronously: the signed-in `userId` (set by `AuthProvider` from the auth state listener) and the `activeWorkspaceId` (set by `WorkspaceProvider` when the active workspace resolves). Everything else is enforced by Postgres / RLS.

## Quick start

1. `bun install`
2. Copy `.env.example` to `.env.local` and fill in `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` from your Supabase project's API settings.
3. Make sure all phases in [`docs/phases/`](./phases/) have been applied to your Supabase project (in numbered order).
4. `bun run dev`
5. Open the local URL and sign up via `/signup` — Supabase Auth creates the user, the `handle_new_user` trigger creates the matching `profiles` row, and the form drops you into a pending workspace membership awaiting admin approval.
6. To submit a request as an external user, visit `/submit/<workspace-slug>` (e.g. `/submit/acme`) — no login needed, slug is required.
7. To track a request anonymously, visit `/track/<tracking-id>`.

## Bootstrap (the very first user on a fresh project)

1. Apply the phases. `phase-11-seed-data.sql` creates the initial `Acme Studio` workspace + its three system roles. No users exist yet.
2. Sign up the first user via `/signup`. The auth trigger creates their `profiles` row.
3. In the Supabase dashboard SQL editor, mark them as a platform admin:
   ```sql
   update public.profiles set is_platform_admin = true where email = 'you@example.com';
   ```
4. Sign back in. The `Platform admin` link appears in the account menu. From `/platform/workspaces` you can assign workspace admins to existing users; those admins then create departments, categories, and approve sign-ups from `/admin/...`.

## Resetting

For a clean slate run [`docs/phases/nuke-everything.sql`](./phases/nuke-everything.sql), then re-run phases 01 → 14.
