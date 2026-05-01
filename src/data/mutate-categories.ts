import { mockStore } from './store/mock-store'
import { getCurrentContext } from './store/current-context'
import { mapCategory, type CategoryRow } from './map-category'
import { type RequestRow } from './map-request'
import type { Category } from '@/types/categories'

export type CategoryInput = {
    label: string
    colorKey: string
    defaultDepartmentId: string | null
    isActive: boolean
}

export async function createCategory(input: CategoryInput): Promise<Category> {
    const ctx = getCurrentContext()
    if (!ctx.activeWorkspaceId) throw new Error('No active workspace')

    const store = mockStore<CategoryRow>('categories')
    const sortOrder = store.where(c => c.workspace_id === ctx.activeWorkspaceId).length

    const row: CategoryRow = {
        id: crypto.randomUUID(),
        workspace_id: ctx.activeWorkspaceId,
        label: input.label.trim(),
        color_key: input.colorKey,
        default_department_id: input.defaultDepartmentId,
        sort_order: sortOrder,
        is_active: input.isActive,
    }
    store.insert(row)
    return mapCategory(row)
}

export async function updateCategory(id: string, input: CategoryInput): Promise<Category> {
    const store = mockStore<CategoryRow>('categories')
    const updated = store.update(id, {
        label: input.label.trim(),
        color_key: input.colorKey,
        default_department_id: input.defaultDepartmentId,
        is_active: input.isActive,
    })
    return mapCategory(updated)
}

export async function deleteCategory(id: string): Promise<void> {
    const store = mockStore<CategoryRow>('categories')
    if (!store.find(id)) return
    store.delete(id)

    // Null out the FK on existing requests
    const requestsStore = mockStore<RequestRow>('requests')
    for (const req of requestsStore.where(r => r.category_id === id)) {
        requestsStore.update(req.id, { category_id: null, updated_at: new Date().toISOString() })
    }
}
