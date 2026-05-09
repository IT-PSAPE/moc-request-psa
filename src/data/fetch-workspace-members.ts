import { supabase } from '@/lib/supabase'
import { getCurrentContext } from './store/current-context'
import { mapWorkspaceMember, type WorkspaceMemberRow } from './map-workspace-member'
import { mapProfile, type ProfileRow } from './map-profile'
import { mapWorkspaceRole, type WorkspaceRoleRow } from './map-workspace-role'
import { mapDepartmentMember, type DepartmentMemberRow } from './map-department-member'
import { mapDepartment, type DepartmentRow } from './map-department'
import type { Profile } from '@/types/profiles'
import type { WorkspaceMember, WorkspaceRole } from '@/types/workspaces'
import type { Department, DepartmentMember, DepartmentRole } from '@/types/departments'

export type DepartmentMembership = {
    department: Department
    role: DepartmentRole
}

export type ResolvedMember = {
    membership: WorkspaceMember
    profile: Profile
    role: WorkspaceRole | null
    departments: Department[]
    departmentMemberships: DepartmentMembership[]
}

type MemberJoinRow = WorkspaceMemberRow & {
    profile: ProfileRow | null
    role: WorkspaceRoleRow | null
}

type DepartmentMemberJoinRow = DepartmentMemberRow & {
    department: DepartmentRow | null
}

export async function fetchWorkspaceMembers(): Promise<ResolvedMember[]> {
    const ctx = getCurrentContext()
    if (!ctx.activeWorkspaceId) return []

    // Step 1: workspace members + their profile + their workspace role.
    const { data: memberData, error: memberError } = await supabase
        .from('workspace_members')
        .select('*, profile:profiles!workspace_members_user_id_fkey(*), role:workspace_roles(*)')
        .eq('workspace_id', ctx.activeWorkspaceId)
    if (memberError) throw new Error(memberError.message)
    const memberRows = (memberData ?? []) as unknown as MemberJoinRow[]
    if (memberRows.length === 0) return []

    // Step 2: department memberships for those users, scoped to this workspace's
    // departments. PostgREST can't embed department_members from workspace_members
    // (no direct FK — they only share user_id), so we fetch separately and join in
    // memory.
    const userIds = memberRows.map(m => m.user_id)
    const { data: dmData, error: dmError } = await supabase
        .from('department_members')
        .select('*, department:departments!inner(*)')
        .in('user_id', userIds)
        .eq('department.workspace_id', ctx.activeWorkspaceId)
    if (dmError) throw new Error(dmError.message)
    const dmRows = (dmData ?? []) as unknown as DepartmentMemberJoinRow[]

    const dmsByUser = new Map<string, DepartmentMembership[]>()
    for (const dm of dmRows) {
        if (!dm.department) continue
        const list = dmsByUser.get(dm.user_id) ?? []
        list.push({ department: mapDepartment(dm.department), role: dm.role })
        dmsByUser.set(dm.user_id, list)
    }

    return memberRows
        .map(row => {
            if (!row.profile) return null
            const departmentMemberships = dmsByUser.get(row.user_id) ?? []
            return {
                membership: mapWorkspaceMember(row),
                profile: mapProfile(row.profile),
                role: row.role ? mapWorkspaceRole(row.role) : null,
                departments: departmentMemberships.map(dm => dm.department),
                departmentMemberships,
            }
        })
        .filter((entry): entry is ResolvedMember => entry !== null)
        .sort((a, b) => {
            const aPending = a.membership.status === 'pending' ? 0 : 1
            const bPending = b.membership.status === 'pending' ? 0 : 1
            if (aPending !== bPending) return aPending - bPending
            return a.profile.name.localeCompare(b.profile.name)
        })
}

export async function fetchDepartmentMembershipsForUser(userId: string): Promise<DepartmentMember[]> {
    const { data, error } = await supabase
        .from('department_members')
        .select('*')
        .eq('user_id', userId)
    if (error) throw new Error(error.message)
    return (data ?? []).map(row => mapDepartmentMember(row as DepartmentMemberRow))
}
