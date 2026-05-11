import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useCurrentWorkspace } from '@/features/workspace/workspace-provider'
import { fetchCategoriesForCurrentWorkspace } from '@/data/fetch-categories'
import type { Category } from '@/types/categories'

type CategoriesContextValue = {
    state: {
        categories: Category[]
        loading: boolean
    }
    actions: {
        refresh: () => Promise<void>
    }
}

const CategoriesContext = createContext<CategoriesContextValue | null>(null)

export function CategoriesProvider({ children }: { children: ReactNode }) {
    const { state: { workspace } } = useCurrentWorkspace()
    const [categories, setCategories] = useState<Category[]>([])
    const [loading, setLoading] = useState(true)

    const refresh = useCallback(async () => {
        if (!workspace) {
            setCategories([])
            setLoading(false)
            return
        }
        setLoading(true)
        const list = await fetchCategoriesForCurrentWorkspace()
        setCategories(list)
        setLoading(false)
    }, [workspace])

    useEffect(() => {
        let active = true
        queueMicrotask(() => {
            if (active) void refresh()
        })
        return () => { active = false }
    }, [refresh])

    const value = useMemo<CategoriesContextValue>(() => ({
        state: { categories, loading },
        actions: { refresh },
    }), [categories, loading, refresh])

    return <CategoriesContext value={value}>{children}</CategoriesContext>
}

export function useCategories() {
    const ctx = useContext(CategoriesContext)
    if (!ctx) throw new Error('useCategories must be used within a CategoriesProvider')
    return ctx
}
