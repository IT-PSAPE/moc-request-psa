import { useCallback, useEffect, useState } from 'react'
import { fetchCommentsForRequest } from '@/data/fetch-comments'
import { postComment, deleteComment } from '@/data/mutate-comments'
import { mockStore } from '@/data/store/mock-store'
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
        const unsubscribe = mockStore('comments').subscribe(() => {
            refresh()
        })
        return () => {
            active = false
            unsubscribe()
        }
    }, [refresh])

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
