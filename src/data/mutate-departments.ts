import { mockStore } from './store/mock-store'
import { getCurrentContext } from './store/current-context'
import { mapDepartment, type DepartmentRow } from './map-department'
import { type DepartmentMemberRow } from './map-department-member'
import { type CategoryRow } from './map-category'
import { type RequestRow } from './map-request'
import type { Department } from '@/types/departments'

export type DepartmentInput = {
    name: string
    description: string | null
    colorKey: string
}

export async function createDepartment(input: DepartmentInput): Promise<Department> {
    const ctx = getCurrentContext()
    if (!ctx.activeWorkspaceId) throw new Error('No active workspace')

    const store = mockStore<DepartmentRow>('departments')
    const sortOrder = store.where(d => d.workspace_id === ctx.activeWorkspaceId).length

    const now = new Date().toISOString()
    const row: DepartmentRow = {
        id: crypto.randomUUID(),
        workspace_id: ctx.activeWorkspaceId,
        name: input.name.trim(),
        description: input.description?.trim() || null,
        color_key: input.colorKey,
        sort_order: sortOrder,
        created_at: now,
        updated_at: now,
    }
    store.insert(row)
    return mapDepartment(row)
}

export async function updateDepartment(id: string, input: DepartmentInput): Promise<Department> {
    const store = mockStore<DepartmentRow>('departments')
    const updated = store.update(id, {
        name: input.name.trim(),
        description: input.description?.trim() || null,
        color_key: input.colorKey,
        updated_at: new Date().toISOString(),
    })
    return mapDepartment(updated)
}

export async function deleteDepartment(id: string): Promise<void> {
    const store = mockStore<DepartmentRow>('departments')
    if (!store.find(id)) return
    store.delete(id)

    // Cascade: drop department memberships
    mockStore<DepartmentMemberRow>('department_members').deleteWhere(dm => dm.department_id === id)

    // Null out categories that pointed to this department as default
    const categoriesStore = mockStore<CategoryRow>('categories')
    for (const cat of categoriesStore.where(c => c.default_department_id === id)) {
        categoriesStore.update(cat.id, { default_department_id: null })
    }

    // Null out routing on requests
    const requestsStore = mockStore<RequestRow>('requests')
    for (const req of requestsStore.where(r => r.department_id === id)) {
        requestsStore.update(req.id, { department_id: null, updated_at: new Date().toISOString() })
    }
}
