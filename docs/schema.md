# Schema

Canonical data model. The mock layer in `src/data/store/` and the JSON seeds in `src/data/mocks/` mirror this exactly. The Phase 2 SQL migrations under `docs/phases/` realise the same schema in Postgres.

## Workspace scoping

Every operational table is workspace-scoped. The `workspace_id` column is **denormalised** on top-level tables for cheap RLS predicates. Subordinate rows (`department_members`, `request_assignees`, `comments`, `activity_logs`) inherit it via their parent and don't store it directly.

## Enums

| Enum | Values |
| --- | --- |
| `member_status` | `pending`, `active`, `suspended`, `rejected` |
| `request_status` | `submitted`, `triaged`, `in_progress`, `blocked`, `completed`, `archived`, `rejected` |
| `request_priority` | `low`, `medium`, `high`, `urgent` |
| `department_role` | `lead`, `member` |
| `activity_action` | `created`, `status_changed`, `priority_changed`, `category_changed`, `department_routed`, `assignee_added`, `assignee_removed`, `field_updated`, `comment_posted` |
| `submission_source` | `public_form`, `internal`, `import` |

## Tables

### `profiles`
Mirrors `auth.users`. One row per platform user.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | PK; equals `auth.users.id` |
| `email` | `text` | unique |
| `name` | `text` | required |
| `surname` | `text?` | optional |
| `status` | `member_status` | platform-level lock; default `active` |
| `is_platform_admin` | `boolean` | gates `/platform/*` |
| `created_at`, `updated_at` | `timestamptz` | |

### `workspaces`
| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | PK |
| `name` | `text` | |
| `slug` | `text` | unique, lowercase a-z / 0-9 / dash |
| `description` | `text?` | |
| `created_by` | `uuid?` | FK → `profiles.id` |
| `created_at`, `updated_at` | `timestamptz` | |

### `workspace_roles`
Per-workspace role definitions. New workspaces auto-seed three: Admin, Editor, Viewer.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | PK |
| `workspace_id` | `uuid` | FK |
| `name` | `text` | unique within workspace |
| `can_create`, `can_read`, `can_update`, `can_delete` | `boolean` | |
| `can_manage_roles` | `boolean` | "workspace admin" superpower; gates `/admin/*` |
| `is_system` | `boolean` | true for the seeded three |

### `workspace_members`
| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | PK |
| `workspace_id` | `uuid` | FK |
| `user_id` | `uuid` | FK |
| `status` | `member_status` | `pending` → `active` (approved) or `rejected`. `rejected` keeps the record. |
| `workspace_role_id` | `uuid?` | null until approved |
| `requested_at` | `timestamptz` | |
| `approved_at`, `approved_by` | nullable | set when status flips to `active` |

unique(`workspace_id`, `user_id`)

### `departments`
| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | PK |
| `workspace_id` | `uuid` | FK |
| `name` | `text` | unique within workspace |
| `description` | `text?` | |
| `color_key` | `text` | mapped to Tailwind via `lib/color-keys.ts` |
| `sort_order` | `integer` | |

### `department_members`
| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | synthetic PK in mock layer; real DB uses composite (`department_id`, `user_id`) |
| `department_id`, `user_id` | `uuid` | FKs |
| `role` | `department_role` | `lead` or `member` |

### `categories`
Workspace-defined. Drives the public form and routes new submissions.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | PK |
| `workspace_id` | `uuid` | FK |
| `label` | `text` | unique within workspace |
| `color_key` | `text` | |
| `default_department_id` | `uuid?` | FK; null = unrouted (admin must triage) |
| `sort_order` | `integer` | |
| `is_active` | `boolean` | when false, category is hidden from `/submit` |

### `requests`
The core entity.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | PK |
| `workspace_id` | `uuid` | FK |
| `tracking_id` | `text` | unique; 8-char Crockford base32 |
| `title` | `text` | |
| `category_id` | `uuid?` | FK |
| `department_id` | `uuid?` | FK; routed at submit, admin can override |
| `priority` | `request_priority` | default `medium` |
| `status` | `request_status` | default `submitted` |
| `due_date` | `timestamptz?` | |
| `requested_by_name` | `text` | required |
| `requested_by_email` | `text?` | |
| `submitted_by_user_id` | `uuid?` | null when via `/submit` |
| `source` | `submission_source` | |
| `who`, `what`, `when_text`, `where_text`, `why`, `how` | `text` | 5W1H, default `''` |
| `notes` | `text?` | internal |
| `created_at`, `updated_at` | `timestamptz` | |

### `request_assignees`
| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | PK |
| `request_id`, `user_id` | `uuid` | FKs |
| `duty` | `text` | free text, e.g. "Producer" |
| unique(`request_id`, `user_id`) | | |

### `comments`
Internal-only. Never exposed on `/track/:trackingId`.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | PK |
| `request_id` | `uuid` | FK |
| `author_id` | `uuid` | FK |
| `body` | `text` | non-empty |
| `created_at`, `updated_at` | `timestamptz` | |

### `activity_logs`
Append-only audit trail per request.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | PK |
| `request_id` | `uuid` | FK |
| `actor_id` | `uuid?` | null = anonymous/public |
| `action` | `activity_action` | discriminator |
| `payload` | `jsonb` | shape varies by action |
| `created_at` | `timestamptz` | |

#### Payload shapes

| Action | Payload |
| --- | --- |
| `created` | `{ source, requestedByName }` |
| `status_changed` | `{ from, to }` |
| `priority_changed` | `{ from, to }` |
| `category_changed` | `{ fromId?, toId? }` |
| `department_routed` | `{ fromId?, toId? }` |
| `assignee_added` | `{ userId, duty }` |
| `assignee_removed` | `{ userId }` |
| `field_updated` | `{ field, oldValue, newValue }` (one entry per changed field) |
| `comment_posted` | `{ commentId, excerpt }` |

## Cascade behaviour

- Delete a workspace → cascades to roles, members, departments, categories, requests, and via those to all subordinate rows.
- Delete a department → cascades to `department_members`. Categories pointing here have `default_department_id` nulled. Requests routed here have `department_id` nulled.
- Delete a category → requests pointing here have `category_id` nulled.
- Delete a request → cascades to `request_assignees`, `comments`, `activity_logs`.

## Public access

Anonymous users (`anon`) have **no direct table access**. Two security-definer RPCs mediate all public traffic:

- `submit_public_request(workspace_id, category_id, payload)` — inserts with `source='public_form'`, allocates a tracking_id, resolves `department_id` via `categories.default_department_id`, emits `created` and `department_routed` activity entries.
- `lookup_request_by_tracking_id(tracking_id)` — returns a scrubbed projection: tracking_id, title, status, priority, category_label, department_name, workspace_name, requested_by_name, created_at, updated_at. No comments, notes, or assignees.

## Bootstrap requirements

A working workspace needs:
1. A row in `workspaces`.
2. Three rows in `workspace_roles` (Admin, Editor, Viewer) — created automatically by `createWorkspace`.
3. At least one active member with `Admin` role — assigned by a platform admin via `/platform/workspaces/:id`.
4. Optional but recommended: one or more departments + categories with `default_department_id` set, so the public form can route submissions.

The platform admin tier is bootstrapped via SQL only (set `profiles.is_platform_admin = true`) — no in-app self-promotion path.
