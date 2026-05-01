import { mockStore } from './store/mock-store'
import { getCurrentContext } from './store/current-context'
import { mapRequest, requestToRow, type RequestRow } from './map-request'
import { type CategoryRow } from './map-category'
import { type DepartmentRow } from './map-department'
import { type RequestAssigneeRow } from './map-assignee'
import { emitActivity } from './mutate-activity'
import type { Request, Status } from '@/types/requests'

const TRACKED_FIELDS: (keyof RequestRow)[] = ['title', 'who', 'what', 'when_text', 'where_text', 'why', 'how', 'notes', 'due_date', 'requested_by_name', 'requested_by_email']

function withJoins(row: RequestRow): Request {
    const category = row.category_id
        ? mockStore<CategoryRow>('categories').find(row.category_id) ?? null
        : null
    const department = row.department_id
        ? mockStore<DepartmentRow>('departments').find(row.department_id) ?? null
        : null
    return mapRequest(row, { category, department })
}

function diffActivities(prev: RequestRow, next: RequestRow, actorId: string | null) {
    if (prev.status !== next.status) {
        emitActivity({
            requestId: next.id,
            actorId,
            action: 'status_changed',
            payload: { from: prev.status, to: next.status },
        })
    }
    if (prev.priority !== next.priority) {
        emitActivity({
            requestId: next.id,
            actorId,
            action: 'priority_changed',
            payload: { from: prev.priority, to: next.priority },
        })
    }
    if (prev.category_id !== next.category_id) {
        emitActivity({
            requestId: next.id,
            actorId,
            action: 'category_changed',
            payload: { fromId: prev.category_id, toId: next.category_id },
        })
    }
    if (prev.department_id !== next.department_id) {
        emitActivity({
            requestId: next.id,
            actorId,
            action: 'department_routed',
            payload: { fromId: prev.department_id, toId: next.department_id },
        })
    }
    for (const field of TRACKED_FIELDS) {
        if (prev[field] !== next[field]) {
            emitActivity({
                requestId: next.id,
                actorId,
                action: 'field_updated',
                payload: { field, oldValue: prev[field], newValue: next[field] },
            })
        }
    }
}

export async function updateRequest(request: Request): Promise<Request> {
    const ctx = getCurrentContext()
    const store = mockStore<RequestRow>('requests')
    const prev = store.find(request.id)
    if (!prev) throw new Error('Request not found')

    const nextRow: RequestRow = {
        ...requestToRow(request),
        updated_at: new Date().toISOString(),
    }
    const updated = store.update(request.id, nextRow)

    diffActivities(prev, updated, ctx.userId)
    return withJoins(updated)
}

export async function updateRequestStatus(id: string, status: Status): Promise<Request> {
    const ctx = getCurrentContext()
    const store = mockStore<RequestRow>('requests')
    const prev = store.find(id)
    if (!prev) throw new Error('Request not found')
    if (prev.status === status) return withJoins(prev)

    const updated = store.update(id, { status, updated_at: new Date().toISOString() })
    emitActivity({
        requestId: id,
        actorId: ctx.userId,
        action: 'status_changed',
        payload: { from: prev.status, to: status },
    })
    return withJoins(updated)
}

export async function archiveRequest(id: string): Promise<Request> {
    return updateRequestStatus(id, 'archived')
}

export async function unarchiveRequest(id: string): Promise<Request> {
    return updateRequestStatus(id, 'submitted')
}

export async function deleteRequest(id: string): Promise<void> {
    const store = mockStore<RequestRow>('requests')
    if (!store.find(id)) return
    store.delete(id)
    mockStore<RequestAssigneeRow>('request_assignees').deleteWhere(row => row.request_id === id)
}

export async function addRequestAssignee(requestId: string, userId: string, duty: string): Promise<void> {
    const ctx = getCurrentContext()
    const store = mockStore<RequestAssigneeRow>('request_assignees')
    const existing = store.findOne(row => row.request_id === requestId && row.user_id === userId)
    if (existing) {
        if (existing.duty !== duty) store.update(existing.id, { duty })
        return
    }
    store.insert({
        id: crypto.randomUUID(),
        request_id: requestId,
        user_id: userId,
        duty,
        created_at: new Date().toISOString(),
    })
    emitActivity({
        requestId,
        actorId: ctx.userId,
        action: 'assignee_added',
        payload: { userId, duty },
    })
}

export async function removeRequestAssignee(requestId: string, userId: string): Promise<void> {
    const ctx = getCurrentContext()
    const removed = mockStore<RequestAssigneeRow>('request_assignees')
        .deleteWhere(row => row.request_id === requestId && row.user_id === userId)
    if (removed > 0) {
        emitActivity({
            requestId,
            actorId: ctx.userId,
            action: 'assignee_removed',
            payload: { userId },
        })
    }
}
