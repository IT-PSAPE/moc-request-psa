import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { fetchArchivedRequests, fetchRequestById, fetchRequests } from '@/data/fetch-requests'
import { useCurrentWorkspace } from '@/features/workspace/workspace-provider'
import type { Request } from '@/types/requests'

type RequestsContextValue = {
    state: {
        activeRequests: Request[]
        archivedRequests: Request[]
        requestsById: Record<string, Request>
        isLoadingActive: boolean
        isLoadingArchived: boolean
    }
    actions: {
        loadActiveRequests: () => Promise<void>
        loadArchivedRequests: () => Promise<void>
        loadRequest: (id: string) => Promise<void>
        syncRequest: (request: Request) => void
        removeRequest: (id: string) => void
        reset: () => void
    }
}

const RequestsContext = createContext<RequestsContextValue | null>(null)

function mergeRequests(previous: Record<string, Request>, requests: Request[]) {
    const next = { ...previous }
    for (const request of requests) next[request.id] = request
    return next
}

export function RequestsProvider({ children }: { children: ReactNode }) {
    const { workspace } = useCurrentWorkspace()
    const [requestsById, setRequestsById] = useState<Record<string, Request>>({})
    const [isLoadingActive, setIsLoadingActive] = useState(false)
    const [isLoadingArchived, setIsLoadingArchived] = useState(false)
    const requestsByIdRef = useRef<Record<string, Request>>({})
    const activeLoadedRef = useRef(false)
    const archivedLoadedRef = useRef(false)
    const activePromiseRef = useRef<Promise<void> | null>(null)
    const archivedPromiseRef = useRef<Promise<void> | null>(null)

    useEffect(() => {
        requestsByIdRef.current = requestsById
    }, [requestsById])

    const reset = useCallback(() => {
        setRequestsById({})
        activeLoadedRef.current = false
        archivedLoadedRef.current = false
        activePromiseRef.current = null
        archivedPromiseRef.current = null
    }, [])

    useEffect(() => {
        let active = true
        queueMicrotask(() => {
            if (!active) return
            reset()
            if (!workspace?.id) return
            if (activeLoadedRef.current) return
            setIsLoadingActive(true)
            activePromiseRef.current = fetchRequests()
                .then(requests => {
                    if (!active) return
                    setRequestsById(prev => mergeRequests(prev, requests))
                    activeLoadedRef.current = true
                })
                .finally(() => {
                    activePromiseRef.current = null
                    if (active) setIsLoadingActive(false)
                })
        })
        return () => { active = false }
    }, [workspace?.id, reset])

    const syncRequest = useCallback((request: Request) => {
        setRequestsById(prev => ({ ...prev, [request.id]: request }))
    }, [])

    const removeRequest = useCallback((id: string) => {
        setRequestsById(prev => {
            const next = { ...prev }
            delete next[id]
            return next
        })
    }, [])

    const loadActiveRequests = useCallback(async () => {
        if (activeLoadedRef.current) return
        if (activePromiseRef.current) return activePromiseRef.current

        setIsLoadingActive(true)
        activePromiseRef.current = fetchRequests()
            .then(requests => {
                setRequestsById(prev => mergeRequests(prev, requests))
                activeLoadedRef.current = true
            })
            .finally(() => {
                activePromiseRef.current = null
                setIsLoadingActive(false)
            })

        return activePromiseRef.current
    }, [])

    const loadArchivedRequests = useCallback(async () => {
        if (archivedLoadedRef.current) return
        if (archivedPromiseRef.current) return archivedPromiseRef.current

        setIsLoadingArchived(true)
        archivedPromiseRef.current = fetchArchivedRequests()
            .then(requests => {
                setRequestsById(prev => mergeRequests(prev, requests))
                archivedLoadedRef.current = true
            })
            .finally(() => {
                archivedPromiseRef.current = null
                setIsLoadingArchived(false)
            })

        return archivedPromiseRef.current
    }, [])

    const loadRequest = useCallback(async (id: string) => {
        if (requestsByIdRef.current[id]) return
        const request = await fetchRequestById(id)
        if (!request) return
        setRequestsById(prev => ({ ...prev, [request.id]: request }))
    }, [])

    const activeRequests = useMemo(
        () => Object.values(requestsById).filter(r => r.status !== 'archived' && r.status !== 'rejected'),
        [requestsById],
    )
    const archivedRequests = useMemo(
        () => Object.values(requestsById).filter(r => r.status === 'archived'),
        [requestsById],
    )

    const value = useMemo<RequestsContextValue>(() => ({
        state: { activeRequests, archivedRequests, requestsById, isLoadingActive, isLoadingArchived },
        actions: { loadActiveRequests, loadArchivedRequests, loadRequest, syncRequest, removeRequest, reset },
    }), [
        activeRequests, archivedRequests, requestsById, isLoadingActive, isLoadingArchived,
        loadActiveRequests, loadArchivedRequests, loadRequest, syncRequest, removeRequest, reset,
    ])

    return <RequestsContext value={value}>{children}</RequestsContext>
}

export function useRequests() {
    const ctx = useContext(RequestsContext)
    if (!ctx) throw new Error('useRequests must be used within a RequestsProvider')
    return ctx
}
