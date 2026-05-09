import { useCallback, useEffect, useState } from 'react'
import { fetchActivityForRequest } from '@/data/fetch-activity'
import { supabase } from '@/lib/supabase'
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

        const channel = supabase
            .channel(`activity:${requestId}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'activity_logs', filter: `request_id=eq.${requestId}` },
                () => { void refresh() },
            )
            .subscribe()

        return () => {
            active = false
            void supabase.removeChannel(channel)
        }
    }, [refresh, requestId])

    return { entries, loading, refresh }
}
