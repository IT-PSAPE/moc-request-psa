import { useEffect, useMemo, useState } from 'react'
import { Archive, Ban, Building2, Calendar, Check, CircleAlert, CircleChevronDown, CircleDashed, Clock, Hash, History, Loader, Tag, Triangle, User, X } from 'lucide-react'
import { Badge } from '@/components/display/badge'
import { Label, Paragraph } from '@/components/display/text'
import { Avatar } from '@/components/display/avatar'
import { Dropdown } from '@/components/overlays/dropdown'
import { MetaRow } from '@/components/display/meta-row'
import { Input } from '@/components/form/input'
import { Select } from '@/components/form/select'
import { Button } from '@/components/controls/button'
import { cn } from '@/utils/cn'
import { formatUtcIsoForBrowserDateTimeInput, formatUtcIsoInBrowserTimeZone, parseBrowserDateTimeInputToUtcIso } from '@/utils/browser-date-time'
import { fetchCategoriesForCurrentWorkspace } from '@/data/fetch-categories'
import { fetchDepartmentsForCurrentWorkspace } from '@/data/fetch-departments'
import { badgeColor } from '@/lib/color-keys'
import type { Request, Status, Priority, ResolvedAssignee } from '@/types/requests'
import type { Category } from '@/types/categories'
import type { Department } from '@/types/departments'
import { statusLabel, statusColor, priorityLabel, priorityColor } from '@/types/requests'

export function formatDate(iso: string | null) {
    if (!iso) return 'Not set'
    return formatUtcIsoInBrowserTimeZone(iso)
}

export function FiveWRow({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <Label.sm className="text-primary">{label}: </Label.sm>
            <Paragraph.sm className="text-tertiary inline">{value}</Paragraph.sm>
        </div>
    )
}

const statusIcon: Record<Status, React.ReactNode> = {
    submitted: <CircleDashed />,
    triaged: <Triangle />,
    in_progress: <Loader />,
    blocked: <Ban />,
    completed: <Check />,
    archived: <Archive />,
    rejected: <X />,
}

const editableStatuses: Status[] = ['submitted', 'triaged', 'in_progress', 'blocked', 'completed']
const allPriorities: Priority[] = ['low', 'medium', 'high', 'urgent']

type RequestMetaFieldsProps = {
    request: Request
    editable?: boolean
    onFieldChange?: <K extends keyof Request>(field: K, value: Request[K]) => void
}

export function RequestMetaFields({ request, editable = false, onFieldChange }: RequestMetaFieldsProps) {
    const [categories, setCategories] = useState<Category[]>([])
    const [departments, setDepartments] = useState<Department[]>([])

    useEffect(() => {
        if (!editable) return
        let active = true
        Promise.all([fetchCategoriesForCurrentWorkspace(), fetchDepartmentsForCurrentWorkspace()])
            .then(([cats, depts]) => {
                if (!active) return
                setCategories(cats)
                setDepartments(depts)
            })
        return () => { active = false }
    }, [editable])

    return (
        <div className="space-y-3">
            <MetaRow icon={<Hash className="size-4" />} label="Tracking ID">
                <Paragraph.sm className="font-mono">{request.trackingId}</Paragraph.sm>
            </MetaRow>

            <MetaRow icon={<Loader />} label="Status">
                {editable && onFieldChange ? (
                    <Dropdown.Root placement="bottom">
                        <Dropdown.Trigger>
                            <Badge label={statusLabel[request.status]} icon={statusIcon[request.status]} color={badgeColor(statusColor[request.status])} className="cursor-pointer" />
                        </Dropdown.Trigger>
                        <Dropdown.Panel>
                            {editableStatuses.map(s => (
                                <Dropdown.Item key={s} onSelect={() => onFieldChange('status', s)} className="px-1">
                                    <Badge label={statusLabel[s]} icon={statusIcon[s]} color={badgeColor(statusColor[s])} />
                                </Dropdown.Item>
                            ))}
                        </Dropdown.Panel>
                    </Dropdown.Root>
                ) : (
                    <Badge label={statusLabel[request.status]} icon={statusIcon[request.status]} color={badgeColor(statusColor[request.status])} />
                )}
            </MetaRow>

            <MetaRow icon={<CircleChevronDown />} label="Priority">
                {editable && onFieldChange ? (
                    <Dropdown.Root placement="bottom">
                        <Dropdown.Trigger>
                            <Badge label={priorityLabel[request.priority]} icon={<CircleAlert />} color={badgeColor(priorityColor[request.priority])} className="cursor-pointer" />
                        </Dropdown.Trigger>
                        <Dropdown.Panel>
                            {allPriorities.map(p => (
                                <Dropdown.Item key={p} onSelect={() => onFieldChange('priority', p)} className="px-1">
                                    <Badge label={priorityLabel[p]} icon={<CircleAlert />} color={badgeColor(priorityColor[p])} />
                                </Dropdown.Item>
                            ))}
                        </Dropdown.Panel>
                    </Dropdown.Root>
                ) : (
                    <Badge label={priorityLabel[request.priority]} icon={<CircleAlert />} color={badgeColor(priorityColor[request.priority])} />
                )}
            </MetaRow>

            <MetaRow icon={<Tag />} label="Category">
                {editable && onFieldChange ? (
                    <Select
                        style="ghost"
                        value={request.categoryId ?? ''}
                        onChange={e => onFieldChange('categoryId', (e.target.value || null) as Request['categoryId'])}
                    >
                        <option value="">— None —</option>
                        {categories.map(c => (
                            <option key={c.id} value={c.id}>{c.label}</option>
                        ))}
                    </Select>
                ) : request.categoryLabel ? (
                    <Badge label={request.categoryLabel} icon={<Tag />} color={badgeColor(request.categoryColor)} />
                ) : (
                    <Paragraph.sm className="text-quaternary">Uncategorized</Paragraph.sm>
                )}
            </MetaRow>

            <MetaRow icon={<Building2 />} label="Department">
                {editable && onFieldChange ? (
                    <Select
                        style="ghost"
                        value={request.departmentId ?? ''}
                        onChange={e => onFieldChange('departmentId', (e.target.value || null) as Request['departmentId'])}
                    >
                        <option value="">— Unrouted —</option>
                        {departments.map(d => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                    </Select>
                ) : request.departmentName ? (
                    <Paragraph.sm>{request.departmentName}</Paragraph.sm>
                ) : (
                    <Paragraph.sm className="text-quaternary">Unrouted</Paragraph.sm>
                )}
            </MetaRow>

            <MetaRow icon={<Calendar className="size-4" />} label="Due date">
                {editable && onFieldChange ? (
                    <Input
                        type="datetime-local"
                        value={formatUtcIsoForBrowserDateTimeInput(request.dueDate)}
                        onChange={e => {
                            const v = e.target.value
                            onFieldChange('dueDate', v ? parseBrowserDateTimeInputToUtcIso(v) : null)
                        }}
                        style="ghost"
                    />
                ) : (
                    <Paragraph.sm>{formatDate(request.dueDate)}</Paragraph.sm>
                )}
            </MetaRow>

            <MetaRow icon={<User className="size-4" />} label="Requested by">
                {editable && onFieldChange ? (
                    <Input
                        value={request.requestedByName}
                        onChange={e => onFieldChange('requestedByName', e.target.value)}
                        placeholder="Requester name"
                        className="max-w-48"
                        style="ghost"
                    />
                ) : (
                    <Paragraph.sm>{request.requestedByName || 'No requester'}</Paragraph.sm>
                )}
            </MetaRow>

            <MetaRow icon={<Clock className="size-4" />} label="Created">
                <Paragraph.sm>{formatDate(request.createdAt)}</Paragraph.sm>
            </MetaRow>

            <MetaRow icon={<History className="size-4" />} label="Updated">
                <Paragraph.sm>{formatDate(request.updatedAt)}</Paragraph.sm>
            </MetaRow>
        </div>
    )
}

type FiveWFieldsProps = {
    request: Request
    editable?: boolean
    onFieldChange?: <K extends keyof Request>(field: K, value: Request[K]) => void
    className?: string
}

export function RequestFiveW({ request, editable = false, onFieldChange, className }: FiveWFieldsProps) {
    const fields: { key: keyof Request; label: string }[] = useMemo(() => [
        { key: 'who', label: 'Who' },
        { key: 'what', label: 'What' },
        { key: 'when', label: 'When' },
        { key: 'where', label: 'Where' },
        { key: 'why', label: 'Why' },
        { key: 'how', label: 'How' },
    ], [])

    return (
        <div className={cn(className)}>
            <Label.md className="block pb-3">5Ws and 1H</Label.md>
            <div className="space-y-3">
                {fields.map(({ key, label }) => {
                    const value = request[key] as string
                    return editable && onFieldChange ? (
                        <div key={key} className="space-y-1">
                            <Label.sm className="text-primary">{label}</Label.sm>
                            <Input
                                value={value}
                                onChange={e => onFieldChange(key, e.target.value as Request[typeof key])}
                                style="outline"
                                placeholder={`${label}…`}
                            />
                        </div>
                    ) : (
                        <FiveWRow key={key} label={label} value={value} />
                    )
                })}
            </div>
        </div>
    )
}

type RequestNotesProps = {
    request: Request
    editable?: boolean
    onFieldChange?: <K extends keyof Request>(field: K, value: Request[K]) => void
    className?: string
}

export function RequestNotes({ request, editable = false, onFieldChange, className }: RequestNotesProps) {
    if (!editable && !request.notes) return null
    return (
        <div className={cn(className)}>
            <Label.md className="block pb-3">Notes</Label.md>
            {editable && onFieldChange ? (
                <Input
                    value={request.notes ?? ''}
                    onChange={e => onFieldChange('notes', e.target.value as Request['notes'])}
                    placeholder="Internal notes…"
                    style="outline"
                />
            ) : (
                <Paragraph.sm className="text-tertiary">{request.notes}</Paragraph.sm>
            )}
        </div>
    )
}

type AssigneeListProps = {
    assignees: ResolvedAssignee[]
    onRemoveMember?: (userId: string) => void
    className?: string
}

export function RequestAssigneeList({ assignees, onRemoveMember, className }: AssigneeListProps) {
    return (
        <div className={cn(className)}>
            <Label.md className="block pb-3">Assignees</Label.md>
            {assignees.length > 0 ? (
                <div className="space-y-3">
                    {assignees.map(a => (
                        <div key={a.id} className="w-full flex items-center rounded-lg py-1 space-x-2">
                            <Avatar.initials size="md" name={`${a.name[0] ?? ''}${a.surname?.[0] ?? ''}`.trim() || a.name[0]} />
                            <div className="flex-1 min-w-0">
                                <Label.sm>{[a.name, a.surname].filter(Boolean).join(' ')}</Label.sm>
                                {a.duty && <Paragraph.xs className="text-quaternary truncate">{a.duty}</Paragraph.xs>}
                            </div>
                            {onRemoveMember && <Button.Icon icon={<X />} variant="ghost" onClick={() => onRemoveMember(a.userId)} />}
                        </div>
                    ))}
                </div>
            ) : (
                <Paragraph.sm className="text-quaternary">No assignees</Paragraph.sm>
            )}
        </div>
    )
}
