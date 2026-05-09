import { supabase } from '@/lib/supabase'
import { getCurrentContext } from './store/current-context'
import { mapComment, type CommentRow } from './map-comment'
import { emitActivity } from './mutate-activity'
import type { Comment } from '@/types/comments'

export async function postComment(requestId: string, body: string): Promise<Comment> {
    const ctx = getCurrentContext()
    if (!ctx.userId) throw new Error('You must be signed in to comment')
    const trimmed = body.trim()
    if (!trimmed) throw new Error('Comment body required')

    const { data, error } = await supabase
        .from('comments')
        .insert({
            request_id: requestId,
            author_id: ctx.userId,
            body: trimmed,
        })
        .select('*')
        .single<CommentRow>()
    if (error || !data) throw new Error(error?.message ?? 'Comment insert failed')

    await emitActivity({
        requestId,
        actorId: ctx.userId,
        action: 'comment_posted',
        payload: { commentId: data.id, excerpt: trimmed.slice(0, 80) },
    })

    return mapComment(data)
}

export async function deleteComment(commentId: string): Promise<void> {
    const { error } = await supabase.from('comments').delete().eq('id', commentId)
    if (error) throw new Error(error.message)
}
