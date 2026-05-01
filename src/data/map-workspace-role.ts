import type { WorkspaceRole } from '@/types/workspaces'

export type WorkspaceRoleRow = {
    id: string
    workspace_id: string
    name: string
    can_create: boolean
    can_read: boolean
    can_update: boolean
    can_delete: boolean
    can_manage_roles: boolean
    is_system: boolean
}

export function mapWorkspaceRole(row: WorkspaceRoleRow): WorkspaceRole {
    return {
        id: row.id,
        workspaceId: row.workspace_id,
        name: row.name,
        canCreate: row.can_create,
        canRead: row.can_read,
        canUpdate: row.can_update,
        canDelete: row.can_delete,
        canManageRoles: row.can_manage_roles,
        isSystem: row.is_system,
    }
}
