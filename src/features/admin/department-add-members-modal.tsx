import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, Trash2, UserPlus, X } from 'lucide-react'
import { Modal } from '@/components/overlays/modal'
import { Button } from '@/components/controls/button'
import { Input } from '@/components/form/input'
import { Avatar } from '@/components/display/avatar'
import { Dropdown } from '@/components/overlays/dropdown'
import { Label, Paragraph } from '@/components/display/text'
import { cn } from '@/utils/cn'
import type { ResolvedMember } from '@/data/fetch-workspace-members'
import type { Department, DepartmentRole } from '@/types/departments'

type StagedMember = {
    member: ResolvedMember
    role: DepartmentRole
}

export type AddMemberSelection = {
    userId: string
    role: DepartmentRole
}

type DepartmentAddMembersModalProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    department: Department
    candidates: ResolvedMember[]
    onSubmit: (selections: AddMemberSelection[]) => Promise<void>
}

function memberInitials(m: ResolvedMember) {
    const a = m.profile.name[0] ?? ''
    const b = m.profile.surname?.[0] ?? ''
    return `${a}${b}`.trim() || a || '?'
}

export function DepartmentAddMembersModal({ open, onOpenChange, department, candidates, onSubmit }: DepartmentAddMembersModalProps) {
    const searchRef = useRef<HTMLInputElement>(null)
    const [query, setQuery] = useState('')
    const [staged, setStaged] = useState<StagedMember[]>([])
    const [busy, setBusy] = useState(false)

    useEffect(() => {
        if (open) {
            setQuery('')
            setStaged([])
            setBusy(false)
            setTimeout(() => searchRef.current?.focus(), 50)
        }
    }, [open])

    const stagedIds = useMemo(() => new Set(staged.map(s => s.member.profile.id)), [staged])

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase()
        return candidates.filter(m => {
            if (stagedIds.has(m.profile.id)) return false
            if (!q) return true
            const full = [m.profile.name, m.profile.surname].filter(Boolean).join(' ').toLowerCase()
            return full.includes(q) || m.profile.email.toLowerCase().includes(q)
        })
    }, [candidates, query, stagedIds])

    function toggleMember(m: ResolvedMember) {
        if (stagedIds.has(m.profile.id)) {
            setStaged(prev => prev.filter(s => s.member.profile.id !== m.profile.id))
        } else {
            setStaged(prev => [...prev, { member: m, role: 'member' }])
        }
    }

    function updateRole(profileId: string, role: DepartmentRole) {
        setStaged(prev => prev.map(s =>
            s.member.profile.id === profileId ? { ...s, role } : s
        ))
    }

    function handleClose() {
        if (busy) return
        onOpenChange(false)
    }

    async function handleCommit() {
        if (staged.length === 0) return
        setBusy(true)
        try {
            await onSubmit(staged.map(s => ({ userId: s.member.profile.id, role: s.role })))
            onOpenChange(false)
        } finally {
            setBusy(false)
        }
    }

    return (
        <Modal.Root open={open} onOpenChange={onOpenChange}>
            <Modal.Portal>
                <Modal.Backdrop />
                <Modal.Positioner>
                    <Modal.Panel className="!max-w-lg w-full flex flex-col" style={{ maxHeight: '80vh' }}>
                        <Modal.Header>
                            <UserPlus className="size-4 text-tertiary shrink-0" />
                            <div className="flex-1 min-w-0">
                                <Label.lg>Add to {department.name}</Label.lg>
                            </div>
                            <Button.Icon icon={<X />} variant="ghost" aria-label="Close" onClick={handleClose} />
                        </Modal.Header>

                        <Modal.Content className="p-0">
                            <div className="px-3 pt-3 pb-2 border-b border-secondary">
                                <Input
                                    ref={searchRef}
                                    icon={<Search />}
                                    placeholder="Search workspace members…"
                                    value={query}
                                    onChange={e => setQuery(e.target.value)}
                                />
                            </div>

                            <div className="overflow-y-auto" style={{ maxHeight: 260 }}>
                                {filtered.length === 0 ? (
                                    <div className="px-4 py-6 text-center">
                                        <Paragraph.sm className="text-quaternary">
                                            {candidates.length === 0
                                                ? 'Everyone is already in this department.'
                                                : 'No members match that search.'}
                                        </Paragraph.sm>
                                    </div>
                                ) : (
                                    <ul className="py-1">
                                        {filtered.map(m => {
                                            const fullName = [m.profile.name, m.profile.surname].filter(Boolean).join(' ')
                                            return (
                                                <li key={m.profile.id}>
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleMember(m)}
                                                        className={cn(
                                                            'w-full flex items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-primary_hover'
                                                        )}
                                                    >
                                                        <Avatar.initials size="sm" name={memberInitials(m)} className="shrink-0" />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="label-sm text-primary truncate">{fullName}</p>
                                                            <p className="paragraph-xs text-tertiary truncate">{m.profile.email}</p>
                                                        </div>
                                                    </button>
                                                </li>
                                            )
                                        })}
                                    </ul>
                                )}
                            </div>

                            {staged.length > 0 && (
                                <div className="border-t border-secondary px-3 py-3 space-y-2">
                                    <Label.sm className="text-tertiary block mb-2">Selected — assign a role</Label.sm>
                                    {staged.map(s => {
                                        const fullName = [s.member.profile.name, s.member.profile.surname].filter(Boolean).join(' ')
                                        return (
                                            <div key={s.member.profile.id} className="flex items-center gap-2">
                                                <Avatar.initials size="xs" name={memberInitials(s.member)} className="shrink-0" />
                                                <span className="label-sm text-primary min-w-0 truncate flex-1">{fullName}</span>
                                                <Dropdown.Root placement="bottom-end">
                                                    <Dropdown.Trigger>
                                                        <span className="inline-flex items-center cursor-pointer rounded-md border border-secondary px-2 py-1 paragraph-xs text-primary hover:bg-secondary">
                                                            {s.role === 'lead' ? 'Lead' : 'Member'}
                                                        </span>
                                                    </Dropdown.Trigger>
                                                    <Dropdown.Panel>
                                                        <Dropdown.Item onSelect={() => updateRole(s.member.profile.id, 'member')}>Member</Dropdown.Item>
                                                        <Dropdown.Item onSelect={() => updateRole(s.member.profile.id, 'lead')}>Lead</Dropdown.Item>
                                                    </Dropdown.Panel>
                                                </Dropdown.Root>
                                                <button
                                                    type="button"
                                                    onClick={() => toggleMember(s.member)}
                                                    className="text-tertiary hover:text-error shrink-0"
                                                    aria-label={`Remove ${fullName}`}
                                                >
                                                    <Trash2 className="size-3.5" />
                                                </button>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </Modal.Content>

                        <Modal.Footer>
                            <Button variant="secondary" onClick={handleClose} disabled={busy} className="flex-1">
                                Cancel
                            </Button>
                            <Button
                                icon={<UserPlus />}
                                onClick={handleCommit}
                                disabled={staged.length === 0 || busy}
                                className="flex-1"
                            >
                                {busy ? 'Adding…' : staged.length > 0 ? `Add ${staged.length}` : 'Add'}
                            </Button>
                        </Modal.Footer>
                    </Modal.Panel>
                </Modal.Positioner>
            </Modal.Portal>
        </Modal.Root>
    )
}
