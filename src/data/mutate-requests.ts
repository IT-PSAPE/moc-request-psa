import { supabase } from '@/lib/supabase'
import { getCurrentContext } from './store/current-context'
import { mapRequest, requestToRow, type RequestRow } from './map-request'
import { type CategoryRow } from './map-category'
import { type DepartmentRow } from './map-department'
import { emitActivity } from './mutate-activity'
import type { Request, Status } from '@/types/requests'

// Disambiguate the embed: requests has both a single-column FK and a
// composite (id, workspace_id) FK to each parent table, so PostgREST needs the
// FK name to know which relationship to follow.
const SELECT_WITH_JOINS =
    '*, category:categories!requests_category_id_fkey(*), department:departments!requests_department_id_fkey(*)'

type RequestJoinRow = RequestRow & {
    category: CategoryRow | null
    department: DepartmentRow | null
}

function shape(row: RequestJoinRow): Request {
    return mapRequest(row, { category: row.category, department: row.department })
}

export async function updateRequest(request: Request): Promise<Request> {
    const ctx = getCurrentContext()

    const { data: prev, error: prevError } = await supabase
        .from('requests')
        .select(SELECT_WITH_JOINS)
        .eq('id', request.id)
        .maybeSingle()
    if (prevError) throw new Error(prevError.message)
    if (!prev) throw new Error('Request not found')

    const next: Partial<RequestRow> = {
        ...requestToRow(request),
    }
    delete (next as Record<string, unknown>).id
    delete (next as Record<string, unknown>).workspace_id
    delete (next as Record<string, unknown>).tracking_id
    delete (next as Record<string, unknown>).created_at

    const { data, error } = await supabase
        .from('requests')
        .update(next)
        .eq('id', request.id)
        .select(SELECT_WITH_JOINS)
        .single()
    if (error || !data) throw new Error(error?.message ?? 'Update failed')

    // The Postgres trigger requests_after_update emits activity for status,
    // priority, category, department changes. The app remains responsible
    // for `field_updated` events on the freeform fields so per-field history
    // shows up in the timeline.
    const prevRow = prev as RequestJoinRow
    const trackedFields: (keyof RequestRow)[] = ['title', 'who', 'what', 'when_text', 'where_text', 'why', 'how', 'notes', 'due_date', 'requested_by_name', 'requested_by_email']
    for (const field of trackedFields) {
        if (prevRow[field] !== (data as RequestJoinRow)[field]) {
            await emitActivity({
                requestId: request.id,
                actorId: ctx.userId,
                action: 'field_updated',
                payload: { field, oldValue: prevRow[field], newValue: (data as RequestJoinRow)[field] },
            })
        }
    }

    return shape(data as unknown as RequestJoinRow)
}

export async function updateRequestStatus(id: string, status: Status): Promise<Request> {
    const { data, error } = await supabase
        .from('requests')
        .update({ status })
        .eq('id', id)
        .select(SELECT_WITH_JOINS)
        .single()
    if (error || !data) throw new Error(error?.message ?? 'Status update failed')
    return shape(data as unknown as RequestJoinRow)
}

export async function archiveRequest(id: string): Promise<Request> {
    return updateRequestStatus(id, 'archived')
}

export async function unarchiveRequest(id: string): Promise<Request> {
    return updateRequestStatus(id, 'submitted')
}

export async function deleteRequest(id: string): Promise<void> {
    const { error } = await supabase.from('requests').delete().eq('id', id)
    if (error) throw new Error(error.message)
}

export async function addRequestAssignee(requestId: string, userId: string, duty: string): Promise<void> {
    const ctx = getCurrentContext()
    const { error } = await supabase
        .from('request_assignees')
        .upsert({ request_id: requestId, user_id: userId, duty }, { onConflict: 'request_id,user_id' })
    if (error) throw new Error(error.message)

    await emitActivity({
        requestId,
        actorId: ctx.userId,
        action: 'assignee_added',
        payload: { userId, duty },
    })
}

export async function removeRequestAssignee(requestId: string, userId: string): Promise<void> {
    const ctx = getCurrentContext()
    const { error } = await supabase
        .from('request_assignees')
        .delete()
        .match({ request_id: requestId, user_id: userId })
    if (error) throw new Error(error.message)

    await emitActivity({
        requestId,
        actorId: ctx.userId,
        action: 'assignee_removed',
        payload: { userId },
    })
}
