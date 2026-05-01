import { mockStore } from './store/mock-store'
import { mapResolvedAssignee, type RequestAssigneeRow } from './map-assignee'
import { type ProfileRow } from './map-profile'
import type { ResolvedAssignee } from '@/types/requests'

export async function fetchAssigneesForRequest(requestId: string): Promise<ResolvedAssignee[]> {
    const rows = mockStore<RequestAssigneeRow>('request_assignees')
        .where(row => row.request_id === requestId)

    if (rows.length === 0) return []

    const profiles = mockStore<ProfileRow>('profiles').list()
    const byId = new Map(profiles.map(p => [p.id, p]))

    return rows
        .map(row => {
            const profile = byId.get(row.user_id)
            return profile ? mapResolvedAssignee(row, profile) : null
        })
        .filter((entry): entry is ResolvedAssignee => entry !== null)
}
