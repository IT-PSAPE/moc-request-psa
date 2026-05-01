import { mockStore } from './store/mock-store'
import { getCurrentContext } from './store/current-context'
import { type WorkspaceMemberRow } from './map-workspace-member'
import { type DepartmentMemberRow } from './map-department-member'
import { type DepartmentRow } from './map-department'
import type { DepartmentRole } from '@/types/departments'
import type { MemberStatus } from '@/types/profiles'

export async function approveWorkspaceMember(membershipId: string, roleId: string): Promise<void> {
    const ctx = getCurrentContext()
    const store = mockStore<WorkspaceMemberRow>('workspace_members')
    const row = store.find(membershipId)
    if (!row) throw new Error('Membership not found')

    store.update(membershipId, {
        status: 'active',
        workspace_role_id: roleId,
        approved_at: new Date().toISOString(),
        approved_by: ctx.userId,
    })
}

export async function rejectWorkspaceMember(membershipId: string): Promise<void> {
    const store = mockStore<WorkspaceMemberRow>('workspace_members')
    const row = store.find(membershipId)
    if (!row) return
    store.update(membershipId, { status: 'rejected' })
}

export async function reactivateWorkspaceMember(membershipId: string): Promise<void> {
    const store = mockStore<WorkspaceMemberRow>('workspace_members')
    const row = store.find(membershipId)
    if (!row) return
    store.update(membershipId, { status: 'pending' })
}

export async function setWorkspaceMemberRole(membershipId: string, roleId: string): Promise<void> {
    mockStore<WorkspaceMemberRow>('workspace_members').update(membershipId, { workspace_role_id: roleId })
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
    const store = mockStore<WorkspaceMemberRow>('workspace_members')
    const row = store.find(membershipId)
    if (!row) throw new Error('Membership not found')
    if (row.status === nextStatus) return

    const patch: Partial<WorkspaceMemberRow> = { status: nextStatus }
    if (nextStatus === 'active') {
        patch.workspace_role_id = row.workspace_role_id ?? options.fallbackRoleId ?? null
        patch.approved_at = new Date().toISOString()
        patch.approved_by = ctx.userId
        if (!patch.workspace_role_id) {
            throw new Error('A role is required when activating a member')
        }
    }
    store.update(membershipId, patch)
}

export async function removeWorkspaceMember(membershipId: string): Promise<void> {
    const store = mockStore<WorkspaceMemberRow>('workspace_members')
    const row = store.find(membershipId)
    if (!row) return
    store.delete(membershipId)
    // Drop department memberships in this workspace
    const departmentsInWorkspace = mockStore<DepartmentRow>('departments')
        .where(d => d.workspace_id === row.workspace_id)
        .map(d => d.id)
    mockStore<DepartmentMemberRow>('department_members').deleteWhere(
        dm => dm.user_id === row.user_id && departmentsInWorkspace.includes(dm.department_id),
    )
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
    const store = mockStore<DepartmentMemberRow>('department_members')
    const existing = store.findOne(dm => dm.department_id === departmentId && dm.user_id === userId)
    if (existing) {
        if (existing.role !== role) store.update(existing.id, { role })
        return
    }
    store.insert({
        id: crypto.randomUUID(),
        department_id: departmentId,
        user_id: userId,
        role,
        created_at: new Date().toISOString(),
    })
}

export async function removeDepartmentMember(departmentId: string, userId: string): Promise<void> {
    mockStore<DepartmentMemberRow>('department_members')
        .deleteWhere(dm => dm.department_id === departmentId && dm.user_id === userId)
}

export async function setDepartmentMemberRole(
    departmentId: string,
    userId: string,
    role: DepartmentRole,
): Promise<void> {
    const store = mockStore<DepartmentMemberRow>('department_members')
    const existing = store.findOne(dm => dm.department_id === departmentId && dm.user_id === userId)
    if (!existing) return
    store.update(existing.id, { role })
}

export async function setUserDepartmentMemberships(
    userId: string,
    workspaceId: string,
    updates: DepartmentMembershipUpdate[],
): Promise<void> {
    const departmentsInWorkspace = new Set(
        mockStore<DepartmentRow>('departments')
            .where(d => d.workspace_id === workspaceId)
            .map(d => d.id),
    )

    const store = mockStore<DepartmentMemberRow>('department_members')
    // Remove existing memberships in this workspace
    store.deleteWhere(dm => dm.user_id === userId && departmentsInWorkspace.has(dm.department_id))

    // Insert the new ones
    const now = new Date().toISOString()
    for (const update of updates) {
        if (!departmentsInWorkspace.has(update.departmentId)) continue
        store.insert({
            id: crypto.randomUUID(),
            department_id: update.departmentId,
            user_id: userId,
            role: update.role,
            created_at: now,
        })
    }
}
