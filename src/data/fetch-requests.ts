import { supabase } from '@/lib/supabase'
import { mapRequest, type RequestRow } from './map-request'
import { type CategoryRow } from './map-category'
import { type DepartmentRow } from './map-department'
import type { Request, Status } from '@/types/requests'

type RequestJoinRow = RequestRow & {
    category: CategoryRow | null
    department: DepartmentRow | null
}

// Disambiguate the embed: requests has both a single-column FK and a
// composite (id, workspace_id) FK to each parent table, so PostgREST needs the
// FK name to know which relationship to follow.
const SELECT_WITH_JOINS =
    '*, category:categories!requests_category_id_fkey(*), department:departments!requests_department_id_fkey(*)'

function shape(rows: RequestJoinRow[]): Request[] {
    return rows.map(row => mapRequest(row, {
        category: row.category,
        department: row.department,
    }))
}

export async function fetchRequests(): Promise<Request[]> {
    // RLS limits to in-scope rows. We exclude archived/rejected from the
    // "active" view here — it's a UI filter, not a security one.
    const { data, error } = await supabase
        .from('requests')
        .select(SELECT_WITH_JOINS)
        .not('status', 'in', '("archived","rejected")')
        .order('due_date', { ascending: true, nullsFirst: false })
    if (error) throw new Error(error.message)
    return shape((data ?? []) as unknown as RequestJoinRow[])
}

export async function fetchRequestsByDepartment(departmentId: string): Promise<Request[]> {
    const { data, error } = await supabase
        .from('requests')
        .select(SELECT_WITH_JOINS)
        .eq('department_id', departmentId)
        .not('status', 'in', '("archived","rejected")')
        .order('due_date', { ascending: true, nullsFirst: false })
    if (error) throw new Error(error.message)
    return shape((data ?? []) as unknown as RequestJoinRow[])
}

export async function fetchArchivedRequests(): Promise<Request[]> {
    const { data, error } = await supabase
        .from('requests')
        .select(SELECT_WITH_JOINS)
        .eq('status', 'archived')
        .order('updated_at', { ascending: false })
    if (error) throw new Error(error.message)
    return shape((data ?? []) as unknown as RequestJoinRow[])
}

export async function fetchRequestsByStatus(status: Status): Promise<Request[]> {
    const { data, error } = await supabase
        .from('requests')
        .select(SELECT_WITH_JOINS)
        .eq('status', status)
        .order('due_date', { ascending: true, nullsFirst: false })
    if (error) throw new Error(error.message)
    return shape((data ?? []) as unknown as RequestJoinRow[])
}

export async function fetchRequestById(id: string): Promise<Request | null> {
    const { data, error } = await supabase
        .from('requests')
        .select(SELECT_WITH_JOINS)
        .eq('id', id)
        .maybeSingle()
    if (error) throw new Error(error.message)
    if (!data) return null
    return shape([data as unknown as RequestJoinRow])[0]
}
