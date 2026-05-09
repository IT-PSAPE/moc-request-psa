import { supabase } from '@/lib/supabase'
import { getCurrentContext } from './store/current-context'
import { mapDepartment, type DepartmentRow } from './map-department'
import { mapDepartmentMember, type DepartmentMemberRow } from './map-department-member'
import type { Department, DepartmentMember } from '@/types/departments'

export async function fetchDepartmentsForCurrentWorkspace(): Promise<Department[]> {
    const ctx = getCurrentContext()
    if (!ctx.activeWorkspaceId) return []
    const { data, error } = await supabase
        .from('departments')
        .select('*')
        .eq('workspace_id', ctx.activeWorkspaceId)
        .order('sort_order', { ascending: true })
    if (error) throw new Error(error.message)
    return (data ?? []).map(row => mapDepartment(row as DepartmentRow))
}

export async function fetchUserDepartments(): Promise<Department[]> {
    const ctx = getCurrentContext()
    if (!ctx.activeWorkspaceId || !ctx.userId) return []

    const { data: memberRows, error: memberError } = await supabase
        .from('department_members')
        .select('department_id')
        .eq('user_id', ctx.userId)
    if (memberError) throw new Error(memberError.message)
    const ids = (memberRows ?? []).map(r => (r as { department_id: string }).department_id)
    if (ids.length === 0) return []

    const { data, error } = await supabase
        .from('departments')
        .select('*')
        .eq('workspace_id', ctx.activeWorkspaceId)
        .in('id', ids)
        .order('sort_order', { ascending: true })
    if (error) throw new Error(error.message)
    return (data ?? []).map(row => mapDepartment(row as DepartmentRow))
}

export async function fetchDepartmentById(id: string): Promise<Department | null> {
    const ctx = getCurrentContext()
    const { data, error } = await supabase
        .from('departments')
        .select('*')
        .eq('id', id)
        .maybeSingle<DepartmentRow>()
    if (error) throw new Error(error.message)
    if (!data) return null
    if (ctx.activeWorkspaceId && data.workspace_id !== ctx.activeWorkspaceId) return null
    return mapDepartment(data)
}

export async function fetchDepartmentMembers(departmentId: string): Promise<DepartmentMember[]> {
    const { data, error } = await supabase
        .from('department_members')
        .select('*')
        .eq('department_id', departmentId)
    if (error) throw new Error(error.message)
    return (data ?? []).map(row => mapDepartmentMember(row as DepartmentMemberRow))
}
