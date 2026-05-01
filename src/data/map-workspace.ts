import type { Workspace } from '@/types/workspaces'

export type WorkspaceRow = {
    id: string
    name: string
    slug: string
    description: string | null
    created_by: string | null
    created_at: string
    updated_at: string
}

export function mapWorkspace(row: WorkspaceRow): Workspace {
    return {
        id: row.id,
        name: row.name,
        slug: row.slug,
        description: row.description,
        createdBy: row.created_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    }
}
