import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { ChevronDown, Mail, UserPlus, X } from 'lucide-react'
import { Modal } from '@/components/overlays/modal'
import { Button } from '@/components/controls/button'
import { Input } from '@/components/form/input'
import { FormLabel } from '@/components/form/form-label'
import { Dropdown } from '@/components/overlays/dropdown'
import { Badge } from '@/components/display/badge'
import { Indicator } from '@/components/display/indicator'
import { Label, Paragraph } from '@/components/display/text'
import { badgeColor } from '@/lib/color-keys'
import type { Department, DepartmentRole } from '@/types/departments'
import type { WorkspaceRole } from '@/types/workspaces'

export type InviteSubmitValues = {
    email: string
    name: string
    workspaceRoleId: string
    departmentAssignments: { departmentId: string; role: DepartmentRole }[]
}

type InviteMemberModalProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    roles: WorkspaceRole[]
    departments: Department[]
    onSubmit: (values: InviteSubmitValues) => Promise<void>
}

type StagedDept = { department: Department; role: DepartmentRole }

export function InviteMemberModal({ open, onOpenChange, roles, departments, onSubmit }: InviteMemberModalProps) {
    const emailRef = useRef<HTMLInputElement>(null)
    const [email, setEmail] = useState('')
    const [name, setName] = useState('')
    const [workspaceRoleId, setWorkspaceRoleId] = useState<string>('')
    const [stagedDepts, setStagedDepts] = useState<StagedDept[]>([])
    const [busy, setBusy] = useState(false)

    useEffect(() => {
        if (open) {
            setEmail('')
            setName('')
            setWorkspaceRoleId(roles[0]?.id ?? '')
            setStagedDepts([])
            setBusy(false)
            setTimeout(() => emailRef.current?.focus(), 50)
        }
    }, [open, roles])

    function handleClose() {
        if (busy) return
        onOpenChange(false)
    }

    function toggleDept(d: Department) {
        setStagedDepts(prev => {
            const exists = prev.find(s => s.department.id === d.id)
            if (exists) return prev.filter(s => s.department.id !== d.id)
            return [...prev, { department: d, role: 'member' }]
        })
    }

    function setDeptRole(departmentId: string, role: DepartmentRole) {
        setStagedDepts(prev => prev.map(s => s.department.id === departmentId ? { ...s, role } : s))
    }

    async function handleSubmit(e: FormEvent) {
        e.preventDefault()
        if (!email.trim() || !workspaceRoleId) return
        setBusy(true)
        try {
            await onSubmit({
                email: email.trim(),
                name: name.trim(),
                workspaceRoleId,
                departmentAssignments: stagedDepts.map(s => ({ departmentId: s.department.id, role: s.role })),
            })
            onOpenChange(false)
        } finally {
            setBusy(false)
        }
    }

    const selectedRole = roles.find(r => r.id === workspaceRoleId) ?? null
    const stagedIds = new Set(stagedDepts.map(s => s.department.id))
    const candidates = departments.filter(d => !stagedIds.has(d.id))

    return (
        <Modal.Root open={open} onOpenChange={onOpenChange}>
            <Modal.Portal>
                <Modal.Backdrop />
                <Modal.Positioner>
                    <Modal.Panel className="!max-w-lg w-full">
                        <Modal.Header>
                            <UserPlus className="size-4 text-tertiary shrink-0" />
                            <Label.lg className="flex-1">Invite member</Label.lg>
                            <Button.Icon icon={<X />} variant="ghost" aria-label="Close" onClick={handleClose} />
                        </Modal.Header>

                        <form onSubmit={handleSubmit}>
                            <Modal.Content className="space-y-4">
                                <div className="space-y-1">
                                    <FormLabel label="Email" required />
                                    <Input
                                        ref={emailRef}
                                        type="email"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        placeholder="person@company.com"
                                        icon={<Mail />}
                                        required
                                    />
                                </div>

                                <div className="space-y-1">
                                    <FormLabel label="Name" optional />
                                    <Input
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        placeholder="Their full name"
                                    />
                                    <Paragraph.xs className="text-quaternary">
                                        Used as their display name until they update their profile.
                                    </Paragraph.xs>
                                </div>

                                <div className="space-y-1">
                                    <FormLabel label="Workspace role" required />
                                    <Dropdown.Root placement="bottom-start" className="w-full">
                                        <Dropdown.Trigger className="w-full">
                                            <span className="flex w-full items-center gap-2 cursor-pointer rounded-lg border border-secondary px-3 py-2 hover:bg-secondary">
                                                <span className="paragraph-sm text-primary flex-1 text-left">
                                                    {selectedRole?.name ?? 'Select a role'}
                                                </span>
                                                <ChevronDown className="size-4 text-tertiary shrink-0" />
                                            </span>
                                        </Dropdown.Trigger>
                                        <Dropdown.Panel>
                                            {roles.map(r => (
                                                <Dropdown.Item key={r.id} onSelect={() => setWorkspaceRoleId(r.id)}>
                                                    <span>{r.name}</span>
                                                </Dropdown.Item>
                                            ))}
                                        </Dropdown.Panel>
                                    </Dropdown.Root>
                                </div>

                                <div className="space-y-2">
                                    <FormLabel label="Departments" optional />
                                    {stagedDepts.length > 0 && (
                                        <div className="space-y-1.5">
                                            {stagedDepts.map(s => (
                                                <div key={s.department.id} className="flex items-center gap-2 rounded-lg border border-secondary bg-primary px-2.5 py-2">
                                                    <Indicator color={badgeColor(s.department.colorKey)} className="size-4 shrink-0" />
                                                    <span className="paragraph-sm text-primary flex-1 truncate">{s.department.name}</span>
                                                    <Dropdown.Root placement="bottom-end">
                                                        <Dropdown.Trigger>
                                                            <span className="inline-flex items-center gap-1 cursor-pointer paragraph-sm text-primary hover:text-brand">
                                                                {s.role === 'lead' ? 'Lead' : 'Member'}
                                                                <ChevronDown className="size-3.5" />
                                                            </span>
                                                        </Dropdown.Trigger>
                                                        <Dropdown.Panel>
                                                            {(['member', 'lead'] as DepartmentRole[]).filter(r => r !== s.role).map(r => (
                                                                <Dropdown.Item key={r} onSelect={() => setDeptRole(s.department.id, r)}>
                                                                    {r === 'lead' ? 'Lead' : 'Member'}
                                                                </Dropdown.Item>
                                                            ))}
                                                        </Dropdown.Panel>
                                                    </Dropdown.Root>
                                                    <Button.Icon
                                                        icon={<X />}
                                                        variant="ghost"
                                                        aria-label={`Remove ${s.department.name}`}
                                                        onClick={() => toggleDept(s.department)}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {candidates.length > 0 ? (
                                        <Dropdown.Root placement="bottom-start" className="w-full">
                                            <Dropdown.Trigger className="w-full">
                                                <span className="flex w-full items-center gap-2 cursor-pointer rounded-lg border border-dashed border-secondary px-3 py-2 hover:bg-secondary">
                                                    <span className="paragraph-sm text-tertiary flex-1 text-left">Add a department</span>
                                                    <ChevronDown className="size-4 text-tertiary shrink-0" />
                                                </span>
                                            </Dropdown.Trigger>
                                            <Dropdown.Panel>
                                                {candidates.map(d => (
                                                    <Dropdown.Item key={d.id} onSelect={() => toggleDept(d)}>
                                                        <Indicator color={badgeColor(d.colorKey)} className="size-4 shrink-0" />
                                                        <span>{d.name}</span>
                                                    </Dropdown.Item>
                                                ))}
                                            </Dropdown.Panel>
                                        </Dropdown.Root>
                                    ) : stagedDepts.length === 0 ? (
                                        <Paragraph.xs className="text-quaternary">
                                            No departments to assign yet. You can create one in the Departments tab.
                                        </Paragraph.xs>
                                    ) : null}
                                </div>

                                <div className="rounded-lg border border-secondary bg-secondary px-3 py-2">
                                    <Paragraph.xs className="text-tertiary">
                                        We'll email them a link to accept and set a password.
                                        {selectedRole && (
                                            <> They'll join as <Badge label={selectedRole.name} color="blue" /> immediately on acceptance.</>
                                        )}
                                    </Paragraph.xs>
                                </div>
                            </Modal.Content>

                            <Modal.Footer>
                                <Button type="button" variant="secondary" onClick={handleClose} disabled={busy} className="flex-1">
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={!email.trim() || !workspaceRoleId || busy} className="flex-1">
                                    {busy ? 'Sending…' : 'Send invite'}
                                </Button>
                            </Modal.Footer>
                        </form>
                    </Modal.Panel>
                </Modal.Positioner>
            </Modal.Portal>
        </Modal.Root>
    )
}
