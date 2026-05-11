import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useCurrentWorkspace } from '@/features/workspace/workspace-provider'
import { fetchWorkspaceMembers, type ResolvedMember } from '@/data/fetch-workspace-members'

type MembersContextValue = {
    state: {
        members: ResolvedMember[]
        activeMembers: ResolvedMember[]
        loading: boolean
    }
    actions: {
        refresh: () => Promise<void>
    }
}

const MembersContext = createContext<MembersContextValue | null>(null)

export function MembersProvider({ children }: { children: ReactNode }) {
    const { state: { workspace } } = useCurrentWorkspace()
    const [members, setMembers] = useState<ResolvedMember[]>([])
    const [loading, setLoading] = useState(true)

    const refresh = useCallback(async () => {
        if (!workspace) {
            setMembers([])
            setLoading(false)
            return
        }
        setLoading(true)
        const list = await fetchWorkspaceMembers()
        setMembers(list)
        setLoading(false)
    }, [workspace])

    useEffect(() => {
        let active = true
        queueMicrotask(() => {
            if (active) void refresh()
        })
        return () => { active = false }
    }, [refresh])

    const activeMembers = useMemo(
        () => members.filter(m => m.membership.status === 'active'),
        [members],
    )

    const value = useMemo<MembersContextValue>(() => ({
        state: { members, activeMembers, loading },
        actions: { refresh },
    }), [members, activeMembers, loading, refresh])

    return <MembersContext value={value}>{children}</MembersContext>
}

export function useMembers() {
    const ctx = useContext(MembersContext)
    if (!ctx) throw new Error('useMembers must be used within a MembersProvider')
    return ctx
}
