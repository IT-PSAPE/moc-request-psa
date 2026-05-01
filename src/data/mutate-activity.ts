import { mockStore } from './store/mock-store'

export type ActivityAction =
    | 'created'
    | 'status_changed'
    | 'priority_changed'
    | 'category_changed'
    | 'department_routed'
    | 'assignee_added'
    | 'assignee_removed'
    | 'field_updated'
    | 'comment_posted'

export type ActivityLogRow = {
    id: string
    request_id: string
    actor_id: string | null
    action: ActivityAction
    payload: Record<string, unknown>
    created_at: string
}

export type ActivityInput = {
    requestId: string
    actorId: string | null
    action: ActivityAction
    payload?: Record<string, unknown>
}

export function emitActivity(input: ActivityInput): ActivityLogRow {
    const row: ActivityLogRow = {
        id: crypto.randomUUID(),
        request_id: input.requestId,
        actor_id: input.actorId,
        action: input.action,
        payload: input.payload ?? {},
        created_at: new Date().toISOString(),
    }
    mockStore<ActivityLogRow>('activity_logs').insert(row)
    return row
}
