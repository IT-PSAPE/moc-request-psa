import { MoreHorizontal, Trash2 } from 'lucide-react'
import { Table } from '@/components/display/table'
import { Badge } from '@/components/display/badge'
import { Avatar } from '@/components/display/avatar'
import { Label, Paragraph } from '@/components/display/text'
import { Button } from '@/components/controls/button'
import { Dropdown } from '@/components/overlays/dropdown'
import { useFeedback } from '@/components/feedback/feedback-provider'
import { useConfirm } from '@/components/feedback/confirm-modal'
import {
    removeWorkspaceMember,
    setWorkspaceMemberRole,
} from '@/data/mutate-workspace-members'
import { getErrorMessage } from '@/utils/get-error-message'
import { badgeColor } from '@/lib/color-keys'
import { MemberStatusSelect } from './member-status-select'
import type { ResolvedMember } from '@/data/fetch-workspace-members'
import type { WorkspaceRole } from '@/types/workspaces'

type AllMembersTableProps = {
    members: ResolvedMember[]
    roles: WorkspaceRole[]
    onChanged: () => Promise<void>
}

function initialsOf(name: string, surname: string | null): string {
    const a = name[0] ?? ''
    const b = surname?.[0] ?? ''
    return `${a}${b}`.trim() || a || '?'
}

export function AllMembersTable({ members, roles, onChanged }: AllMembersTableProps) {
    const { toast } = useFeedback()
    const confirm = useConfirm()

    async function handleRemove(member: ResolvedMember) {
        const ok = await confirm({
            title: `Remove ${member.profile.name} from the workspace?`,
            description: 'They will lose access immediately. The user record itself is preserved.',
            confirmLabel: 'Remove',
            intent: 'danger',
        })
        if (!ok) return
        try {
            await removeWorkspaceMember(member.membership.id)
            toast({ title: 'Member removed', variant: 'info' })
            await onChanged()
        } catch (err) {
            toast({ title: 'Remove failed', description: getErrorMessage(err, 'Could not remove.'), variant: 'error' })
        }
    }

    async function handleRoleChange(member: ResolvedMember, roleId: string) {
        try {
            await setWorkspaceMemberRole(member.membership.id, roleId)
            toast({ title: 'Role updated', variant: 'success' })
            await onChanged()
        } catch (err) {
            toast({ title: 'Update failed', description: getErrorMessage(err, 'Could not update role.'), variant: 'error' })
        }
    }

    if (members.length === 0) {
        return (
            <div className="px-6 py-12 text-center">
                <Paragraph.sm className="text-tertiary">No members yet.</Paragraph.sm>
            </div>
        )
    }

    return (
        <div className="overflow-x-auto rounded-lg border border-secondary bg-primary">
            <Table className="w-full">
                <Table.Head>
                    <Table.Row>
                        <Table.Header className="px-3 py-2 paragraph-xs">Person</Table.Header>
                        <Table.Header className="px-3 py-2 paragraph-xs">Status</Table.Header>
                        <Table.Header className="px-3 py-2 paragraph-xs">Workspace role</Table.Header>
                        <Table.Header className="px-3 py-2 paragraph-xs">Departments</Table.Header>
                        <Table.Header className="px-3 py-2 paragraph-xs text-right w-12">Actions</Table.Header>
                    </Table.Row>
                </Table.Head>
                <Table.Body>
                    {members.map(member => {
                        const initials = initialsOf(member.profile.name, member.profile.surname)
                        return (
                            <Table.Row key={member.membership.id}>
                                <Table.Cell className="px-3 py-2">
                                    <div className="flex items-center gap-3">
                                        <Avatar.initials size="sm" name={initials} />
                                        <div className="min-w-0">
                                            <Label.sm>{[member.profile.name, member.profile.surname].filter(Boolean).join(' ')}</Label.sm>
                                            <Paragraph.xs className="text-quaternary truncate">{member.profile.email}</Paragraph.xs>
                                        </div>
                                    </div>
                                </Table.Cell>
                                <Table.Cell className="px-3 py-2">
                                    <MemberStatusSelect
                                        membershipId={member.membership.id}
                                        profile={member.profile}
                                        status={member.membership.status}
                                        roles={roles}
                                        onChanged={onChanged}
                                    />
                                </Table.Cell>
                                <Table.Cell className="px-3 py-2">
                                    {member.membership.status === 'active' ? (
                                        <Dropdown.Root placement="bottom-start">
                                            <Dropdown.Trigger>
                                                <span className="inline-flex items-center gap-1 cursor-pointer paragraph-sm text-primary hover:text-brand">
                                                    {member.role?.name ?? '—'}
                                                </span>
                                            </Dropdown.Trigger>
                                            <Dropdown.Panel>
                                                {roles.map(r => (
                                                    <Dropdown.Item key={r.id} onSelect={() => handleRoleChange(member, r.id)}>
                                                        {r.name}
                                                    </Dropdown.Item>
                                                ))}
                                            </Dropdown.Panel>
                                        </Dropdown.Root>
                                    ) : (
                                        <Paragraph.xs className="text-quaternary">—</Paragraph.xs>
                                    )}
                                </Table.Cell>
                                <Table.Cell className="px-3 py-2">
                                    <div className="flex flex-wrap gap-1">
                                        {member.departments.length === 0 ? (
                                            <Paragraph.xs className="text-quaternary">—</Paragraph.xs>
                                        ) : (
                                            member.departments.map(d => (
                                                <Badge key={d.id} label={d.name} color={badgeColor(d.colorKey)} />
                                            ))
                                        )}
                                    </div>
                                </Table.Cell>
                                <Table.Cell className="px-3 py-2 text-right">
                                    <Dropdown.Root placement="bottom">
                                        <Dropdown.Trigger>
                                            <Button.Icon icon={<MoreHorizontal />} variant="ghost" aria-label="Actions" />
                                        </Dropdown.Trigger>
                                        <Dropdown.Panel>
                                            <Dropdown.Item onClick={() => handleRemove(member)}>
                                                <Trash2 className="size-4" /><span>Remove from workspace</span>
                                            </Dropdown.Item>
                                        </Dropdown.Panel>
                                    </Dropdown.Root>
                                </Table.Cell>
                            </Table.Row>
                        )
                    })}
                </Table.Body>
            </Table>
        </div>
    )
}
