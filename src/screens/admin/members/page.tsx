import { useCallback, useEffect, useMemo, useState } from 'react'
import { Spinner } from '@/components/feedback/spinner'
import { Tabs } from '@/components/layout/tabs'
import { fetchWorkspaceMembers, type ResolvedMember } from '@/data/fetch-workspace-members'
import { supabase } from '@/lib/supabase'
import { mapWorkspaceRole, type WorkspaceRoleRow } from '@/data/map-workspace-role'
import { useCurrentWorkspace } from '@/features/workspace/workspace-provider'
import { useDepartments } from '@/features/departments/department-provider'
import { AllMembersTable } from '@/features/admin/all-members-table'
import { DepartmentMembersTable } from '@/features/admin/department-members-table'
import type { WorkspaceRole } from '@/types/workspaces'

const ALL_TAB = 'all'

export function AdminMembersScreen() {
    const { state: { workspace } } = useCurrentWorkspace()
    const { state: deptState, actions: deptActions } = useDepartments()
    const [members, setMembers] = useState<ResolvedMember[]>([])
    const [roles, setRoles] = useState<WorkspaceRole[]>([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState(ALL_TAB)

    const refresh = useCallback(async () => {
        const [list] = await Promise.all([fetchWorkspaceMembers(), deptActions.refresh()])
        setMembers(list)
    }, [deptActions])

    useEffect(() => {
        let active = true
        ;(async () => {
            setLoading(true)
            await refresh()
            if (!active) return
            if (workspace) {
                const { data, error } = await supabase
                    .from('workspace_roles')
                    .select('*')
                    .eq('workspace_id', workspace.id)
                if (!active) return
                if (error) throw new Error(error.message)
                setRoles((data ?? []).map(r => mapWorkspaceRole(r as WorkspaceRoleRow)))
            }
            if (active) setLoading(false)
        })()
        return () => { active = false }
    }, [refresh, workspace])

    const activeMembers = useMemo(
        () => members.filter(m => m.membership.status === 'active'),
        [members],
    )
    const pendingCount = useMemo(
        () => members.filter(m => m.membership.status === 'pending').length,
        [members],
    )

    if (loading || !workspace) {
        return (
            <div className="flex min-h-full items-center justify-center p-12">
                <Spinner size="lg" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="space-y-1">
                <h2 className="title-h6">Members</h2>
                <p className="paragraph-sm text-tertiary">
                    Approve sign-ups, change roles, and assign people to departments.
                </p>
            </div>

            {pendingCount > 0 && (
                <button
                    type="button"
                    onClick={() => setActiveTab(ALL_TAB)}
                    className="w-full text-left rounded-lg border border-warning bg-warning_subtle px-3 py-2 hover:bg-warning_subtle_hover transition-colors cursor-pointer"
                >
                    <p className="paragraph-sm text-warning font-medium">
                        {pendingCount} pending sign-up{pendingCount > 1 ? 's' : ''} awaiting your review
                    </p>
                </button>
            )}

            <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
                <Tabs.List>
                    <Tabs.Tab value={ALL_TAB}>All members</Tabs.Tab>
                    {deptState.allDepartments.map(d => (
                        <Tabs.Tab key={d.id} value={d.id}>{d.name}</Tabs.Tab>
                    ))}
                </Tabs.List>

                <Tabs.Panels className="pt-5">
                    <Tabs.Panel value={ALL_TAB}>
                        <AllMembersTable members={members} roles={roles} onChanged={refresh} />
                    </Tabs.Panel>
                    {deptState.allDepartments.map(d => (
                        <Tabs.Panel key={d.id} value={d.id}>
                            <DepartmentMembersTable
                                department={d}
                                members={members}
                                activeMembers={activeMembers}
                                roles={roles}
                                onChanged={refresh}
                            />
                        </Tabs.Panel>
                    ))}
                </Tabs.Panels>
            </Tabs.Root>
        </div>
    )
}
