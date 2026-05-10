import { Archive, Ban, Building2, Calendar, Check, CircleAlert, CircleChevronDown, CircleDashed, Clock, Hash, History, Loader, Tag, Triangle, User, X } from 'lucide-react'
import { Badge } from '@/components/display/badge'
import { Label, Paragraph } from '@/components/display/text'
import { Avatar } from '@/components/display/avatar'
import { MetaRow } from '@/components/display/meta-row'
import { cn } from '@/utils/cn'
import { formatUtcIsoInBrowserTimeZone } from '@/utils/browser-date-time'
import { badgeColor } from '@/lib/color-keys'
import type { Request, ResolvedAssignee, Status } from '@/types/requests'
import { statusLabel, statusColor, priorityLabel, priorityColor } from '@/types/requests'

export function formatRequestDate(iso: string | null) {
    if (!iso) return 'Not set'
    return formatUtcIsoInBrowserTimeZone(iso)
}

export const requestStatusIcon: Record<Status, React.ReactNode> = {
    submitted: <CircleDashed />,
    triaged: <Triangle />,
    in_progress: <Loader />,
    blocked: <Ban />,
    completed: <Check />,
    archived: <Archive />,
    rejected: <X />,
}

function FiveWRow({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <Label.sm className="text-primary">{label}: </Label.sm>
            <Paragraph.sm className="text-tertiary inline">{value}</Paragraph.sm>
        </div>
    )
}

function MetaView({ request }: { request: Request }) {
    return (
        <div className="space-y-3">
            <MetaRow icon={<Hash className="size-4" />} label="Tracking ID">
                <Paragraph.sm className="font-mono">{request.trackingId}</Paragraph.sm>
            </MetaRow>

            <MetaRow icon={<Loader />} label="Status">
                <Badge label={statusLabel[request.status]} icon={requestStatusIcon[request.status]} color={badgeColor(statusColor[request.status])} />
            </MetaRow>

            <MetaRow icon={<CircleChevronDown />} label="Priority">
                <Badge label={priorityLabel[request.priority]} icon={<CircleAlert />} color={badgeColor(priorityColor[request.priority])} />
            </MetaRow>

            <MetaRow icon={<Tag />} label="Category">
                {request.categoryLabel ? (
                    <Badge label={request.categoryLabel} icon={<Tag />} color={badgeColor(request.categoryColor)} />
                ) : (
                    <Paragraph.sm className="text-quaternary">Uncategorized</Paragraph.sm>
                )}
            </MetaRow>

            <MetaRow icon={<Building2 />} label="Department">
                <Paragraph.sm>{request.departmentName ?? '—'}</Paragraph.sm>
            </MetaRow>

            <MetaRow icon={<Calendar className="size-4" />} label="Due date">
                <Paragraph.sm>{formatRequestDate(request.dueDate)}</Paragraph.sm>
            </MetaRow>

            <MetaRow icon={<User className="size-4" />} label="Requested by">
                <Paragraph.sm>{request.requestedByName || 'No requester'}</Paragraph.sm>
            </MetaRow>

            <MetaRow icon={<Clock className="size-4" />} label="Created">
                <Paragraph.sm>{formatRequestDate(request.createdAt)}</Paragraph.sm>
            </MetaRow>

            <MetaRow icon={<History className="size-4" />} label="Updated">
                <Paragraph.sm>{formatRequestDate(request.updatedAt)}</Paragraph.sm>
            </MetaRow>
        </div>
    )
}

const fiveWFields: { key: keyof Request; label: string }[] = [
    { key: 'who', label: 'Who' },
    { key: 'what', label: 'What' },
    { key: 'when', label: 'When' },
    { key: 'where', label: 'Where' },
    { key: 'why', label: 'Why' },
    { key: 'how', label: 'How' },
]

function FiveWView({ request, className }: { request: Request; className?: string }) {
    return (
        <div className={cn(className)}>
            <Label.md className="block pb-3">5Ws and 1H</Label.md>
            <div className="space-y-3">
                {fiveWFields.map(({ key, label }) => (
                    <FiveWRow key={key} label={label} value={request[key] as string} />
                ))}
            </div>
        </div>
    )
}

function NotesView({ request, className }: { request: Request; className?: string }) {
    if (!request.notes) return null
    return (
        <div className={cn(className)}>
            <Label.md className="block pb-3">Notes</Label.md>
            <Paragraph.sm className="text-tertiary">{request.notes}</Paragraph.sm>
        </div>
    )
}

function AssigneesView({ assignees, className }: { assignees: ResolvedAssignee[]; className?: string }) {
    return (
        <div className={cn(className)}>
            <Label.md className="block pb-3">Assignees</Label.md>
            {assignees.length > 0 ? (
                <div className="space-y-2">
                    {assignees.map(a => (
                        <div key={a.id} className="w-full flex items-center rounded-lg space-x-2">
                            <Avatar.initials size="xs" name={`${a.name[0] ?? ''}${a.surname?.[0] ?? ''}`.trim() || a.name[0]} />
                            <div className="flex-1 min-w-0">
                                <Label.sm>{[a.name, a.surname].filter(Boolean).join(' ')}</Label.sm>
                                {a.duty && <Paragraph.xs className="text-quaternary truncate">{a.duty}</Paragraph.xs>}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <Paragraph.sm className="text-quaternary">No assignees</Paragraph.sm>
            )}
        </div>
    )
}

export const RequestPropertiesView = {
    Meta: MetaView,
    FiveW: FiveWView,
    Notes: NotesView,
    Assignees: AssigneesView,
}

export { fiveWFields }
