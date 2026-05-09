import { supabase } from '@/lib/supabase'
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
}

type RpcResultRow = { tracking_id: string; request_id: string }

export async function submitPublicRequest(input: PublicSubmissionInput): Promise<PublicSubmissionResult> {
    const payload: Record<string, unknown> = {
        title: input.title.trim(),
        requestedByName: input.requestedByName.trim(),
        requestedByEmail: input.requestedByEmail?.trim() || null,
        priority: input.priority,
        dueDate: input.dueDate,
        who: input.who.trim(),
        what: input.what.trim(),
        when: input.when.trim(),
        where: input.where.trim(),
        why: input.why.trim(),
        how: input.how.trim(),
    }

    const { data, error } = await supabase.rpc('submit_public_request', {
        p_workspace_id: input.workspaceId,
        p_category_id: input.categoryId,
        p_payload: payload,
    })
    if (error) throw new Error(error.message)
    const rows = (data ?? []) as RpcResultRow[]
    const first = rows[0]
    if (!first) throw new Error('Submission RPC returned no row')
    return { trackingId: first.tracking_id, requestId: first.request_id }
}
