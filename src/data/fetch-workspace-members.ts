import { mockStore } from './store/mock-store'
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

export async function fetchWorkspaceMembers(): Promise<ResolvedMember[]> {
    const ctx = getCurrentContext()
    if (!ctx.activeWorkspaceId) return []

    const memberRows = mockStore<WorkspaceMemberRow>('workspace_members')
        .where(row => row.workspace_id === ctx.activeWorkspaceId)

    if (memberRows.length === 0) return []

    const profilesById = new Map(mockStore<ProfileRow>('profiles').list().map(p => [p.id, p]))
    const rolesById = new Map(mockStore<WorkspaceRoleRow>('workspace_roles').list().map(r => [r.id, r]))
    const departmentsById = new Map(mockStore<DepartmentRow>('departments').list().map(d => [d.id, d]))
    const departmentMembers = mockStore<DepartmentMemberRow>('department_members').list()

    return memberRows
        .map(row => {
            const profileRow = profilesById.get(row.user_id)
            if (!profileRow) return null

            const userDeptRows = departmentMembers.filter(dm => dm.user_id === row.user_id)
            const departmentMemberships: DepartmentMembership[] = []
            for (const dm of userDeptRows) {
                const deptRow = departmentsById.get(dm.department_id)
                if (!deptRow || deptRow.workspace_id !== row.workspace_id) continue
                departmentMemberships.push({ department: mapDepartment(deptRow), role: dm.role })
            }

            return {
                membership: mapWorkspaceMember(row),
                profile: mapProfile(profileRow),
                role: row.workspace_role_id ? mapWorkspaceRole(rolesById.get(row.workspace_role_id)!) : null,
                departments: departmentMemberships.map(dm => dm.department),
                departmentMemberships,
            }
        })
        .filter((entry): entry is ResolvedMember => entry !== null)
        .sort((a, b) => {
            // pending first, then alphabetical by name
            const aPending = a.membership.status === 'pending' ? 0 : 1
            const bPending = b.membership.status === 'pending' ? 0 : 1
            if (aPending !== bPending) return aPending - bPending
            return a.profile.name.localeCompare(b.profile.name)
        })
}

export async function fetchDepartmentMembershipsForUser(userId: string): Promise<DepartmentMember[]> {
    return mockStore<DepartmentMemberRow>('department_members')
        .where(row => row.user_id === userId)
        .map(mapDepartmentMember)
}
