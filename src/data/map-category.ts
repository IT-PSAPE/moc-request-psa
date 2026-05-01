import type { Category } from '@/types/categories'

export type CategoryRow = {
    id: string
    workspace_id: string
    label: string
    color_key: string
    default_department_id: string | null
    sort_order: number
    is_active: boolean
}

export function mapCategory(row: CategoryRow): Category {
    return {
        id: row.id,
        workspaceId: row.workspace_id,
        label: row.label,
        colorKey: row.color_key,
        defaultDepartmentId: row.default_department_id,
        sortOrder: row.sort_order,
        isActive: row.is_active,
    }
}
