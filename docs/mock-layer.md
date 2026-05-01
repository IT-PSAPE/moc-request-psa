# Mock layer

Phase 1 of MOC Request runs entirely against a localStorage-backed mock store. This document covers the contract and the swap-to-Supabase checklist.

## Storage namespace

Every key is prefixed `mocrequest:v2:`.

| Key | Contents |
| --- | --- |
| `mocrequest:v2:profiles` | `ProfileRow[]` |
| `mocrequest:v2:workspaces` | `WorkspaceRow[]` |
| `mocrequest:v2:workspace_roles` | `WorkspaceRoleRow[]` |
| `mocrequest:v2:workspace_members` | `WorkspaceMemberRow[]` |
| `mocrequest:v2:departments` | `DepartmentRow[]` |
| `mocrequest:v2:department_members` | `DepartmentMemberRow[]` |
| `mocrequest:v2:categories` | `CategoryRow[]` |
| `mocrequest:v2:requests` | `RequestRow[]` |
| `mocrequest:v2:request_assignees` | `RequestAssigneeRow[]` |
| `mocrequest:v2:comments` | `CommentRow[]` |
| `mocrequest:v2:activity_logs` | `ActivityLogRow[]` |
| `mocrequest:v2:session` | `{ userId, issuedAt }` for the current sign-in |
| `mocrequest:v2:password:<userId>` | per-user mock password (string) |

## Hydration

- On first call to `mockStore(<table>)`, if the localStorage key is missing, the store hydrates from `src/data/mocks/<table>.json`.
- After hydration, every mutation writes back to localStorage and notifies subscribers.
- `ensureSeeded()` (in `src/data/store/reset.ts`) seeds every table at app boot. It's called from `AuthProvider` on mount and from `/submit` + `/track` (which run outside the auth context).

## Reset

`resetMockData()` (in `src/data/store/reset.ts`):
1. Clears every `mocrequest:v2:*` key.
2. Clears the in-memory caches inside `mock-store.ts`.
3. Reloads to `/login`, which re-seeds from JSON.

The `Reset mock data` button on `/platform/workspaces` is the user-facing surface (with a confirm modal).

## Subscribe

`mockStore(<table>).subscribe(fn)` registers a listener fired whenever any mutation completes. Used by `useRequestActivity` and `useRequestComments` so an inline mutate (e.g. saving a title) immediately re-renders the timeline without a manual refetch.

## RLS guard contract

Each `fetch-*` function calls `getCurrentContext()` and applies the same predicates Postgres RLS will apply in Phase 2:

```ts
function canSeeRequest(row: RequestRow, ctx: CurrentContext): boolean {
  if (!ctx.activeWorkspaceId) return false
  if (row.workspace_id !== ctx.activeWorkspaceId) return false
  if (ctx.isPlatformAdmin) return true
  if (ctx.workspaceRole?.canManageRoles) return true
  if (!row.department_id) return Boolean(ctx.workspaceRole?.canRead)
  return ctx.departmentIds.includes(row.department_id)
}
```

When swapping to Supabase, this exact predicate becomes a Postgres RLS policy on `requests` and the in-app helper drops away.

## Swap-to-Supabase checklist

For each file under `src/data/`:

| File | Phase 1 | Phase 2 swap |
| --- | --- | --- |
| `store/mock-store.ts` | localStorage CRUD | **DELETE** — replaced by `@supabase/supabase-js` |
| `store/session.ts` | localStorage session | **DELETE** — replaced by `supabase.auth.getSession()` |
| `store/current-context.ts` | reads from local stores | rewrite to call `supabase.from('workspace_members').select(...)` once on auth change |
| `store/storage-keys.ts` | namespace constants | **DELETE** |
| `store/reset.ts` | re-seeds from JSON | **DELETE** (or repurpose to call a dev-only `seed_dev_data()` RPC) |
| `mocks/*.json` | seed JSON | **DELETE** — `phase-11-seed-data.sql` takes over |
| `map-*.ts` | snake/camel converters | **KEEP** unchanged |
| `fetch-*.ts` | `mockStore.where(...)` | swap to `supabase.from(...).select(...)` |
| `mutate-*.ts` | `mockStore.insert/update/delete` | swap to `.insert/.update/.delete` |
| `mutate-activity.ts` | app-level emit on every mutate | retain emit for `comment_posted`, `assignee_added`, `assignee_removed`; let triggers handle the rest |
| `submit-public-request.ts` | direct mockStore writes | swap to `supabase.rpc('submit_public_request', …)` |
| `fetch-request-by-tracking-id.ts` | direct mockStore reads | swap to `supabase.rpc('lookup_request_by_tracking_id', …)` |

Components, hooks, and screens (`src/features/`, `src/screens/`) do not change.

## Where the seed data lives

- `src/data/mocks/profiles.json` — 5 users
- `src/data/mocks/passwords.json` — 5 passwords (mapped by user UUID)
- `src/data/mocks/workspaces.json` — Acme Studio + Northwind Productions
- `src/data/mocks/workspace_roles.json` — 6 roles (3 per workspace)
- `src/data/mocks/workspace_members.json` — 6 memberships (1 pending)
- `src/data/mocks/departments.json` — 5 departments
- `src/data/mocks/department_members.json` — 7 department memberships (mix of lead/member)
- `src/data/mocks/categories.json` — 5 categories (3 in Acme, 2 in Northwind)
- `src/data/mocks/requests.json` — 25 requests across both workspaces, all statuses
- `src/data/mocks/request_assignees.json` — 3 assignments
- `src/data/mocks/comments.json` — 4 internal comments
- `src/data/mocks/activity_logs.json` — 6 audit entries

See [login-credentials.md](./login-credentials.md) for the human-readable assignments.
