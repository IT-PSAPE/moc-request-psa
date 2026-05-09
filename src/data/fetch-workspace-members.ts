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
    department_members:
        | (DepartmentMemberRow & { department: DepartmentRow | null })[]
        | null
}

export async function fetchWorkspaceMembers(): Promise<ResolvedMember[]> {
    const ctx = getCurrentContext()
    if (!ctx.activeWorkspaceId) return []

    const { data, error } = await supabase
        .from('workspace_members')
        .select(`
            *,
            profile:profiles!workspace_members_user_id_fkey(*),
            role:workspace_roles(*),
            department_members!department_members_user_id_fkey(
                *,
                department:departments(*)
            )
        `)
        .eq('workspace_id', ctx.activeWorkspaceId)
    if (error) throw new Error(error.message)

    const rows = (data ?? []) as unknown as MemberJoinRow[]
    return rows
        .map(row => {
            if (!row.profile) return null
            const departmentMemberships: DepartmentMembership[] = []
            for (const dm of row.department_members ?? []) {
                if (!dm.department) continue
                if (dm.department.workspace_id !== row.workspace_id) continue
                departmentMemberships.push({ department: mapDepartment(dm.department), role: dm.role })
            }
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
