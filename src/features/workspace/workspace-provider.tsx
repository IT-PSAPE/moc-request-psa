import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useAuth } from '@/lib/auth-context'
import { fetchWorkspaceById, fetchWorkspaceRoleById } from '@/data/fetch-workspaces'
import { setActiveWorkspaceId } from '@/data/store/current-context'
import type { Workspace, WorkspaceRole } from '@/types/workspaces'

type WorkspaceContextValue = {
    state: {
        workspace: Workspace | null
        role: WorkspaceRole | null
        loading: boolean
    }
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

export function WorkspaceProvider({ children }: { children: ReactNode }) {
    const { activeMembership } = useAuth()
    const [workspace, setWorkspace] = useState<Workspace | null>(null)
    const [role, setRole] = useState<WorkspaceRole | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let active = true

        async function load() {
            if (!activeMembership || activeMembership.status !== 'active') {
                setActiveWorkspaceId(null)
                setWorkspace(null)
                setRole(null)
                setLoading(false)
                return
            }

            setLoading(true)
            setActiveWorkspaceId(activeMembership.workspaceId)

            const [ws, r] = await Promise.all([
                fetchWorkspaceById(activeMembership.workspaceId),
                activeMembership.workspaceRoleId
                    ? fetchWorkspaceRoleById(activeMembership.workspaceRoleId)
                    : Promise.resolve(null),
            ])

            if (!active) return
            setWorkspace(ws)
            setRole(r)
            setLoading(false)
        }

        load()
        return () => { active = false }
    }, [activeMembership])

    const value = useMemo<WorkspaceContextValue>(() => ({
        state: { workspace, role, loading },
    }), [workspace, role, loading])

    return <WorkspaceContext value={value}>{children}</WorkspaceContext>
}

export function useCurrentWorkspace(): WorkspaceContextValue['state'] {
    const ctx = useContext(WorkspaceContext)
    if (!ctx) throw new Error('useCurrentWorkspace must be used within a WorkspaceProvider')
    return ctx.state
}
