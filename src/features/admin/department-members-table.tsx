import { useState } from 'react'
import { Plus, Trash2, UserPlus, X } from 'lucide-react'
import { Table } from '@/components/display/table'
import { Avatar } from '@/components/display/avatar'
import { Badge } from '@/components/display/badge'
import { Label, Paragraph } from '@/components/display/text'
import { Button } from '@/components/controls/button'
import { Select } from '@/components/form/select'
import { Dropdown } from '@/components/overlays/dropdown'
import { useFeedback } from '@/components/feedback/feedback-provider'
import { useConfirm } from '@/components/feedback/confirm-modal'
import {
    addDepartmentMember,
    removeDepartmentMember,
    setDepartmentMemberRole,
} from '@/data/mutate-workspace-members'
import { getErrorMessage } from '@/utils/get-error-message'
import { MemberStatusSelect } from './member-status-select'
import type { ResolvedMember } from '@/data/fetch-workspace-members'
import type { Department, DepartmentRole } from '@/types/departments'
import type { WorkspaceRole } from '@/types/workspaces'

type DepartmentMembersTableProps = {
    department: Department
    members: ResolvedMember[]
    activeMembers: ResolvedMember[]
    roles: WorkspaceRole[]
    onChanged: () => Promise<void>
}

function initialsOf(name: string, surname: string | null): string {
    const a = name[0] ?? ''
    const b = surname?.[0] ?? ''
    return `${a}${b}`.trim() || a || '?'
}

export function DepartmentMembersTable({ department, members, activeMembers, roles, onChanged }: DepartmentMembersTableProps) {
    const { toast } = useFeedback()
    const confirm = useConfirm()
    const [adding, setAdding] = useState(false)

    const inDept = members.filter(m => m.departments.some(d => d.id === department.id))
    const inDeptIds = new Set(inDept.map(m => m.profile.id))
    const candidates = activeMembers.filter(m => !inDeptIds.has(m.profile.id))

    async function handleRemove(member: ResolvedMember) {
        const ok = await confirm({
            title: `Remove ${member.profile.name} from ${department.name}?`,
            description: 'They will lose access to this department\'s requests. Workspace membership is unaffected.',
            confirmLabel: 'Remove',
            intent: 'danger',
        })
        if (!ok) return
        try {
            await removeDepartmentMember(department.id, member.profile.id)
            toast({ title: 'Removed from department', variant: 'info' })
            await onChanged()
        } catch (err) {
            toast({ title: 'Remove failed', description: getErrorMessage(err, 'Could not remove.'), variant: 'error' })
        }
    }

    async function handleRoleChange(member: ResolvedMember, role: DepartmentRole) {
        try {
            await setDepartmentMemberRole(department.id, member.profile.id, role)
            toast({ title: 'Department role updated', variant: 'success' })
            await onChanged()
        } catch (err) {
            toast({ title: 'Update failed', description: getErrorMessage(err, 'Could not update role.'), variant: 'error' })
        }
    }

    return (
        <div className="space-y-3">
            <div className="flex items-end justify-between px-1">
                <div className="space-y-0.5">
                    <Label.md>{department.name}</Label.md>
                    {department.description && (
                        <Paragraph.xs className="text-quaternary">{department.description}</Paragraph.xs>
                    )}
                </div>
                {!adding && (
                    <Button icon={<UserPlus />} onClick={() => setAdding(true)}>
                        Add member
                    </Button>
                )}
            </div>

            {adding && (
                <DepartmentMemberAddForm
                    department={department}
                    candidates={candidates}
                    onCancel={() => setAdding(false)}
                    onAdded={async () => { setAdding(false); await onChanged() }}
                />
            )}

            {inDept.length === 0 ? (
                <div className="rounded-lg border border-secondary bg-primary px-6 py-8 text-center">
                    <Paragraph.sm className="text-tertiary">No one in this department yet.</Paragraph.sm>
                </div>
            ) : (
                <DepartmentMembersList
                    department={department}
                    members={inDept}
                    roles={roles}
                    onRoleChange={handleRoleChange}
                    onRemove={handleRemove}
                    onChanged={onChanged}
                />
            )}
        </div>
    )
}

type AddFormProps = {
    department: Department
    candidates: ResolvedMember[]
    onCancel: () => void
    onAdded: () => Promise<void>
}

function DepartmentMemberAddForm({ department, candidates, onCancel, onAdded }: AddFormProps) {
    const { toast } = useFeedback()
    const [candidateId, setCandidateId] = useState('')
    const [candidateRole, setCandidateRole] = useState<DepartmentRole>('member')
    const [busy, setBusy] = useState(false)

    async function handleAdd() {
        if (!candidateId) return
        setBusy(true)
        try {
            await addDepartmentMember(department.id, candidateId, candidateRole)
            toast({ title: 'Member added to department', variant: 'success' })
            await onAdded()
        } catch (err) {
            toast({ title: 'Add failed', description: getErrorMessage(err, 'Could not add.'), variant: 'error' })
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className="rounded-lg border border-secondary bg-primary p-3 space-y-3">
            <div className="grid gap-3 md:grid-cols-[1fr_140px]">
                <Select value={candidateId} onChange={e => setCandidateId(e.target.value)}>
                    <option value="">Pick a workspace member…</option>
                    {candidates.map(m => (
                        <option key={m.profile.id} value={m.profile.id}>
                            {[m.profile.name, m.profile.surname].filter(Boolean).join(' ')} · {m.profile.email}
                        </option>
                    ))}
                </Select>
                <Select value={candidateRole} onChange={e => setCandidateRole(e.target.value as DepartmentRole)}>
                    <option value="member">Member</option>
                    <option value="lead">Lead</option>
                </Select>
            </div>
            <div className="flex gap-2 justify-end">
                <Button variant="ghost" icon={<X />} onClick={onCancel} disabled={busy}>
                    Cancel
                </Button>
                <Button icon={<Plus />} onClick={handleAdd} disabled={!candidateId || busy}>
                    {busy ? 'Adding…' : 'Add to department'}
                </Button>
            </div>
            {candidates.length === 0 && (
                <Paragraph.xs className="text-quaternary">
                    All active workspace members are already in this department.
                </Paragraph.xs>
            )}
        </div>
    )
}

type ListProps = {
    department: Department
    members: ResolvedMember[]
    roles: WorkspaceRole[]
    onRoleChange: (member: ResolvedMember, role: DepartmentRole) => Promise<void>
    onRemove: (member: ResolvedMember) => Promise<void>
    onChanged: () => Promise<void>
}

function DepartmentMembersList({ department, members, roles, onRoleChange, onRemove, onChanged }: ListProps) {
    return (
        <div className="overflow-x-auto rounded-lg border border-secondary bg-primary">
            <Table className="w-full">
                <Table.Head>
                    <Table.Row>
                        <Table.Header className="px-3 py-2 paragraph-xs">Person</Table.Header>
                        <Table.Header className="px-3 py-2 paragraph-xs">Status</Table.Header>
                        <Table.Header className="px-3 py-2 paragraph-xs">Workspace role</Table.Header>
                        <Table.Header className="px-3 py-2 paragraph-xs">Department role</Table.Header>
                        <Table.Header className="px-3 py-2 paragraph-xs text-right w-32">Action</Table.Header>
                    </Table.Row>
                </Table.Head>
                <Table.Body>
                    {members.map(member => (
                        <DeptMemberRow
                            key={member.profile.id}
                            member={member}
                            department={department}
                            initials={initialsOf(member.profile.name, member.profile.surname)}
                            roles={roles}
                            onRoleChange={onRoleChange}
                            onRemove={onRemove}
                            onChanged={onChanged}
                        />
                    ))}
                </Table.Body>
            </Table>
        </div>
    )
}

type DeptMemberRowProps = {
    member: ResolvedMember
    department: Department
    initials: string
    roles: WorkspaceRole[]
    onRoleChange: (member: ResolvedMember, role: DepartmentRole) => Promise<void>
    onRemove: (member: ResolvedMember) => Promise<void>
    onChanged: () => Promise<void>
}

function DeptMemberRow({ member, department, initials, roles, onRoleChange, onRemove, onChanged }: DeptMemberRowProps) {
    const currentRole = member.departmentMemberships.find(dm => dm.department.id === department.id)?.role ?? 'member'

    async function handleRole(next: DepartmentRole) {
        await onRoleChange(member, next)
    }

    return (
        <Table.Row>
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
                {member.role ? (
                    <Badge label={member.role.name} color="blue" />
                ) : (
                    <Paragraph.xs className="text-quaternary">—</Paragraph.xs>
                )}
            </Table.Cell>
            <Table.Cell className="px-3 py-2">
                <Dropdown.Root placement="bottom-start">
                    <Dropdown.Trigger>
                        <span className="inline-flex items-center gap-1 cursor-pointer paragraph-sm text-primary hover:text-brand">
                            {currentRole === 'lead' ? 'Lead' : 'Member'}
                        </span>
                    </Dropdown.Trigger>
                    <Dropdown.Panel>
                        {(['member', 'lead'] as DepartmentRole[]).filter(r => r !== currentRole).map(r => (
                            <Dropdown.Item key={r} onSelect={() => handleRole(r)}>
                                {r === 'lead' ? 'Lead' : 'Member'}
                            </Dropdown.Item>
                        ))}
                    </Dropdown.Panel>
                </Dropdown.Root>
            </Table.Cell>
            <Table.Cell className="px-3 py-2 text-right">
                <Button variant="danger-secondary" icon={<Trash2 />} onClick={() => onRemove(member)}>
                    Remove
                </Button>
            </Table.Cell>
        </Table.Row>
    )
}
