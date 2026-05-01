# Login credentials — mock data

These are the seeded mock users. All passwords are stored in plain text in `src/data/mocks/passwords.json` (Phase 1 only — passwords are scoped to the mock store and don't survive a `Reset mock data`).

## Quick reference

| Email | Password | Tier |
| --- | --- | --- |
| `platform@mocrequest.dev` | `platform123` | Platform admin (no workspace UI by default; assigned to Acme Studio for demo) |
| `alice@acme.test` | `alice123` | Acme Studio admin |
| `bob@acme.test` | `bob123` | Acme Studio editor |
| `carla@northwind.test` | `carla123` | Northwind Productions admin |
| `pending@acme.test` | `pending123` | Pending Acme Studio sign-up |

## Detailed assignments

### Platform Admin
- **Name**: Platform Admin
- **Email**: `platform@mocrequest.dev`
- **Password**: `platform123`
- **Profile flags**: `is_platform_admin = true`
- **Workspace memberships**:
  - Acme Studio · `Admin` role · active
- **Departments**: none
- **Use to test**: `/platform/workspaces` (create new workspaces, assign initial admin), `/platform/workspaces/new`, `Reset mock data` button

### Alice Khumalo
- **Email**: `alice@acme.test`
- **Password**: `alice123`
- **Workspace memberships**:
  - Acme Studio · `Admin` role · active
- **Departments**:
  - Acme · Production · `lead`
  - Acme · Design · `lead`
  - Acme · Events · `lead`
- **Use to test**: full workspace admin surface — `/admin/members`, `/admin/departments`, `/admin/categories`, `/admin/settings`. Sees all requests in Acme via `canManageRoles`.

### Bob Singh
- **Email**: `bob@acme.test`
- **Password**: `bob123`
- **Workspace memberships**:
  - Acme Studio · `Editor` role · active
- **Departments**:
  - Acme · Production · `member`
  - Acme · Design · `member`
- **Use to test**: department-scoped read access. Sees only requests routed to Production or Design (not Events). No Admin section in the sidebar.

### Carla Mokoena
- **Email**: `carla@northwind.test`
- **Password**: `carla123`
- **Workspace memberships**:
  - Northwind Productions · `Admin` role · active
- **Departments**:
  - Northwind · Editorial · `lead`
  - Northwind · Field Ops · `lead`
- **Use to test**: a second-workspace admin. Confirms multi-tenancy — Carla cannot see Acme's data.

### Pending User
- **Name**: Pending User
- **Email**: `pending@acme.test`
- **Password**: `pending123`
- **Workspace memberships**:
  - Acme Studio · no role · **pending**
- **Use to test**: the "awaiting approval" screen at `/pending`. Cannot reach `/dashboard` until an Acme admin approves them via `/admin/members`.

## Seeded entities (overview)

| Workspace | Departments | Categories | Active requests | Pending members |
| --- | --- | --- | --- | --- |
| Acme Studio (`acme`) | Production · Design · Events | Video production · Graphic design · Live event | 16 across all statuses | 1 (Pending User) |
| Northwind Productions (`northwind`) | Editorial · Field Ops | Article · Field shoot | 7 across all statuses | 0 |

## Public surfaces (no login)

- `/submit` — anonymous submission form. Pick a workspace, then a category, then fill in the request fields.
- `/track/<tracking-id>` — read-only status page. Try `/track/Q7K3P9XR` (Acme) or `/track/A4F7G2HM` (Northwind) for seeded examples.

## Tips

- The current session is stored at `localStorage["mocrequest:v2:session"]`.
- New sign-ups via `/signup` are added with `status='pending'` until an admin approves them through `/admin/members`. Their password is also stored in localStorage under `mocrequest:v2:password:<userId>`.
- A user that's been **rejected** keeps their record. An admin can re-open them on the All members tab to flip them back to `pending`.
