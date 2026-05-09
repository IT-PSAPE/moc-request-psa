import { supabase } from '@/lib/supabase'
import { mapComment, type CommentRow } from './map-comment'
import { type ProfileRow } from './map-profile'
import type { ResolvedComment } from '@/types/comments'

type CommentJoinRow = CommentRow & { author: ProfileRow | null }

function initialsOf(profile: ProfileRow): string {
    const a = profile.name[0] ?? ''
    const b = profile.surname?.[0] ?? ''
    return `${a}${b}`.trim() || a || '?'
}

export async function fetchCommentsForRequest(requestId: string): Promise<ResolvedComment[]> {
    const { data, error } = await supabase
        .from('comments')
        .select('*, author:profiles!comments_author_id_fkey(*)')
        .eq('request_id', requestId)
        .order('created_at', { ascending: true })
    if (error) throw new Error(error.message)

    const rows = (data ?? []) as unknown as CommentJoinRow[]
    return rows
        .map(row => {
            if (!row.author) return null
            const comment = mapComment(row)
            return {
                ...comment,
                authorName: [row.author.name, row.author.surname].filter(Boolean).join(' '),
                authorEmail: row.author.email,
                authorInitials: initialsOf(row.author),
            }
        })
        .filter((c): c is ResolvedComment => c !== null)
}
