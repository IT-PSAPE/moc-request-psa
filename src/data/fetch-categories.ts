import { supabase } from '@/lib/supabase'
import { getCurrentContext } from './store/current-context'
import { mapCategory, type CategoryRow } from './map-category'
import type { Category } from '@/types/categories'

export async function fetchCategoriesForCurrentWorkspace(): Promise<Category[]> {
    const ctx = getCurrentContext()
    if (!ctx.activeWorkspaceId) return []
    const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('workspace_id', ctx.activeWorkspaceId)
        .order('sort_order', { ascending: true })
    if (error) throw new Error(error.message)
    return (data ?? []).map(row => mapCategory(row as CategoryRow))
}

export async function fetchPublicCategories(workspaceId: string): Promise<Category[]> {
    // Anon-friendly RPC: the public submit form runs before any auth.
    const { data, error } = await supabase.rpc('list_public_categories', { p_workspace_id: workspaceId })
    if (error) throw new Error(error.message)
    const rows = (data ?? []) as CategoryRow[]
    return rows.map(mapCategory)
}
