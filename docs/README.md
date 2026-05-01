# MOC Request — Documentation

This folder is the source of truth for the MOC Request app.

## Index

- **[login-credentials.md](./login-credentials.md)** — every seeded mock user, their email + password, workspace + role + department assignments. Use this to log in during local development.
- **[overview.md](./overview.md)** — high-level product description and how each feature surface fits together.
- **[schema.md](./schema.md)** — the canonical data model: tables, columns, enums, foreign keys.
- **[mock-layer.md](./mock-layer.md)** — how the localStorage-backed mock store works in Phase 1, and the per-file checklist for swapping to Supabase in Phase 2.
- **[phases/](./phases/)** — Phase 2 SQL migrations. 13 ordered files that recreate the schema in Postgres with RLS, RPCs, and seed data.

## Phase 1 (current) vs Phase 2

| Phase | Storage | Status |
| --- | --- | --- |
| **Phase 1** | localStorage mock store | **Live** — what runs today |
| **Phase 2** | Supabase (Postgres + Auth + RLS) | Blueprinted in `docs/phases/`; not yet wired |

The Phase 1 data layer (`src/data/`) mimics Supabase row shapes exactly so the swap to Phase 2 is a per-file change with no impact on components.

## Quick start

1. `bun install`
2. `bun run dev`
3. Open http://localhost:5173 — log in with any credential from [login-credentials.md](./login-credentials.md)
4. To submit a request as an external user, visit `/submit` (no login needed)
5. To track a request anonymously, visit `/track/<tracking-id>` (e.g. `/track/Q7K3P9XR`)

## Resetting local data

`/platform/workspaces` (visible only to platform admins) has a **Reset mock data** button that wipes localStorage and re-seeds from the JSON files in `src/data/mocks/`.
