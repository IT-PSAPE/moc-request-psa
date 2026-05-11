import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useCurrentWorkspace } from '@/features/workspace/workspace-provider'
import { supabase } from '@/lib/supabase'
import { mapWorkspaceRole, type WorkspaceRoleRow } from '@/data/map-workspace-role'
import type { WorkspaceRole } from '@/types/workspaces'

type WorkspaceRolesContextValue = {
    state: {
        roles: WorkspaceRole[]
        loading: boolean
    }
    actions: {
        refresh: () => Promise<void>
    }
}

const WorkspaceRolesContext = createContext<WorkspaceRolesContextValue | null>(null)

export function WorkspaceRolesProvider({ children }: { children: ReactNode }) {
    const { state: { workspace } } = useCurrentWorkspace()
    const [roles, setRoles] = useState<WorkspaceRole[]>([])
    const [loading, setLoading] = useState(true)

    const refresh = useCallback(async () => {
        if (!workspace) {
            setRoles([])
            setLoading(false)
            return
        }
        setLoading(true)
        const { data, error } = await supabase
            .from('workspace_roles')
            .select('*')
            .eq('workspace_id', workspace.id)
        if (error) throw new Error(error.message)
        setRoles((data ?? []).map(r => mapWorkspaceRole(r as WorkspaceRoleRow)))
        setLoading(false)
    }, [workspace])

    useEffect(() => {
        let active = true
        queueMicrotask(() => {
            if (active) void refresh()
        })
        return () => { active = false }
    }, [refresh])

    const value = useMemo<WorkspaceRolesContextValue>(() => ({
        state: { roles, loading },
        actions: { refresh },
    }), [roles, loading, refresh])

    return <WorkspaceRolesContext value={value}>{children}</WorkspaceRolesContext>
}

export function useWorkspaceRoles() {
    const ctx = useContext(WorkspaceRolesContext)
    if (!ctx) throw new Error('useWorkspaceRoles must be used within a WorkspaceRolesProvider')
    return ctx
}
