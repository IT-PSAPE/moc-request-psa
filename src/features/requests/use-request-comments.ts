import { useCallback, useEffect, useState } from 'react'
import { fetchCommentsForRequest } from '@/data/fetch-comments'
import { postComment, deleteComment } from '@/data/mutate-comments'
import { supabase } from '@/lib/supabase'
import type { ResolvedComment } from '@/types/comments'

export function useRequestComments(requestId: string) {
    const [comments, setComments] = useState<ResolvedComment[]>([])
    const [loading, setLoading] = useState(true)

    const refresh = useCallback(async () => {
        const list = await fetchCommentsForRequest(requestId)
        setComments(list)
    }, [requestId])

    useEffect(() => {
        let active = true
        ;(async () => {
            setLoading(true)
            await refresh()
            if (active) setLoading(false)
        })()

        const channel = supabase
            .channel(`comments:${requestId}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'comments', filter: `request_id=eq.${requestId}` },
                () => { void refresh() },
            )
            .subscribe()

        return () => {
            active = false
            void supabase.removeChannel(channel)
        }
    }, [refresh, requestId])

    const post = useCallback(async (body: string) => {
        await postComment(requestId, body)
        await refresh()
    }, [requestId, refresh])

    const remove = useCallback(async (commentId: string) => {
        await deleteComment(commentId)
        await refresh()
    }, [refresh])

    return { comments, loading, post, remove }
}
