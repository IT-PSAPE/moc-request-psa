import { mockStore } from './store/mock-store'
import { type ActivityLogRow } from './mutate-activity'
import { type ProfileRow } from './map-profile'
import type { ResolvedActivityEntry } from '@/types/activity'

function initialsOf(profile: ProfileRow): string {
    const a = profile.name[0] ?? ''
    const b = profile.surname?.[0] ?? ''
    return `${a}${b}`.trim() || a || '?'
}

export async function fetchActivityForRequest(requestId: string): Promise<ResolvedActivityEntry[]> {
    const rows = mockStore<ActivityLogRow>('activity_logs').where(a => a.request_id === requestId)
    if (rows.length === 0) return []

    const profilesById = new Map(mockStore<ProfileRow>('profiles').list().map(p => [p.id, p]))

    return rows
        .map(row => {
            const profile = row.actor_id ? profilesById.get(row.actor_id) : null
            return {
                id: row.id,
                requestId: row.request_id,
                actorId: row.actor_id,
                action: row.action,
                payload: row.payload,
                createdAt: row.created_at,
                actorName: profile ? [profile.name, profile.surname].filter(Boolean).join(' ') : null,
                actorInitials: profile ? initialsOf(profile) : null,
            }
        })
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}
