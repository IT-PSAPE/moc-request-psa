import type { MemberStatus } from '@/types/profiles'
import type { WorkspaceMember } from '@/types/workspaces'

export type WorkspaceMemberRow = {
    id: string
    workspace_id: string
    user_id: string
    status: MemberStatus
    workspace_role_id: string | null
    requested_at: string
    approved_at: string | null
    approved_by: string | null
}

export function mapWorkspaceMember(row: WorkspaceMemberRow): WorkspaceMember {
    return {
        id: row.id,
        workspaceId: row.workspace_id,
        userId: row.user_id,
        status: row.status,
        workspaceRoleId: row.workspace_role_id,
        requestedAt: row.requested_at,
        approvedAt: row.approved_at,
        approvedBy: row.approved_by,
    }
}
