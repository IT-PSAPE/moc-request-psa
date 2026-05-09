import { supabase } from '@/lib/supabase'
import type { Priority, Status } from '@/types/requests'

export type PublicTrackedRequest = {
    trackingId: string
    title: string
    status: Status
    priority: Priority
    categoryLabel: string | null
    categoryColor: string
    departmentName: string | null
    workspaceName: string
    requestedByName: string
    createdAt: string
    updatedAt: string
}

type RpcRow = {
    tracking_id: string
    title: string
    status: Status
    priority: Priority
    category_label: string | null
    category_color: string | null
    department_name: string | null
    workspace_name: string
    requested_by_name: string
    created_at: string
    updated_at: string
}

export async function fetchRequestByTrackingId(trackingId: string): Promise<PublicTrackedRequest | null> {
    const normalized = trackingId.trim().toUpperCase()
    if (!normalized) return null

    const { data, error } = await supabase.rpc('lookup_request_by_tracking_id', {
        p_tracking_id: normalized,
    })
    if (error) throw new Error(error.message)
    const rows = (data ?? []) as RpcRow[]
    const row = rows[0]
    if (!row) return null

    return {
        trackingId: row.tracking_id,
        title: row.title,
        status: row.status,
        priority: row.priority,
        categoryLabel: row.category_label,
        categoryColor: row.category_color ?? 'gray',
        departmentName: row.department_name,
        workspaceName: row.workspace_name,
        requestedByName: row.requested_by_name,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    }
}
