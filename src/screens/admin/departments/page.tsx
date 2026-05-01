import { useDepartments } from '@/features/departments/department-provider'
import { DepartmentsTable } from '@/features/admin/departments-table'

export function AdminDepartmentsScreen() {
    const { state, actions } = useDepartments()
    return <DepartmentsTable departments={state.allDepartments} onSaved={actions.refresh} />
}
