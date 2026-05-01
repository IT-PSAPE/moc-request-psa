import { mockStore } from './store/mock-store'
import { mapComment, type CommentRow } from './map-comment'
import { type ProfileRow } from './map-profile'
import type { ResolvedComment } from '@/types/comments'

function initialsOf(profile: ProfileRow): string {
    const a = profile.name[0] ?? ''
    const b = profile.surname?.[0] ?? ''
    return `${a}${b}`.trim() || a || '?'
}

export async function fetchCommentsForRequest(requestId: string): Promise<ResolvedComment[]> {
    const rows = mockStore<CommentRow>('comments').where(c => c.request_id === requestId)
    if (rows.length === 0) return []

    const profilesById = new Map(mockStore<ProfileRow>('profiles').list().map(p => [p.id, p]))

    return rows
        .map(row => {
            const profile = profilesById.get(row.author_id)
            if (!profile) return null
            const comment = mapComment(row)
            return {
                ...comment,
                authorName: [profile.name, profile.surname].filter(Boolean).join(' '),
                authorEmail: profile.email,
                authorInitials: initialsOf(profile),
            }
        })
        .filter((c): c is ResolvedComment => c !== null)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}
