import { useCallback, useEffect, useState } from 'react'
import { Spinner } from '@/components/feedback/spinner'
import { fetchCategoriesForCurrentWorkspace } from '@/data/fetch-categories'
import { useDepartments } from '@/features/departments/department-provider'
import { CategoriesTable } from '@/features/admin/categories-table'
import type { Category } from '@/types/categories'

export function AdminCategoriesScreen() {
    const { state: deptState } = useDepartments()
    const [categories, setCategories] = useState<Category[]>([])
    const [loading, setLoading] = useState(true)

    const refresh = useCallback(async () => {
        const list = await fetchCategoriesForCurrentWorkspace()
        setCategories(list)
    }, [])

    useEffect(() => {
        let active = true
        ;(async () => {
            setLoading(true)
            await refresh()
            if (active) setLoading(false)
        })()
        return () => { active = false }
    }, [refresh])

    if (loading) {
        return (
            <div className="flex min-h-full items-center justify-center p-12">
                <Spinner size="lg" />
            </div>
        )
    }

    return <CategoriesTable categories={categories} departments={deptState.allDepartments} onSaved={refresh} />
}
