import { useEffect, useMemo } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useCurrentWorkspace } from '@/features/workspace/workspace-provider'
import { useDepartments } from '@/features/departments/department-provider'
import { useRequests } from '@/features/requests/request-provider'
import { RequestByDepartment } from '@/features/requests/request-by-department'
import { SubmitLinkCard } from '@/features/workspace/submit-link-card'
import { Spinner } from '@/components/feedback/spinner'
import { activeStatuses } from '@/types/requests'

export function DashboardScreen() {
    const { state: { profile } } = useAuth()
    const { state: { workspace, role } } = useCurrentWorkspace()
    const { state: deptState } = useDepartments()
    const { state, actions } = useRequests()

    useEffect(() => {
        actions.loadActiveRequests()
    }, [actions])

    const showAll = Boolean(role?.canManageRoles || profile?.isPlatformAdmin)
    const activeStatusSet = useMemo(() => new Set<string>(activeStatuses), [])

    const visibleDepartments = showAll
        ? deptState.allDepartments
        : deptState.userDepartments

    const myDeptIds = useMemo(
        () => new Set(visibleDepartments.map(d => d.id)),
        [visibleDepartments],
    )

    const visibleRequests = useMemo(() => {
        return state.activeRequests.filter(r => {
            if (!activeStatusSet.has(r.status)) return false
            if (showAll) return true
            return myDeptIds.has(r.departmentId)
        })
    }, [state.activeRequests, showAll, myDeptIds, activeStatusSet])

    const heading = showAll ? 'Active requests by department' : 'Active requests in your departments'

    return (
        <div className="px-6 py-8 max-w-7xl mx-auto space-y-6">
            <div className="space-y-1 px-4">
                <h1 className="title-h5">Hi, {profile?.name ?? 'there'} 👋</h1>
                <p className="paragraph-md text-secondary">
                    Welcome to <span className="font-medium">{workspace?.name ?? 'your workspace'}</span>.
                </p>
            </div>

            {showAll && workspace && (
                <div className="px-4">
                    <SubmitLinkCard slug={workspace.slug} variant="compact" />
                </div>
            )}

            <div>
                <h2 className="title-h6 mb-3 px-4">{heading}</h2>
                {state.isLoadingActive && state.activeRequests.length === 0 ? (
                    <div className="flex justify-center py-12"><Spinner size="lg" /></div>
                ) : (
                    <RequestByDepartment
                        requests={visibleRequests}
                        departments={visibleDepartments}
                        emptyTitle={showAll ? 'No active requests' : 'Nothing in your departments'}
                        emptyDescription={
                            showAll
                                ? 'New requests across the workspace will appear here, grouped by department.'
                                : 'Requests routed to your departments will appear here.'
                        }
                    />
                )}
            </div>
        </div>
    )
}
