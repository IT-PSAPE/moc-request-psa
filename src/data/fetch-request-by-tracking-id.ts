import { mockStore } from './store/mock-store'
import { type RequestRow } from './map-request'
import { type CategoryRow } from './map-category'
import { type DepartmentRow } from './map-department'
import { type WorkspaceRow } from './map-workspace'
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

export async function fetchRequestByTrackingId(trackingId: string): Promise<PublicTrackedRequest | null> {
    const normalized = trackingId.trim().toUpperCase()
    if (!normalized) return null

    const row = mockStore<RequestRow>('requests').findOne(r => r.tracking_id === normalized)
    if (!row) return null

    const workspace = mockStore<WorkspaceRow>('workspaces').find(row.workspace_id)
    if (!workspace) return null

    const category = row.category_id
        ? mockStore<CategoryRow>('categories').find(row.category_id) ?? null
        : null
    const department = row.department_id
        ? mockStore<DepartmentRow>('departments').find(row.department_id) ?? null
        : null

    return {
        trackingId: row.tracking_id,
        title: row.title,
        status: row.status,
        priority: row.priority,
        categoryLabel: category?.label ?? null,
        categoryColor: category?.color_key ?? 'gray',
        departmentName: department?.name ?? null,
        workspaceName: workspace.name,
        requestedByName: row.requested_by_name,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    }
}
