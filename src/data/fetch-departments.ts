import { mockStore } from './store/mock-store'
import { getCurrentContext } from './store/current-context'
import { mapDepartment, type DepartmentRow } from './map-department'
import { mapDepartmentMember, type DepartmentMemberRow } from './map-department-member'
import type { Department, DepartmentMember } from '@/types/departments'

export async function fetchDepartmentsForCurrentWorkspace(): Promise<Department[]> {
    const ctx = getCurrentContext()
    if (!ctx.activeWorkspaceId) return []
    return mockStore<DepartmentRow>('departments')
        .where(row => row.workspace_id === ctx.activeWorkspaceId)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map(mapDepartment)
}

export async function fetchUserDepartments(): Promise<Department[]> {
    const ctx = getCurrentContext()
    if (!ctx.activeWorkspaceId || !ctx.userId) return []

    const memberRows = mockStore<DepartmentMemberRow>('department_members')
        .where(row => row.user_id === ctx.userId)

    if (memberRows.length === 0) return []
    const memberDeptIds = new Set(memberRows.map(r => r.department_id))

    return mockStore<DepartmentRow>('departments')
        .where(row => row.workspace_id === ctx.activeWorkspaceId && memberDeptIds.has(row.id))
        .sort((a, b) => a.sort_order - b.sort_order)
        .map(mapDepartment)
}

export async function fetchDepartmentById(id: string): Promise<Department | null> {
    const ctx = getCurrentContext()
    const row = mockStore<DepartmentRow>('departments').find(id)
    if (!row || row.workspace_id !== ctx.activeWorkspaceId) return null
    return mapDepartment(row)
}

export async function fetchDepartmentMembers(departmentId: string): Promise<DepartmentMember[]> {
    return mockStore<DepartmentMemberRow>('department_members')
        .where(row => row.department_id === departmentId)
        .map(mapDepartmentMember)
}
