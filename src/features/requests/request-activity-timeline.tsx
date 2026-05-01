import { Avatar } from '@/components/display/avatar'
import { Label, Paragraph } from '@/components/display/text'
import { Spinner } from '@/components/feedback/spinner'
import { formatUtcIsoInBrowserTimeZone } from '@/utils/browser-date-time'
import { useRequestActivity } from './use-request-activity'
import { formatActivity } from './format-activity'

type RequestActivityTimelineProps = {
    requestId: string
}

export function RequestActivityTimeline({ requestId }: RequestActivityTimelineProps) {
    const { entries, loading } = useRequestActivity(requestId)

    return (
        <div>
            <Label.md className="block pb-3">Activity</Label.md>
            {loading ? (
                <div className="flex justify-center py-4"><Spinner size="md" /></div>
            ) : entries.length === 0 ? (
                <Paragraph.sm className="text-quaternary">No activity yet.</Paragraph.sm>
            ) : (
                <ol className="space-y-3 border-l border-secondary pl-4">
                    {entries.map(entry => (
                        <li key={entry.id} className="relative">
                            <span className="absolute -left-[21px] top-1 size-2.5 rounded-full bg-secondary border border-primary" />
                            <div className="flex items-start gap-2">
                                {entry.actorInitials ? (
                                    <Avatar.initials size="sm" name={entry.actorInitials} />
                                ) : (
                                    <span className="size-6 rounded-full bg-secondary grid place-items-center text-xs text-quaternary">
                                        ?
                                    </span>
                                )}
                                <div className="flex-1 min-w-0">
                                    <Paragraph.sm className="text-secondary">{formatActivity(entry)}</Paragraph.sm>
                                    <Paragraph.xs className="text-quaternary">
                                        {formatUtcIsoInBrowserTimeZone(entry.createdAt)}
                                    </Paragraph.xs>
                                </div>
                            </div>
                        </li>
                    ))}
                </ol>
            )}
        </div>
    )
}
