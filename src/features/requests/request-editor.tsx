import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Archive, ArchiveRestore, Building2, Calendar, CircleAlert, CircleChevronDown, Clock, Hash, History, Loader, Save, Search, Tag, Trash2, Undo2, User, UserPlus, X } from 'lucide-react'
import { Avatar } from '@/components/display/avatar'
import { Badge } from '@/components/display/badge'
import { Button } from '@/components/controls/button'
import { Dropdown } from '@/components/overlays/dropdown'
import { Input } from '@/components/form/input'
import { Textarea } from '@/components/form/textarea'
import { Label, Paragraph } from '@/components/display/text'
import { MetaRow } from '@/components/display/meta-row'
import { Modal } from '@/components/overlays/modal'
import { useFeedback } from '@/components/feedback/feedback-provider'
import { useConfirm } from '@/components/feedback/confirm-modal'
import { useCategories } from '@/features/categories/categories-provider'
import { useDepartments } from '@/features/departments/department-provider'
import { useMembers } from '@/features/members/members-provider'
import type { ResolvedMember } from '@/data/fetch-workspace-members'
import { badgeColor } from '@/lib/color-keys'
import { cn } from '@/utils/cn'
import { formatUtcIsoForBrowserDateTimeInput, parseBrowserDateTimeInputToUtcIso } from '@/utils/browser-date-time'
import { getErrorMessage } from '@/utils/get-error-message'
import { routes } from '@/screens/app-routes'
import { priorityColor, priorityLabel, statusColor, statusLabel } from '@/types/requests'
import type { Priority, Request, ResolvedAssignee, Status } from '@/types/requests'
import { RequestEditorProvider, useRequestEditor } from './request-editor-provider'
import { fiveWFields, formatRequestDate, requestStatusIcon } from './request-properties-view'

const editableStatuses: Status[] = ['submitted', 'triaged', 'in_progress', 'blocked', 'completed']
const allPriorities: Priority[] = ['low', 'medium', 'high', 'urgent']

// ─── Root ────────────────────────────────────────────────────────────

type RootProps = {
    request: Request
    assignees: ResolvedAssignee[]
    onSync: (request: Request) => void
    onRemove: (id: string) => void
    children: ReactNode
}

function Root({ request, assignees, onSync, onRemove, children }: RootProps) {
    return (
        <RequestEditorProvider request={request} assignees={assignees} onSync={onSync} onRemove={onRemove}>
            {children}
        </RequestEditorProvider>
    )
}

// ─── Title ───────────────────────────────────────────────────────────

function Title() {
    const { state, actions } = useRequestEditor()
    return (
        <Input
            value={state.draft.title}
            onChange={e => actions.updateField('title', e.target.value)}
            style="ghost"
            className="text-3xl font-semibold"
        />
    )
}

// ─── Error banner ────────────────────────────────────────────────────

function ErrorBanner() {
    const { state } = useRequestEditor()
    if (!state.error) return null
    return (
        <div className="rounded-lg border border-error bg-error_subtle p-3">
            <p className="paragraph-sm text-error">{state.error}</p>
        </div>
    )
}

// ─── Meta fields ─────────────────────────────────────────────────────

function StatusRow() {
    const { state, actions } = useRequestEditor()
    const status = state.draft.status
    return (
        <MetaRow icon={<Loader />} label="Status">
            <Dropdown.Root placement="bottom">
                <Dropdown.Trigger>
                    <Badge label={statusLabel[status]} icon={requestStatusIcon[status]} color={badgeColor(statusColor[status])} className="cursor-pointer" />
                </Dropdown.Trigger>
                <Dropdown.Panel>
                    {editableStatuses.map(s => (
                        <Dropdown.Item key={s} onSelect={() => actions.updateField('status', s)} className="px-1">
                            <Badge label={statusLabel[s]} icon={requestStatusIcon[s]} color={badgeColor(statusColor[s])} />
                        </Dropdown.Item>
                    ))}
                </Dropdown.Panel>
            </Dropdown.Root>
        </MetaRow>
    )
}

function PriorityRow() {
    const { state, actions } = useRequestEditor()
    const priority = state.draft.priority
    return (
        <MetaRow icon={<CircleChevronDown />} label="Priority">
            <Dropdown.Root placement="bottom">
                <Dropdown.Trigger>
                    <Badge label={priorityLabel[priority]} icon={<CircleAlert />} color={badgeColor(priorityColor[priority])} className="cursor-pointer" />
                </Dropdown.Trigger>
                <Dropdown.Panel>
                    {allPriorities.map(p => (
                        <Dropdown.Item key={p} onSelect={() => actions.updateField('priority', p)} className="px-1">
                            <Badge label={priorityLabel[p]} icon={<CircleAlert />} color={badgeColor(priorityColor[p])} />
                        </Dropdown.Item>
                    ))}
                </Dropdown.Panel>
            </Dropdown.Root>
        </MetaRow>
    )
}

function CategoryRow() {
    const { state, actions } = useRequestEditor()
    const { state: { categories } } = useCategories()

    const selected = categories.find(c => c.id === state.draft.categoryId) ?? null
    const triggerLabel = selected?.label ?? state.draft.categoryLabel ?? 'Uncategorized'
    const triggerColor = badgeColor(selected?.colorKey ?? state.draft.categoryColor)

    return (
        <MetaRow icon={<Tag />} label="Category">
            <Dropdown.Root placement="bottom">
                <Dropdown.Trigger>
                    <Badge label={triggerLabel} icon={<Tag />} color={triggerColor} className="cursor-pointer" />
                </Dropdown.Trigger>
                <Dropdown.Panel>
                    <Dropdown.Item onSelect={() => actions.updateField('categoryId', null as Request['categoryId'])} className="px-1">
                        <Badge label="Uncategorized" icon={<Tag />} color="gray" />
                    </Dropdown.Item>
                    {categories.map(c => (
                        <Dropdown.Item key={c.id} onSelect={() => actions.updateField('categoryId', c.id as Request['categoryId'])} className="px-1">
                            <Badge label={c.label} icon={<Tag />} color={badgeColor(c.colorKey)} />
                        </Dropdown.Item>
                    ))}
                </Dropdown.Panel>
            </Dropdown.Root>
        </MetaRow>
    )
}

function DepartmentRow() {
    const { state, actions } = useRequestEditor()
    const { state: { allDepartments: departments } } = useDepartments()

    const selected = departments.find(d => d.id === state.draft.departmentId) ?? null
    const triggerLabel = selected?.name ?? state.draft.departmentName ?? 'Department'
    const triggerColor = badgeColor(selected?.colorKey)

    return (
        <MetaRow icon={<Building2 />} label="Department">
            <Dropdown.Root placement="bottom">
                <Dropdown.Trigger>
                    <Badge label={triggerLabel} icon={<Building2 />} color={triggerColor} className="cursor-pointer" />
                </Dropdown.Trigger>
                <Dropdown.Panel>
                    {departments.map(d => (
                        <Dropdown.Item key={d.id} onSelect={() => actions.updateField('departmentId', d.id)} className="px-1">
                            <Badge label={d.name} icon={<Building2 />} color={badgeColor(d.colorKey)} />
                        </Dropdown.Item>
                    ))}
                </Dropdown.Panel>
            </Dropdown.Root>
        </MetaRow>
    )
}

function DueDateRow() {
    const { state, actions } = useRequestEditor()
    return (
        <MetaRow icon={<Calendar className="size-4" />} label="Due date">
            <Input
                type="datetime-local"
                value={formatUtcIsoForBrowserDateTimeInput(state.draft.dueDate)}
                onChange={e => {
                    const v = e.target.value
                    actions.updateField('dueDate', v ? parseBrowserDateTimeInputToUtcIso(v) : null)
                }}
                style="ghost"
            />
        </MetaRow>
    )
}

function MetaFields() {
    const { state } = useRequestEditor()
    return (
        <div className="space-y-3">
            <MetaRow icon={<Hash className="size-4" />} label="Tracking ID">
                <Paragraph.sm className="font-mono">{state.draft.trackingId}</Paragraph.sm>
            </MetaRow>

            <StatusRow />
            <PriorityRow />
            <CategoryRow />
            <DepartmentRow />
            <DueDateRow />

            <MetaRow icon={<User className="size-4" />} label="Requested by">
                <Paragraph.sm>{state.draft.requestedByName || 'No requester'}</Paragraph.sm>
            </MetaRow>

            <MetaRow icon={<Clock className="size-4" />} label="Created">
                <Paragraph.sm>{formatRequestDate(state.draft.createdAt)}</Paragraph.sm>
            </MetaRow>

            <MetaRow icon={<History className="size-4" />} label="Updated">
                <Paragraph.sm>{formatRequestDate(state.draft.updatedAt)}</Paragraph.sm>
            </MetaRow>
        </div>
    )
}

// ─── 5Ws ─────────────────────────────────────────────────────────────

function FiveW({ className }: { className?: string }) {
    const { state, actions } = useRequestEditor()
    return (
        <div className={cn(className)}>
            <Label.md className="block pb-3">5Ws and 1H</Label.md>
            <div className="space-y-3">
                {fiveWFields.map(({ key, label }) => (
                    <div key={key} className="space-y-1">
                        <Label.sm className="text-primary">{label}</Label.sm>
                        <Textarea
                            value={state.draft[key] as string}
                            onChange={e => actions.updateField(key, e.target.value as Request[typeof key])}
                            placeholder={`${label}…`}
                            rows={2}
                        />
                    </div>
                ))}
            </div>
        </div>
    )
}

// ─── Notes ───────────────────────────────────────────────────────────

function Notes({ className }: { className?: string }) {
    const { state, actions } = useRequestEditor()
    return (
        <div className={cn(className)}>
            <Label.md className="block pb-3">Notes</Label.md>
            <Textarea
                value={state.draft.notes ?? ''}
                onChange={e => actions.updateField('notes', e.target.value as Request['notes'])}
                placeholder="Internal notes…"
                rows={4}
            />
        </div>
    )
}

// ─── Action buttons ──────────────────────────────────────────────────

function SaveButton() {
    const { state, actions } = useRequestEditor()
    const { toast } = useFeedback()

    async function handleSave() {
        try {
            await actions.save()
            toast({ title: 'Request saved', variant: 'success' })
        } catch (error) {
            toast({ title: 'Save failed', description: getErrorMessage(error, 'Could not save the request.'), variant: 'error' })
        }
    }

    if (!state.isDirty) return null

    return (
        <Button icon={<Save />} onClick={handleSave} disabled={state.isSaving}>
            {state.isSaving ? 'Saving…' : 'Save'}
        </Button>
    )
}

function DiscardButton() {
    const { state, actions } = useRequestEditor()
    if (!state.isDirty) return null
    return (
        <Button variant="secondary" icon={<Undo2 />} onClick={actions.discard} disabled={state.isSaving}>
            Discard
        </Button>
    )
}

function ArchiveButton() {
    const { state, actions } = useRequestEditor()
    const { toast } = useFeedback()
    const isArchived = state.draft.status === 'archived'

    async function handleArchive() {
        try {
            const next = isArchived ? await actions.unarchive() : await actions.archive()
            toast({ title: next.status === 'archived' ? 'Archived' : 'Restored', variant: 'success' })
        } catch (error) {
            toast({ title: 'Update failed', description: getErrorMessage(error, 'Could not update.'), variant: 'error' })
        }
    }

    return (
        <Button
            variant="secondary"
            className="w-full"
            icon={isArchived ? <ArchiveRestore /> : <Archive />}
            onClick={handleArchive}
            disabled={state.isSaving}
        >
            {isArchived ? 'Restore from archive' : 'Archive request'}
        </Button>
    )
}

function DeleteButton() {
    const { state, actions } = useRequestEditor()
    const { toast } = useFeedback()
    const confirm = useConfirm()
    const navigate = useNavigate()

    async function handleDelete() {
        const ok = await confirm({
            title: 'Delete this request?',
            description: 'This is permanent. Comments, assignees, and the activity timeline will be removed.',
            confirmLabel: 'Delete',
            intent: 'danger',
        })
        if (!ok) return
        try {
            await actions.delete()
            toast({ title: 'Request deleted', variant: 'success' })
            navigate(`/${routes.dashboard}`)
        } catch (error) {
            toast({ title: 'Delete failed', description: getErrorMessage(error, 'Could not delete.'), variant: 'error' })
        }
    }

    return (
        <Button
            variant="danger-secondary"
            className="w-full"
            icon={<Trash2 />}
            onClick={handleDelete}
            disabled={state.isSaving}
        >
            Delete request
        </Button>
    )
}

// ─── Assignees ───────────────────────────────────────────────────────

type StagedAssignee = {
    member: ResolvedMember
    duty: string
}

function memberInitials(m: ResolvedMember) {
    const a = m.profile.name[0] ?? ''
    const b = m.profile.surname?.[0] ?? ''
    return `${a}${b}`.trim() || a || '?'
}

function assigneeInitials(a: ResolvedAssignee) {
    return `${a.name[0] ?? ''}${a.surname?.[0] ?? ''}`.trim() || a.name[0] || '?'
}

function AssigneeDialog({
    open,
    onClose,
    candidates,
    onCommit,
}: {
    open: boolean
    onClose: () => void
    candidates: ResolvedMember[]
    onCommit: (staged: StagedAssignee[]) => Promise<void>
}) {
    const confirm = useConfirm()
    const [query, setQuery] = useState('')
    const [staged, setStaged] = useState<StagedAssignee[]>([])
    const [busy, setBusy] = useState(false)
    const searchRef = useRef<HTMLInputElement>(null)

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
            setStaged(prev => [...prev, { member: m, duty: '' }])
        }
    }

    function updateDuty(profileId: string, duty: string) {
        setStaged(prev => prev.map(s =>
            s.member.profile.id === profileId ? { ...s, duty } : s
        ))
    }

    async function handleClose() {
        if (staged.length === 0) { onClose(); return }
        const ok = await confirm({
            title: 'Discard selections?',
            description: `You have ${staged.length} person${staged.length > 1 ? 's' : ''} staged. Close without assigning?`,
            confirmLabel: 'Discard',
            intent: 'danger',
        })
        if (ok) onClose()
    }

    async function handleCommit() {
        if (staged.length === 0) return
        setBusy(true)
        try {
            await onCommit(staged)
            onClose()
        } finally {
            setBusy(false)
        }
    }

    return (
        <Modal.Root open={open} onOpenChange={next => { if (!next) handleClose() }}>
            <Modal.Portal>
                <Modal.Backdrop />
                <Modal.Positioner>
                    <Modal.Panel className="!max-w-lg w-full flex flex-col" style={{ maxHeight: '80vh' }}>
                        {/* Header */}
                        <Modal.Header>
                            <UserPlus className="size-4 text-tertiary shrink-0" />
                            <Label.lg className="flex-1">Add assignees</Label.lg>
                            <Button.Icon icon={<X />} variant="ghost" aria-label="Close" onClick={handleClose} />
                        </Modal.Header>

                        <Modal.Content className="p-0">
                            {/* Search */}
                            <div className="px-3 pt-3 pb-2 border-b border-secondary">
                                <Input
                                    ref={searchRef}
                                    icon={<Search />}
                                    placeholder="Search department members…"
                                    value={query}
                                    onChange={e => setQuery(e.target.value)}
                                />
                            </div>

                            {/* Member list */}
                            <div className="overflow-y-auto" style={{ maxHeight: 260 }}>
                                {filtered.length === 0 ? (
                                    <div className="px-4 py-6 text-center">
                                        <Paragraph.sm className="text-quaternary">No members found.</Paragraph.sm>
                                    </div>
                                ) : (
                                    <ul className="py-1">
                                        {filtered.map(m => {
                                            const isSelected = stagedIds.has(m.profile.id)
                                            const fullName = [m.profile.name, m.profile.surname].filter(Boolean).join(' ')
                                            return (
                                                <li key={m.profile.id}>
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleMember(m)}
                                                        className={cn(
                                                            'w-full flex items-center gap-3 px-3 py-2 text-left transition-colors',
                                                            isSelected
                                                                ? 'bg-brand_primary/10'
                                                                : 'hover:bg-primary_hover'
                                                        )}
                                                    >
                                                        <Avatar.initials size="sm" name={memberInitials(m)} className="shrink-0" />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="label-sm text-primary truncate">{fullName}</p>
                                                            <p className="paragraph-xs text-tertiary truncate">{m.profile.email}</p>
                                                        </div>
                                                        {isSelected && (
                                                            <span className="size-4 rounded-full bg-brand_solid flex items-center justify-center shrink-0">
                                                                <svg className="size-2.5 text-white" viewBox="0 0 10 8" fill="none">
                                                                    <path d="M1 4l2.5 2.5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                                </svg>
                                                            </span>
                                                        )}
                                                    </button>
                                                </li>
                                            )
                                        })}
                                    </ul>
                                )}
                            </div>

                            {/* Staged assignees with role inputs */}
                            {staged.length > 0 && (
                                <div className="border-t border-secondary px-3 py-3 space-y-2">
                                    <Label.sm className="text-tertiary block mb-2">Selected — assign a role</Label.sm>
                                    {staged.map(s => {
                                        const fullName = [s.member.profile.name, s.member.profile.surname].filter(Boolean).join(' ')
                                        return (
                                            <div key={s.member.profile.id} className="flex items-center gap-2">
                                                <Avatar.initials size="xs" name={memberInitials(s.member)} className="shrink-0" />
                                                <span className="label-sm text-primary min-w-0 truncate flex-1">{fullName}</span>
                                                <Input
                                                    value={s.duty}
                                                    onChange={e => updateDuty(s.member.profile.id, e.target.value)}
                                                    placeholder="Role (e.g. Producer)"
                                                    className="w-40 shrink-0"
                                                />
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

                        {/* Footer */}
                        <Modal.Footer className="justify-between">
                            <Paragraph.xs className="text-quaternary">
                                {staged.length === 0
                                    ? 'Click members above to select them'
                                    : `${staged.length} person${staged.length > 1 ? 's' : ''} selected`}
                            </Paragraph.xs>
                            <div className="flex gap-2">
                                <Button variant="secondary" onClick={handleClose} disabled={busy}>
                                    Cancel
                                </Button>
                                <Button
                                    icon={<UserPlus />}
                                    onClick={handleCommit}
                                    disabled={staged.length === 0 || busy}
                                >
                                    {busy ? 'Assigning…' : 'Assign'}
                                </Button>
                            </div>
                        </Modal.Footer>
                    </Modal.Panel>
                </Modal.Positioner>
            </Modal.Portal>
        </Modal.Root>
    )
}

function Assignees() {
    const { state, actions } = useRequestEditor()
    const { toast } = useFeedback()
    const [dialogOpen, setDialogOpen] = useState(false)
    const { state: { members } } = useMembers()

    const assignedIds = new Set(state.assignees.map(a => a.userId))
    const departmentId = state.draft.departmentId

    const candidates = useMemo(() => {
        const active = members.filter(m => m.membership.status === 'active' && !assignedIds.has(m.profile.id))
        return active.filter(m => m.departments.some(d => d.id === departmentId))
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [members, state.assignees, departmentId])

    async function handleCommit(staged: StagedAssignee[]) {
        const results = await Promise.allSettled(
            staged.map(s => actions.addAssignee(s.member.profile.id, s.duty.trim()))
        )
        const failed = results.filter(r => r.status === 'rejected').length
        if (failed === 0) {
            toast({ title: `${staged.length} assignee${staged.length > 1 ? 's' : ''} added`, variant: 'success' })
        } else {
            toast({ title: `${staged.length - failed} added, ${failed} failed`, variant: 'error' })
        }
    }

    async function handleRemove(userId: string) {
        try {
            await actions.removeAssignee(userId)
            toast({ title: 'Assignee removed', variant: 'info' })
        } catch (err) {
            toast({ title: 'Could not remove assignee', description: getErrorMessage(err, 'Try again.'), variant: 'error' })
        }
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <Label.md>Assignees</Label.md>
                <Button
                    variant="secondary"
                    icon={<UserPlus />}
                    onClick={() => setDialogOpen(true)}
                >
                    Add
                </Button>
            </div>

            {state.assignees.length > 0 ? (
                <div className="space-y-2">
                    {state.assignees.map(a => (
                        <div key={a.id} className="flex items-center gap-3 rounded-lg border border-secondary bg-primary px-3 py-2.5">
                            <Avatar.initials size="sm" name={assigneeInitials(a)} className="shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="label-sm text-primary">{[a.name, a.surname].filter(Boolean).join(' ')}</p>
                                {a.duty && (
                                    <span className="inline-block mt-0.5 rounded-md bg-secondary px-1.5 py-0.5 paragraph-xs text-secondary font-medium">
                                        {a.duty}
                                    </span>
                                )}
                            </div>
                            <Button.Icon
                                aria-label={`Remove ${a.name}`}
                                icon={<X />}
                                variant="ghost"
                                onClick={() => handleRemove(a.userId)}
                            />
                        </div>
                    ))}
                </div>
            ) : (
                <Paragraph.sm className="text-quaternary">No assignees yet.</Paragraph.sm>
            )}

            <AssigneeDialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                candidates={candidates}
                onCommit={handleCommit}
            />
        </div>
    )
}

// ─── Danger zone ─────────────────────────────────────────────────────

function DangerZone() {
    const { state } = useRequestEditor()
    const isArchived = state.draft.status === 'archived'

    return (
        <div className="space-y-5 max-w-xl">
            <div className="space-y-1">
                <Label.md>Danger zone</Label.md>
                <Paragraph.sm className="text-tertiary">
                    These actions change what happens to this request. Archive is reversible; delete is not.
                </Paragraph.sm>
            </div>

            <div className="space-y-2">
                <Paragraph.sm className="text-tertiary">
                    {isArchived
                        ? 'Restoring puts the request back into the active queue with a status of Submitted, and it shows up in dashboards and kanban boards again.'
                        : 'Archiving hides the request from active views (dashboard, department list, kanban) but keeps it, its comments, and its activity timeline intact. You can restore it any time.'}
                </Paragraph.sm>
                <ArchiveButton />
            </div>

            <div className="space-y-2">
                <Paragraph.sm className="text-tertiary">
                    Deleting permanently removes the request along with every comment, assignee, and activity-log entry.
                    There is no undo. Use this only when the request shouldn't have been submitted in the first place.
                </Paragraph.sm>
                <DeleteButton />
            </div>
        </div>
    )
}

// ─── Compound export ─────────────────────────────────────────────────

export const RequestEditor = {
    Root,
    Title,
    ErrorBanner,
    MetaFields,
    FiveW,
    Notes,
    Assignees,
    DangerZone,
    SaveButton,
    DiscardButton,
    ArchiveButton,
    DeleteButton,
}
