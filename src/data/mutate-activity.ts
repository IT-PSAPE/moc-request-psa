import { supabase } from '@/lib/supabase'

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

// Most activity (created, status_changed, priority_changed, category_changed,
// department_routed) is emitted server-side by the requests_after_insert /
// requests_after_update triggers in phase-07. The app keeps emitting:
//   • assignee_added / assignee_removed  — written from mutate-requests
//   • comment_posted                     — written from mutate-comments
//   • field_updated                      — written from mutate-requests for freeform fields
export async function emitActivity(input: ActivityInput): Promise<ActivityLogRow> {
    // RLS requires actor_id = auth.uid() on insert, so a null actorId is
    // guaranteed to fail. Surface a readable error instead of the raw RLS bounce.
    if (!input.actorId) throw new Error('You must be signed in to record activity')

    const { data, error } = await supabase
        .from('activity_logs')
        .insert({
            request_id: input.requestId,
            actor_id: input.actorId,
            action: input.action,
            payload: input.payload ?? {},
        })
        .select('*')
        .single<ActivityLogRow>()
    if (error || !data) throw new Error(error?.message ?? 'Activity insert failed')
    return data
}
