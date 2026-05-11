import { useCallback } from 'react'
import { Spinner } from '@/components/feedback/spinner'
import { useCurrentWorkspace } from '@/features/workspace/workspace-provider'
import { useDepartments } from '@/features/departments/department-provider'
import { useMembers } from '@/features/members/members-provider'
import { useWorkspaceRoles } from '@/features/workspace/workspace-roles-provider'
import { DepartmentsManager } from '@/features/admin/departments-manager'

export function AdminDepartmentsScreen() {
    const { state: { workspace } } = useCurrentWorkspace()
    const { state: deptState, actions: deptActions } = useDepartments()
    const { state: membersState, actions: membersActions } = useMembers()
    const { state: rolesState } = useWorkspaceRoles()

    const refresh = useCallback(async () => {
        await Promise.all([membersActions.refresh(), deptActions.refresh()])
    }, [membersActions, deptActions])

    const loading = membersState.loading || rolesState.loading || deptState.loading

    if (loading || !workspace) {
        return (
            <div className="flex min-h-full items-center justify-center p-12">
                <Spinner size="lg" />
            </div>
        )
    }

    return (
        <DepartmentsManager
            departments={deptState.allDepartments}
            members={membersState.members}
            activeMembers={membersState.activeMembers}
            roles={rolesState.roles}
            onSaved={refresh}
        />
    )
}
