import { mockStore } from './store/mock-store'
import { getCurrentContext } from './store/current-context'
import { mapWorkspace, type WorkspaceRow } from './map-workspace'
import { type WorkspaceRoleRow } from './map-workspace-role'
import { type WorkspaceMemberRow } from './map-workspace-member'
import { type ProfileRow } from './map-profile'
import type { Workspace } from '@/types/workspaces'

export type WorkspaceUpdate = {
    name: string
    description: string | null
}

export async function updateWorkspace(id: string, input: WorkspaceUpdate): Promise<Workspace> {
    const store = mockStore<WorkspaceRow>('workspaces')
    const row = store.update(id, {
        name: input.name.trim(),
        description: input.description?.trim() || null,
        updated_at: new Date().toISOString(),
    })
    return mapWorkspace(row)
}

export type CreateWorkspaceInput = {
    name: string
    slug: string
    description: string | null
}

export type CreateWorkspaceResult = {
    workspace: Workspace
    adminRoleId: string
}

export async function createWorkspace(input: CreateWorkspaceInput): Promise<CreateWorkspaceResult> {
    const ctx = getCurrentContext()
    const workspaces = mockStore<WorkspaceRow>('workspaces')
    const slug = input.slug.trim().toLowerCase()
    if (!slug) throw new Error('Slug is required')
    if (workspaces.findOne(w => w.slug === slug)) throw new Error('A workspace with that slug already exists')

    const now = new Date().toISOString()
    const workspaceId = crypto.randomUUID()
    const workspaceRow: WorkspaceRow = {
        id: workspaceId,
        name: input.name.trim(),
        slug,
        description: input.description?.trim() || null,
        created_by: ctx.userId,
        created_at: now,
        updated_at: now,
    }
    workspaces.insert(workspaceRow)

    const rolesStore = mockStore<WorkspaceRoleRow>('workspace_roles')
    const adminRole: WorkspaceRoleRow = {
        id: crypto.randomUUID(),
        workspace_id: workspaceId,
        name: 'Admin',
        can_create: true,
        can_read: true,
        can_update: true,
        can_delete: true,
        can_manage_roles: true,
        is_system: true,
    }
    const editorRole: WorkspaceRoleRow = {
        id: crypto.randomUUID(),
        workspace_id: workspaceId,
        name: 'Editor',
        can_create: true,
        can_read: true,
        can_update: true,
        can_delete: false,
        can_manage_roles: false,
        is_system: true,
    }
    const viewerRole: WorkspaceRoleRow = {
        id: crypto.randomUUID(),
        workspace_id: workspaceId,
        name: 'Viewer',
        can_create: false,
        can_read: true,
        can_update: false,
        can_delete: false,
        can_manage_roles: false,
        is_system: true,
    }
    rolesStore.insert(adminRole)
    rolesStore.insert(editorRole)
    rolesStore.insert(viewerRole)

    return { workspace: mapWorkspace(workspaceRow), adminRoleId: adminRole.id }
}

export async function assignWorkspaceAdmin(workspaceId: string, profileId: string): Promise<void> {
    const ctx = getCurrentContext()
    const profile = mockStore<ProfileRow>('profiles').find(profileId)
    if (!profile) throw new Error('User not found')

    const adminRole = mockStore<WorkspaceRoleRow>('workspace_roles').findOne(
        r => r.workspace_id === workspaceId && r.name === 'Admin',
    )
    if (!adminRole) throw new Error('Admin role missing for workspace')

    const membersStore = mockStore<WorkspaceMemberRow>('workspace_members')
    const existing = membersStore.findOne(m => m.workspace_id === workspaceId && m.user_id === profileId)
    const now = new Date().toISOString()
    if (existing) {
        membersStore.update(existing.id, {
            status: 'active',
            workspace_role_id: adminRole.id,
            approved_at: now,
            approved_by: ctx.userId,
        })
        return
    }
    membersStore.insert({
        id: crypto.randomUUID(),
        workspace_id: workspaceId,
        user_id: profileId,
        status: 'active',
        workspace_role_id: adminRole.id,
        requested_at: now,
        approved_at: now,
        approved_by: ctx.userId,
    })
}
