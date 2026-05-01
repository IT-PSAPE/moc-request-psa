import { mockStore } from './store/mock-store'
import { type RequestRow } from './map-request'
import { type CategoryRow } from './map-category'
import { type WorkspaceRow } from './map-workspace'
import { emitActivity } from './mutate-activity'
import { generateUniqueTrackingId } from '@/lib/tracking-id'
import type { Priority } from '@/types/requests'

export type PublicSubmissionInput = {
    workspaceId: string
    categoryId: string
    title: string
    requestedByName: string
    requestedByEmail: string | null
    priority: Priority
    dueDate: string | null
    who: string
    what: string
    when: string
    where: string
    why: string
    how: string
}

export type PublicSubmissionResult = {
    trackingId: string
    requestId: string
    departmentId: string | null
}

export async function submitPublicRequest(input: PublicSubmissionInput): Promise<PublicSubmissionResult> {
    const workspaces = mockStore<WorkspaceRow>('workspaces')
    if (!workspaces.find(input.workspaceId)) {
        throw new Error('That workspace was not found.')
    }

    const category = mockStore<CategoryRow>('categories').find(input.categoryId)
    if (!category) throw new Error('That category was not found.')
    if (category.workspace_id !== input.workspaceId) throw new Error('Category does not belong to the chosen workspace.')
    if (!category.is_active) throw new Error('That category is not currently accepting requests.')

    const requestsStore = mockStore<RequestRow>('requests')
    const trackingId = generateUniqueTrackingId(id => Boolean(requestsStore.findOne(r => r.tracking_id === id)))

    const now = new Date().toISOString()
    const row: RequestRow = {
        id: crypto.randomUUID(),
        workspace_id: input.workspaceId,
        tracking_id: trackingId,
        title: input.title.trim(),
        category_id: input.categoryId,
        department_id: category.default_department_id,
        priority: input.priority,
        status: 'submitted',
        due_date: input.dueDate,
        requested_by_name: input.requestedByName.trim(),
        requested_by_email: input.requestedByEmail?.trim() || null,
        submitted_by_user_id: null,
        source: 'public_form',
        who: input.who.trim(),
        what: input.what.trim(),
        when_text: input.when.trim(),
        where_text: input.where.trim(),
        why: input.why.trim(),
        how: input.how.trim(),
        notes: null,
        created_at: now,
        updated_at: now,
    }

    requestsStore.insert(row)

    emitActivity({
        requestId: row.id,
        actorId: null,
        action: 'created',
        payload: { source: 'public_form', requestedByName: row.requested_by_name },
    })

    if (row.department_id) {
        emitActivity({
            requestId: row.id,
            actorId: null,
            action: 'department_routed',
            payload: { fromId: null, toId: row.department_id },
        })
    }

    return {
        trackingId,
        requestId: row.id,
        departmentId: row.department_id,
    }
}
