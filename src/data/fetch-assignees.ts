import { supabase } from '@/lib/supabase'
import { mapResolvedAssignee, type RequestAssigneeRow } from './map-assignee'
import { type ProfileRow } from './map-profile'
import type { ResolvedAssignee } from '@/types/requests'

type AssigneeJoinRow = RequestAssigneeRow & { profile: ProfileRow | null }

export async function fetchAssigneesForRequest(requestId: string): Promise<ResolvedAssignee[]> {
    const { data, error } = await supabase
        .from('request_assignees')
        .select('*, profile:profiles(*)')
        .eq('request_id', requestId)
    if (error) throw new Error(error.message)

    const rows = (data ?? []) as unknown as AssigneeJoinRow[]
    return rows
        .map(row => (row.profile ? mapResolvedAssignee(row, row.profile) : null))
        .filter((entry): entry is ResolvedAssignee => entry !== null)
}
