import { supabase } from '@/lib/supabase'
import { getCurrentContext } from './store/current-context'
import { mapWorkspace, type WorkspaceRow } from './map-workspace'
import { type WorkspaceRoleRow } from './map-workspace-role'
import { approveWorkspaceMember } from './mutate-workspace-members'
import type { Workspace } from '@/types/workspaces'

export type WorkspaceUpdate = {
    name: string
    description: string | null
}

export async function updateWorkspace(id: string, input: WorkspaceUpdate): Promise<Workspace> {
    const { data, error } = await supabase
        .from('workspaces')
        .update({
            name: input.name.trim(),
            description: input.description?.trim() || null,
        })
        .eq('id', id)
        .select('*')
        .single<WorkspaceRow>()
    if (error || !data) throw new Error(error?.message ?? 'Workspace update failed')
    return mapWorkspace(data)
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
    const slug = input.slug.trim().toLowerCase()
    if (!slug) throw new Error('Slug is required')

    const { data: workspaceRow, error: insertError } = await supabase
        .from('workspaces')
        .insert({
            name: input.name.trim(),
            slug,
            description: input.description?.trim() || null,
            created_by: ctx.userId,
        })
        .select('*')
        .single<WorkspaceRow>()
    if (insertError) {
        if (insertError.code === '23505') throw new Error('A workspace with that slug already exists')
        throw new Error(insertError.message)
    }

    const workspaceId = workspaceRow.id
    const { data: roleRows, error: rolesError } = await supabase
        .from('workspace_roles')
        .insert([
            { workspace_id: workspaceId, name: 'Admin',  can_create: true,  can_read: true,  can_update: true,  can_delete: true,  can_manage_roles: true,  is_system: true },
            { workspace_id: workspaceId, name: 'Editor', can_create: true,  can_read: true,  can_update: true,  can_delete: false, can_manage_roles: false, is_system: true },
            { workspace_id: workspaceId, name: 'Viewer', can_create: false, can_read: true,  can_update: false, can_delete: false, can_manage_roles: false, is_system: true },
        ])
        .select('*')
    if (rolesError) throw new Error(rolesError.message)

    const adminRole = (roleRows ?? []).find(r => (r as WorkspaceRoleRow).name === 'Admin') as WorkspaceRoleRow | undefined
    if (!adminRole) throw new Error('Admin role missing for workspace')

    return { workspace: mapWorkspace(workspaceRow), adminRoleId: adminRole.id }
}

export async function assignWorkspaceAdmin(workspaceId: string, profileId: string): Promise<void> {
    const { data: roleRow, error: roleError } = await supabase
        .from('workspace_roles')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('name', 'Admin')
        .maybeSingle<{ id: string }>()
    if (roleError) throw new Error(roleError.message)
    if (!roleRow) throw new Error('Admin role missing for workspace')

    const { data: memberRow, error: upsertError } = await supabase
        .from('workspace_members')
        .upsert({
            workspace_id: workspaceId,
            user_id: profileId,
            status: 'pending',
        }, { onConflict: 'workspace_id,user_id' })
        .select('id')
        .single<{ id: string }>()
    if (upsertError || !memberRow) throw new Error(upsertError?.message ?? 'Workspace admin assignment failed')

    await approveWorkspaceMember(memberRow.id, roleRow.id)
}
