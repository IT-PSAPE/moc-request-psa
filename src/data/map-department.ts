import type { Department } from '@/types/departments'

export type DepartmentRow = {
    id: string
    workspace_id: string
    name: string
    description: string | null
    color_key: string
    sort_order: number
    created_at: string
    updated_at: string
}

export function mapDepartment(row: DepartmentRow): Department {
    return {
        id: row.id,
        workspaceId: row.workspace_id,
        name: row.name,
        description: row.description,
        colorKey: row.color_key,
        sortOrder: row.sort_order,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    }
}
