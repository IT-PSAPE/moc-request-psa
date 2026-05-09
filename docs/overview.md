# Overview

MOC Request is a multi-workspace, request-intake platform. External requesters submit work through a public form; internal staff review, route, and resolve it inside a workspace.

## Surfaces

| Path | Audience | What it does |
| --- | --- | --- |
| `/submit/:workspaceSlug` | Public, no auth | 2-step wizard locked to the workspace in the URL: pick a category → fill in the form. Allocates a tracking ID. There is no bare `/submit` — the slug is required, so every submission is workspace-scoped from the URL. |
| `/track/:trackingId` | Public, no auth | Read-only status page. No comments or internal fields exposed. |
| `/login`, `/signup` | Public | Sign-up creates a `pending` profile + workspace member entry. The user lands on `/pending` until approved. |
| `/dashboard` | Workspace member | Active requests grouped by department. Admins see all departments; non-admins see only their own. |
| `/departments/:id` | Workspace member | List + Kanban view of requests routed to that department. |
| `/requests/:id` | Workspace member | Full request detail with edit, archive, delete, internal comments, activity timeline. |
| `/admin/members` | Workspace admin | Tabbed view: **All members** (table with status, role, department badges, approve/reject) + one tab per department (table with department-role toggle, add/remove members). |
| `/admin/departments` | Workspace admin | CRUD for departments. |
| `/admin/categories` | Workspace admin | CRUD for categories with default-department routing + active flag. |
| `/admin/settings` | Workspace admin | Edit workspace name + description. |
| `/platform/workspaces` | Platform admin | Workspace list + New workspace. |
| `/platform/workspaces/new` | Platform admin | Create a workspace (auto-derives slug, seeds 3 default roles). |
| `/platform/workspaces/:id` | Platform admin | Assign initial admin to a workspace from existing users. |

## Roles

Three tiers, applied in order:

1. **Platform admin** (`profiles.is_platform_admin = true`) — runs the platform layer. Creates workspaces, assigns initial workspace admins.
2. **Workspace admin** (`workspace_role.canManageRoles = true`) — runs a workspace. Manages members, departments, categories, settings. Sees all requests in their workspace.
3. **Workspace member** — sees requests routed to departments they belong to. Per-department role (`lead` or `member`) is informational in v1; both can view and edit the same data.

Pending and rejected statuses block sign-in into the workspace; the user keeps their profile and shows up under **All members** so an admin can re-open or remove them later.

## Submission → triage → resolution

```
   /submit/:workspaceSlug (anon)
      │
      ▼
   workspace resolved from slug + category picked
      │
      ▼
   submitPublicRequest()
      ├── allocate 8-char Crockford-base32 tracking_id
      ├── insert with status='submitted', source='public_form'
      ├── route to category.default_department_id (required — submission rejected if missing)
      └── emit activity_logs: 'created' + 'department_routed'
      │
      ▼
   Visible to:
      - Workspace admins (always, in their workspace)
      - Members of the routed department
      - Public via /track/:trackingId (scrubbed projection only)
      │
      ▼
   Triage / progress
      ├── status: submitted → triaged → in_progress → completed (or blocked / rejected / archived)
      ├── assignees added/removed
      ├── 5W1H + notes edited
      ├── internal comments posted
      └── every change → activity_logs entry
```

## What's deliberately out of scope (v1)

- Real Supabase wiring (Phase 2).
- Email notifications (sign-up, approval, status change, public confirmation).
- Public-visible comments or two-way conversation with the requester.
- Workspace-wide activity feed (audit log is per-request only).
- Self-serve user-created workspaces.
- File attachments on requests.
- Calendar view (kanban + list ship in v1; calendar deferred).

## Tech stack

- React 19.2, TypeScript, Vite 8, React Router 7
- Tailwind CSS v4 + design tokens via CSS custom properties
- Local UI primitives in `src/components/` (Button, Input, Select, Modal, Drawer, Dropdown, Tabs, Table, Badge, Avatar, …) — no external UI kit
- @dnd-kit for kanban drag-and-drop
- vite-plugin-pwa for installable shell
- React Compiler for auto-memoisation

The data layer (`src/data/`) is a thin wrapper over `@supabase/supabase-js`. RLS policies in [`docs/phases/phase-09-rls-policies.sql`](./phases/phase-09-rls-policies.sql) enforce visibility; the client only filters server-side results.
