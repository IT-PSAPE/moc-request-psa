import { Spinner } from '@/components/feedback/spinner'
import { useDepartments } from '@/features/departments/department-provider'
import { useCategories } from '@/features/categories/categories-provider'
import { CategoriesTable } from '@/features/admin/categories-table'

export function AdminCategoriesScreen() {
    const { state: deptState } = useDepartments()
    const { state: catState, actions: catActions } = useCategories()

    if (catState.loading) {
        return (
            <div className="flex min-h-full items-center justify-center p-12">
                <Spinner size="lg" />
            </div>
        )
    }

    return <CategoriesTable categories={catState.categories} departments={deptState.allDepartments} onSaved={catActions.refresh} />
}
