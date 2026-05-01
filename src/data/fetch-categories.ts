import { mockStore } from './store/mock-store'
import { getCurrentContext } from './store/current-context'
import { mapCategory, type CategoryRow } from './map-category'
import type { Category } from '@/types/categories'

export async function fetchCategoriesForCurrentWorkspace(): Promise<Category[]> {
    const ctx = getCurrentContext()
    if (!ctx.activeWorkspaceId) return []
    return mockStore<CategoryRow>('categories')
        .where(row => row.workspace_id === ctx.activeWorkspaceId)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map(mapCategory)
}

export async function fetchPublicCategories(workspaceId: string): Promise<Category[]> {
    return mockStore<CategoryRow>('categories')
        .where(row => row.workspace_id === workspaceId && row.is_active)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map(mapCategory)
}
