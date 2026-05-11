import { useMemo, useState } from 'react'
import { UserPlus } from 'lucide-react'
import { Button } from '@/components/controls/button'
import { Spinner } from '@/components/feedback/spinner'
import { useFeedback } from '@/components/feedback/feedback-provider'
import { useCurrentWorkspace } from '@/features/workspace/workspace-provider'
import { useMembers } from '@/features/members/members-provider'
import { useWorkspaceRoles } from '@/features/workspace/workspace-roles-provider'
import { useDepartments } from '@/features/departments/department-provider'
import { AllMembersTable } from '@/features/admin/all-members-table'
import { InviteMemberModal, type InviteSubmitValues } from '@/features/admin/invite-member-modal'
import { inviteWorkspaceMember } from '@/data/mutate-invitations'

export function AdminMembersScreen() {
    const { state: { workspace } } = useCurrentWorkspace()
    const { state: membersState, actions: membersActions } = useMembers()
    const { state: rolesState } = useWorkspaceRoles()
    const { state: deptState } = useDepartments()
    const { toast } = useFeedback()
    const [inviteOpen, setInviteOpen] = useState(false)

    const pendingCount = useMemo(
        () => membersState.members.filter(m => m.membership.status === 'pending').length,
        [membersState.members],
    )

    const loading = membersState.loading || rolesState.loading

    async function handleInvite(values: InviteSubmitValues) {
        const result = await inviteWorkspaceMember({
            email: values.email,
            name: values.name || null,
            workspaceRoleId: values.workspaceRoleId,
            departmentAssignments: values.departmentAssignments,
        })
        if (!result.ok) {
            const description = result.error === 'already_member'
                ? 'This email is already in your workspace.'
                : result.error
            toast({ title: 'Invite failed', description, variant: 'error' })
            throw new Error(result.error)
        }
        toast({
            title: result.mode === 'added_existing'
                ? `${values.email} added to workspace`
                : `Invitation sent to ${values.email}`,
            variant: 'success',
        })
        await membersActions.refresh()
    }

    if (loading || !workspace) {
        return (
            <div className="flex min-h-full items-center justify-center p-12">
                <Spinner size="lg" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-end justify-between">
                <div className="space-y-1">
                    <h2 className="title-h6">Members</h2>
                    <p className="paragraph-sm text-tertiary">
                        Approve sign-ups and change workspace roles. Department assignments live under Departments.
                    </p>
                </div>
                <Button icon={<UserPlus />} onClick={() => setInviteOpen(true)}>
                    Invite member
                </Button>
            </div>

            {pendingCount > 0 && (
                <div className="rounded-lg border border-warning bg-warning_subtle px-3 py-2">
                    <p className="paragraph-sm text-warning font-medium">
                        {pendingCount} pending sign-up{pendingCount > 1 ? 's' : ''} awaiting your review
                    </p>
                </div>
            )}

            <AllMembersTable
                members={membersState.members}
                roles={rolesState.roles}
                onChanged={membersActions.refresh}
            />

            <InviteMemberModal
                open={inviteOpen}
                onOpenChange={setInviteOpen}
                roles={rolesState.roles}
                departments={deptState.allDepartments}
                onSubmit={handleInvite}
            />
        </div>
    )
}
