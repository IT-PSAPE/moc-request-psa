import { mockStore } from './store/mock-store'
import { getCurrentContext } from './store/current-context'
import { mapRequest, type RequestRow } from './map-request'
import { type CategoryRow } from './map-category'
import { type DepartmentRow } from './map-department'
import type { Request, Status } from '@/types/requests'

function resolveJoins(rows: RequestRow[]): Request[] {
    const categoriesById = new Map<string, CategoryRow>()
    for (const c of mockStore<CategoryRow>('categories').list()) categoriesById.set(c.id, c)
    const departmentsById = new Map<string, DepartmentRow>()
    for (const d of mockStore<DepartmentRow>('departments').list()) departmentsById.set(d.id, d)

    return rows.map(row => mapRequest(row, {
        category: row.category_id ? categoriesById.get(row.category_id) ?? null : null,
        department: row.department_id ? departmentsById.get(row.department_id) ?? null : null,
    }))
}

function canSeeRequest(row: RequestRow, ctx: ReturnType<typeof getCurrentContext>): boolean {
    if (!ctx.activeWorkspaceId) return false
    if (row.workspace_id !== ctx.activeWorkspaceId) return false
    if (ctx.isPlatformAdmin) return true
    // Admins (can_manage_roles) see everything in their workspace.
    if (ctx.workspaceRole?.canManageRoles) return true
    // Members see requests routed to their departments, plus unrouted requests.
    if (!row.department_id) return Boolean(ctx.workspaceRole?.canRead)
    return ctx.departmentIds.includes(row.department_id)
}

export async function fetchRequests(): Promise<Request[]> {
    const ctx = getCurrentContext()
    const rows = mockStore<RequestRow>('requests')
        .where(row => canSeeRequest(row, ctx) && row.status !== 'archived' && row.status !== 'rejected')
        .sort(byDueDateAscNullsLast)
    return resolveJoins(rows)
}

export async function fetchRequestsByDepartment(departmentId: string): Promise<Request[]> {
    const ctx = getCurrentContext()
    const rows = mockStore<RequestRow>('requests')
        .where(row =>
            canSeeRequest(row, ctx)
            && row.department_id === departmentId
            && row.status !== 'archived'
            && row.status !== 'rejected',
        )
        .sort(byDueDateAscNullsLast)
    return resolveJoins(rows)
}

export async function fetchArchivedRequests(): Promise<Request[]> {
    const ctx = getCurrentContext()
    const rows = mockStore<RequestRow>('requests')
        .where(row => canSeeRequest(row, ctx) && row.status === 'archived')
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    return resolveJoins(rows)
}

export async function fetchRequestsByStatus(status: Status): Promise<Request[]> {
    const ctx = getCurrentContext()
    const rows = mockStore<RequestRow>('requests')
        .where(row => canSeeRequest(row, ctx) && row.status === status)
        .sort(byDueDateAscNullsLast)
    return resolveJoins(rows)
}

export async function fetchRequestById(id: string): Promise<Request | null> {
    const ctx = getCurrentContext()
    const row = mockStore<RequestRow>('requests').find(id)
    if (!row || !canSeeRequest(row, ctx)) return null
    return resolveJoins([row])[0]
}

function byDueDateAscNullsLast(a: RequestRow, b: RequestRow): number {
    if (a.due_date === null && b.due_date === null) return 0
    if (a.due_date === null) return 1
    if (b.due_date === null) return -1
    return a.due_date.localeCompare(b.due_date)
}
