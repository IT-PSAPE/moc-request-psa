import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useCurrentWorkspace } from '@/features/workspace/workspace-provider'
import { fetchUserDepartments, fetchDepartmentsForCurrentWorkspace } from '@/data/fetch-departments'
import type { Department } from '@/types/departments'

type DepartmentContextValue = {
    state: {
        userDepartments: Department[]
        allDepartments: Department[]
        loading: boolean
    }
    actions: {
        refresh: () => Promise<void>
    }
}

const DepartmentContext = createContext<DepartmentContextValue | null>(null)

export function DepartmentProvider({ children }: { children: ReactNode }) {
    const { workspace } = useCurrentWorkspace()
    const [userDepartments, setUserDepartments] = useState<Department[]>([])
    const [allDepartments, setAllDepartments] = useState<Department[]>([])
    const [loading, setLoading] = useState(true)

    const refresh = useCallback(async () => {
        if (!workspace) {
            setUserDepartments([])
            setAllDepartments([])
            setLoading(false)
            return
        }
        setLoading(true)
        const [mine, all] = await Promise.all([
            fetchUserDepartments(),
            fetchDepartmentsForCurrentWorkspace(),
        ])
        setUserDepartments(mine)
        setAllDepartments(all)
        setLoading(false)
    }, [workspace])

    useEffect(() => {
        let active = true
        queueMicrotask(() => {
            if (active) void refresh()
        })
        return () => { active = false }
    }, [refresh])

    const value = useMemo<DepartmentContextValue>(() => ({
        state: { userDepartments, allDepartments, loading },
        actions: { refresh },
    }), [userDepartments, allDepartments, loading, refresh])

    return <DepartmentContext value={value}>{children}</DepartmentContext>
}

export function useDepartments() {
    const ctx = useContext(DepartmentContext)
    if (!ctx) throw new Error('useDepartments must be used within a DepartmentProvider')
    return ctx
}
