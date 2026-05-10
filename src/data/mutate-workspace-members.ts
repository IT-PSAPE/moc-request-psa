import { supabase } from '@/lib/supabase'
import { getCurrentContext } from './store/current-context'
import { type WorkspaceMemberRow } from './map-workspace-member'
import type { DepartmentRole } from '@/types/departments'
import type { MemberStatus } from '@/types/profiles'

export async function approveWorkspaceMember(membershipId: string, roleId: string): Promise<void> {
    // RPC sets approved_by = auth.uid() and approved_at = now() server-side, and
    // re-checks is_workspace_admin OR is_platform_admin — so the caller can't
    // forge approved_by even if they bypass the UI.
    const { error } = await supabase.rpc('approve_workspace_member', {
        p_membership_id: membershipId,
        p_role_id: roleId,
    })
    if (error) throw new Error(error.message)
}

export async function rejectWorkspaceMember(membershipId: string): Promise<void> {
    const { error } = await supabase
        .from('workspace_members')
        .update({ status: 'rejected' })
        .eq('id', membershipId)
    if (error) throw new Error(error.message)
}

export async function reactivateWorkspaceMember(membershipId: string): Promise<void> {
    const { error } = await supabase
        .from('workspace_members')
        .update({ status: 'pending' })
        .eq('id', membershipId)
    if (error) throw new Error(error.message)
}

export async function setWorkspaceMemberRole(membershipId: string, roleId: string): Promise<void> {
    const { error } = await supabase
        .from('workspace_members')
        .update({ workspace_role_id: roleId })
        .eq('id', membershipId)
    if (error) throw new Error(error.message)
}

export type SetMemberStatusOptions = {
    fallbackRoleId?: string
}

export async function setMemberStatus(
    membershipId: string,
    nextStatus: MemberStatus,
    options: SetMemberStatusOptions = {},
): Promise<void> {
    const ctx = getCurrentContext()
    const { data: row, error: fetchError } = await supabase
        .from('workspace_members')
        .select('status, workspace_role_id')
        .eq('id', membershipId)
        .maybeSingle<Pick<WorkspaceMemberRow, 'status' | 'workspace_role_id'>>()
    if (fetchError) throw new Error(fetchError.message)
    if (!row) throw new Error('Membership not found')
    if (row.status === nextStatus) return

    const patch: Partial<WorkspaceMemberRow> = { status: nextStatus }
    if (nextStatus === 'active') {
        const roleId = row.workspace_role_id ?? options.fallbackRoleId ?? null
        if (!roleId) throw new Error('A role is required when activating a member')
        patch.workspace_role_id = roleId
        patch.approved_at = new Date().toISOString()
        patch.approved_by = ctx.userId
    }
    const { error } = await supabase
        .from('workspace_members')
        .update(patch)
        .eq('id', membershipId)
    if (error) throw new Error(error.message)
}

export async function removeWorkspaceMember(membershipId: string): Promise<void> {
    // workspace_members row carries (workspace_id, user_id) — fetch them so we
    // can also drop the user's department memberships in that workspace.
    const { data: row, error: fetchError } = await supabase
        .from('workspace_members')
        .select('workspace_id, user_id')
        .eq('id', membershipId)
        .maybeSingle<Pick<WorkspaceMemberRow, 'workspace_id' | 'user_id'>>()
    if (fetchError) throw new Error(fetchError.message)
    if (!row) return

    const { data: deptIds, error: deptError } = await supabase
        .from('departments')
        .select('id')
        .eq('workspace_id', row.workspace_id)
    if (deptError) throw new Error(deptError.message)
    const ids = (deptIds ?? []).map(d => (d as { id: string }).id)

    if (ids.length > 0) {
        const { error: dmError } = await supabase
            .from('department_members')
            .delete()
            .eq('user_id', row.user_id)
            .in('department_id', ids)
        if (dmError) throw new Error(dmError.message)
    }

    const { error } = await supabase
        .from('workspace_members')
        .delete()
        .eq('id', membershipId)
    if (error) throw new Error(error.message)
}

export type DepartmentMembershipUpdate = {
    departmentId: string
    role: DepartmentRole
}

export async function addDepartmentMember(
    departmentId: string,
    userId: string,
    role: DepartmentRole = 'member',
): Promise<void> {
    const { error } = await supabase
        .from('department_members')
        .upsert({ department_id: departmentId, user_id: userId, role }, { onConflict: 'department_id,user_id' })
    if (error) throw new Error(error.message)
}

export async function removeDepartmentMember(departmentId: string, userId: string): Promise<void> {
    const { error } = await supabase
        .from('department_members')
        .delete()
        .match({ department_id: departmentId, user_id: userId })
    if (error) throw new Error(error.message)
}

export async function setDepartmentMemberRole(
    departmentId: string,
    userId: string,
    role: DepartmentRole,
): Promise<void> {
    const { error } = await supabase
        .from('department_members')
        .update({ role })
        .match({ department_id: departmentId, user_id: userId })
    if (error) throw new Error(error.message)
}

export async function setUserDepartmentMemberships(
    userId: string,
    workspaceId: string,
    updates: DepartmentMembershipUpdate[],
): Promise<void> {
    const { data: deptRows, error: deptError } = await supabase
        .from('departments')
        .select('id')
        .eq('workspace_id', workspaceId)
    if (deptError) throw new Error(deptError.message)
    const allowed = new Set((deptRows ?? []).map(d => (d as { id: string }).id))

    if (allowed.size > 0) {
        const { error: clearError } = await supabase
            .from('department_members')
            .delete()
            .eq('user_id', userId)
            .in('department_id', Array.from(allowed))
        if (clearError) throw new Error(clearError.message)
    }

    const inserts = updates
        .filter(u => allowed.has(u.departmentId))
        .map(u => ({ department_id: u.departmentId, user_id: userId, role: u.role }))
    if (inserts.length === 0) return
    const { error: insertError } = await supabase
        .from('department_members')
        .insert(inserts)
    if (insertError) throw new Error(insertError.message)
}
