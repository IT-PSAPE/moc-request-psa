import { mockStore } from './mock-store'
import { mapWorkspaceRole, type WorkspaceRoleRow } from '@/data/map-workspace-role'
import type { ProfileRow } from '@/data/map-profile'
import type { WorkspaceMemberRow } from '@/data/map-workspace-member'
import type { DepartmentMemberRow } from '@/data/map-department-member'
import type { WorkspaceRole } from '@/types/workspaces'

export type CurrentContext = {
    userId: string | null
    isPlatformAdmin: boolean
    activeWorkspaceId: string | null
    workspaceRole: WorkspaceRole | null
    departmentIds: string[]
    memberStatus: 'pending' | 'active' | 'suspended' | 'rejected' | null
}

let activeWorkspaceIdOverride: string | null = null
let currentUserId: string | null = null

export function setCurrentUserId(userId: string | null): void {
    currentUserId = userId
}

export function setActiveWorkspaceId(workspaceId: string | null): void {
    activeWorkspaceIdOverride = workspaceId
}

export function getCurrentContext(): CurrentContext {
    if (!currentUserId) {
        return {
            userId: null,
            isPlatformAdmin: false,
            activeWorkspaceId: null,
            workspaceRole: null,
            departmentIds: [],
            memberStatus: null,
        }
    }

    const profile = mockStore<ProfileRow>('profiles').find(currentUserId)
    if (!profile) {
        return {
            userId: currentUserId,
            isPlatformAdmin: false,
            activeWorkspaceId: null,
            workspaceRole: null,
            departmentIds: [],
            memberStatus: null,
        }
    }

    const memberships = mockStore<WorkspaceMemberRow>('workspace_members').where(
        row => row.user_id === currentUserId,
    )

    const activeMemberships = memberships.filter(row => row.status === 'active')
    const candidate = activeMemberships.find(row => row.workspace_id === activeWorkspaceIdOverride)
        ?? activeMemberships[0]
        ?? memberships[0]
        ?? null

    const workspaceRoleRow = candidate?.workspace_role_id
        ? mockStore<WorkspaceRoleRow>('workspace_roles').find(candidate.workspace_role_id) ?? null
        : null
    const workspaceRole = workspaceRoleRow ? mapWorkspaceRole(workspaceRoleRow) : null

    const departmentIds = candidate
        ? mockStore<DepartmentMemberRow>('department_members')
              .where(row => row.user_id === currentUserId)
              .map(row => row.department_id)
        : []

    return {
        userId: profile.id,
        isPlatformAdmin: Boolean(profile.is_platform_admin),
        activeWorkspaceId: candidate?.workspace_id ?? null,
        workspaceRole,
        departmentIds,
        memberStatus: candidate?.status ?? null,
    }
}
