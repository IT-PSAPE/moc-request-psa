import { mockStore } from './store/mock-store'
import { getCurrentContext } from './store/current-context'
import { mapComment, type CommentRow } from './map-comment'
import { emitActivity } from './mutate-activity'
import type { Comment } from '@/types/comments'

export async function postComment(requestId: string, body: string): Promise<Comment> {
    const ctx = getCurrentContext()
    if (!ctx.userId) throw new Error('You must be signed in to comment')
    const trimmed = body.trim()
    if (!trimmed) throw new Error('Comment body required')

    const now = new Date().toISOString()
    const row: CommentRow = {
        id: crypto.randomUUID(),
        request_id: requestId,
        author_id: ctx.userId,
        body: trimmed,
        created_at: now,
        updated_at: now,
    }
    mockStore<CommentRow>('comments').insert(row)

    emitActivity({
        requestId,
        actorId: ctx.userId,
        action: 'comment_posted',
        payload: { commentId: row.id, excerpt: trimmed.slice(0, 80) },
    })

    return mapComment(row)
}

export async function deleteComment(commentId: string): Promise<void> {
    mockStore<CommentRow>('comments').delete(commentId)
}
