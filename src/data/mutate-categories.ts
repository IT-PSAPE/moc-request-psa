import { supabase } from '@/lib/supabase'
import { getCurrentContext } from './store/current-context'
import { mapCategory, type CategoryRow } from './map-category'
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

    const { count, error: countError } = await supabase
        .from('categories')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', ctx.activeWorkspaceId)
    if (countError) throw new Error(countError.message)

    const { data, error } = await supabase
        .from('categories')
        .insert({
            workspace_id: ctx.activeWorkspaceId,
            label: input.label.trim(),
            color_key: input.colorKey,
            default_department_id: input.defaultDepartmentId,
            sort_order: count ?? 0,
            is_active: input.isActive,
        })
        .select('*')
        .single<CategoryRow>()
    if (error || !data) throw new Error(error?.message ?? 'Category insert failed')
    return mapCategory(data)
}

export async function updateCategory(id: string, input: CategoryInput): Promise<Category> {
    const { data, error } = await supabase
        .from('categories')
        .update({
            label: input.label.trim(),
            color_key: input.colorKey,
            default_department_id: input.defaultDepartmentId,
            is_active: input.isActive,
        })
        .eq('id', id)
        .select('*')
        .single<CategoryRow>()
    if (error || !data) throw new Error(error?.message ?? 'Category update failed')
    return mapCategory(data)
}

export async function deleteCategory(id: string): Promise<void> {
    // requests.category_id is ON DELETE SET NULL, so the FK takes care of orphan cleanup.
    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (error) throw new Error(error.message)
}
