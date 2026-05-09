import { supabase } from '@/lib/supabase'
import { getCurrentContext } from './store/current-context'
import { mapDepartment, type DepartmentRow } from './map-department'
import type { Department } from '@/types/departments'

export type DepartmentInput = {
    name: string
    description: string | null
    colorKey: string
}

export async function createDepartment(input: DepartmentInput): Promise<Department> {
    const ctx = getCurrentContext()
    if (!ctx.activeWorkspaceId) throw new Error('No active workspace')

    const { count, error: countError } = await supabase
        .from('departments')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', ctx.activeWorkspaceId)
    if (countError) throw new Error(countError.message)
    const sortOrder = count ?? 0

    const { data, error } = await supabase
        .from('departments')
        .insert({
            workspace_id: ctx.activeWorkspaceId,
            name: input.name.trim(),
            description: input.description?.trim() || null,
            color_key: input.colorKey,
            sort_order: sortOrder,
        })
        .select('*')
        .single<DepartmentRow>()
    if (error || !data) throw new Error(error?.message ?? 'Department insert failed')
    return mapDepartment(data)
}

export async function updateDepartment(id: string, input: DepartmentInput): Promise<Department> {
    const { data, error } = await supabase
        .from('departments')
        .update({
            name: input.name.trim(),
            description: input.description?.trim() || null,
            color_key: input.colorKey,
        })
        .eq('id', id)
        .select('*')
        .single<DepartmentRow>()
    if (error || !data) throw new Error(error?.message ?? 'Department update failed')
    return mapDepartment(data)
}

export async function deleteDepartment(id: string): Promise<void> {
    // Phase-05 enforces ON DELETE RESTRICT on requests.department_id and
    // categories.default_department_id, so the database itself blocks the
    // delete if anything still references this row. Surface a friendly
    // message instead of the raw constraint error.
    const [{ count: requestCount, error: reqError }, { count: categoryCount, error: catError }] = await Promise.all([
        supabase.from('requests').select('*', { count: 'exact', head: true }).eq('department_id', id),
        supabase.from('categories').select('*', { count: 'exact', head: true }).eq('default_department_id', id),
    ])
    if (reqError) throw new Error(reqError.message)
    if (catError) throw new Error(catError.message)
    if ((requestCount ?? 0) > 0) {
        throw new Error(`Can't delete this department — ${requestCount} request(s) are routed to it. Reassign them first.`)
    }
    if ((categoryCount ?? 0) > 0) {
        throw new Error(`Can't delete this department — ${categoryCount} category(ies) use it as the default route. Update those first.`)
    }

    const { error } = await supabase.from('departments').delete().eq('id', id)
    if (error) throw new Error(error.message)
}
