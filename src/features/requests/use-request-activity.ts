import { useCallback, useEffect, useState } from 'react'
import { fetchActivityForRequest } from '@/data/fetch-activity'
import { mockStore } from '@/data/store/mock-store'
import type { ResolvedActivityEntry } from '@/types/activity'

export function useRequestActivity(requestId: string) {
    const [entries, setEntries] = useState<ResolvedActivityEntry[]>([])
    const [loading, setLoading] = useState(true)

    const refresh = useCallback(async () => {
        const list = await fetchActivityForRequest(requestId)
        setEntries(list)
    }, [requestId])

    useEffect(() => {
        let active = true
        ;(async () => {
            setLoading(true)
            await refresh()
            if (active) setLoading(false)
        })()

        const unsubscribe = mockStore('activity_logs').subscribe(() => {
            refresh()
        })
        return () => {
            active = false
            unsubscribe()
        }
    }, [refresh])

    return { entries, loading, refresh }
}
