import { supabase } from '@/lib/supabase'
import { mapWorkspace, type WorkspaceRow } from './map-workspace'
import { mapWorkspaceMember, type WorkspaceMemberRow } from './map-workspace-member'
import { mapWorkspaceRole, type WorkspaceRoleRow } from './map-workspace-role'
import type { Workspace, WorkspaceMember, WorkspaceRole } from '@/types/workspaces'

export async function fetchWorkspaceById(id: string): Promise<Workspace | null> {
    const { data, error } = await supabase
        .from('workspaces')
        .select('*')
        .eq('id', id)
        .maybeSingle<WorkspaceRow>()
    if (error) throw new Error(error.message)
    return data ? mapWorkspace(data) : null
}

export async function fetchWorkspaceBySlug(slug: string): Promise<Pick<Workspace, 'id' | 'name' | 'slug' | 'description'> | null> {
    // Anon-friendly RPC: works for unauthenticated visitors hitting /submit/<slug>
    // or /signup/<slug> before they have any workspace membership.
    const { data, error } = await supabase.rpc('lookup_workspace_by_slug', { p_slug: slug })
    if (error) throw new Error(error.message)
    const rows = (data ?? []) as Pick<Workspace, 'id' | 'name' | 'slug' | 'description'>[]
    return rows[0] ?? null
}

export async function fetchAllWorkspaces(): Promise<Workspace[]> {
    const { data, error } = await supabase
        .from('workspaces')
        .select('*')
        .order('name', { ascending: true })
    if (error) throw new Error(error.message)
    return (data ?? []).map(row => mapWorkspace(row as WorkspaceRow))
}

export async function fetchWorkspaceMembershipsForUser(userId: string): Promise<WorkspaceMember[]> {
    const { data, error } = await supabase
        .from('workspace_members')
        .select('*')
        .eq('user_id', userId)
    if (error) throw new Error(error.message)
    return (data ?? []).map(row => mapWorkspaceMember(row as WorkspaceMemberRow))
}

export async function fetchWorkspaceRoleById(id: string): Promise<WorkspaceRole | null> {
    const { data, error } = await supabase
        .from('workspace_roles')
        .select('*')
        .eq('id', id)
        .maybeSingle<WorkspaceRoleRow>()
    if (error) throw new Error(error.message)
    return data ? mapWorkspaceRole(data) : null
}
