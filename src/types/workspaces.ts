import type { MemberStatus } from './profiles'

export type Workspace = {
    id: string
    name: string
    slug: string
    description: string | null
    createdBy: string | null
    createdAt: string
    updatedAt: string
}

export type WorkspaceRole = {
    id: string
    workspaceId: string
    name: string
    canCreate: boolean
    canRead: boolean
    canUpdate: boolean
    canDelete: boolean
    canManageRoles: boolean
    isSystem: boolean
}

export type WorkspaceMember = {
    id: string
    workspaceId: string
    userId: string
    status: MemberStatus
    workspaceRoleId: string | null
    requestedAt: string
    approvedAt: string | null
    approvedBy: string | null
}
