import { mockStore } from './store/mock-store'
import { mapWorkspace, type WorkspaceRow } from './map-workspace'
import { mapWorkspaceMember, type WorkspaceMemberRow } from './map-workspace-member'
import { mapWorkspaceRole, type WorkspaceRoleRow } from './map-workspace-role'
import type { Workspace, WorkspaceMember, WorkspaceRole } from '@/types/workspaces'

export async function fetchPublicWorkspaces(): Promise<Pick<Workspace, 'id' | 'name' | 'slug'>[]> {
    return mockStore<WorkspaceRow>('workspaces')
        .list()
        .map(row => ({ id: row.id, name: row.name, slug: row.slug }))
        .sort((a, b) => a.name.localeCompare(b.name))
}

export async function fetchWorkspaceById(id: string): Promise<Workspace | null> {
    const row = mockStore<WorkspaceRow>('workspaces').find(id)
    return row ? mapWorkspace(row) : null
}

export async function fetchAllWorkspaces(): Promise<Workspace[]> {
    return mockStore<WorkspaceRow>('workspaces')
        .list()
        .map(mapWorkspace)
        .sort((a, b) => a.name.localeCompare(b.name))
}

export async function fetchWorkspaceMembershipsForUser(userId: string): Promise<WorkspaceMember[]> {
    return mockStore<WorkspaceMemberRow>('workspace_members')
        .where(row => row.user_id === userId)
        .map(mapWorkspaceMember)
}

export async function fetchWorkspaceRoleById(id: string): Promise<WorkspaceRole | null> {
    const row = mockStore<WorkspaceRoleRow>('workspace_roles').find(id)
    return row ? mapWorkspaceRole(row) : null
}
