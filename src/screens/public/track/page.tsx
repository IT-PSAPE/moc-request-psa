import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { CircleAlert, Tag, Building2, Clock, History, Hash } from 'lucide-react'
import { Spinner } from '@/components/feedback/spinner'
import { Badge } from '@/components/display/badge'
import { Label, Paragraph } from '@/components/display/text'
import { MetaRow } from '@/components/display/meta-row'
import { Button } from '@/components/controls/button'
import { fetchRequestByTrackingId, type PublicTrackedRequest } from '@/data/fetch-request-by-tracking-id'
import { PublicLayout } from '@/features/public-submit/public-layout'
import { badgeColor } from '@/lib/color-keys'
import { statusLabel, statusColor, priorityLabel, priorityColor } from '@/types/requests'
import { formatUtcIsoInBrowserTimeZone } from '@/utils/browser-date-time'

export function PublicTrackScreen() {
    const { trackingId } = useParams<{ trackingId: string }>()
    const [tracked, setTracked] = useState<PublicTrackedRequest | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let active = true
        if (!trackingId) {
            queueMicrotask(() => { if (active) setLoading(false) })
            return () => { active = false }
        }
        fetchRequestByTrackingId(trackingId).then(result => {
            if (!active) return
            setTracked(result)
            setLoading(false)
        })
        return () => { active = false }
    }, [trackingId])

    if (loading) {
        return (
            <PublicLayout title="Request status">
                <div className="flex justify-center py-8"><Spinner size="lg" /></div>
            </PublicLayout>
        )
    }

    if (!tracked) {
        return (
            <PublicLayout title="Not found" subtitle="We couldn't find a request with that tracking ID.">
                <div className="space-y-4 text-center">
                    <Paragraph.sm className="text-tertiary">
                        Double-check the link, or <a href="/submit" className="text-brand_secondary hover:underline">submit a new request</a>.
                    </Paragraph.sm>
                </div>
            </PublicLayout>
        )
    }

    return (
        <PublicLayout eyebrow={tracked.workspaceName} title={tracked.title}>
            <div className="space-y-4">
                <MetaRow icon={<Hash className="size-4" />} label="Tracking ID">
                    <Paragraph.sm className="font-mono">{tracked.trackingId}</Paragraph.sm>
                </MetaRow>

                <MetaRow icon={<CircleAlert className="size-4" />} label="Status">
                    <Badge label={statusLabel[tracked.status]} color={badgeColor(statusColor[tracked.status])} />
                </MetaRow>

                <MetaRow icon={<CircleAlert className="size-4" />} label="Priority">
                    <Badge label={priorityLabel[tracked.priority]} color={badgeColor(priorityColor[tracked.priority])} />
                </MetaRow>

                {tracked.categoryLabel && (
                    <MetaRow icon={<Tag className="size-4" />} label="Category">
                        <Badge label={tracked.categoryLabel} color={badgeColor(tracked.categoryColor)} />
                    </MetaRow>
                )}

                {tracked.departmentName && (
                    <MetaRow icon={<Building2 className="size-4" />} label="Department">
                        <Paragraph.sm>{tracked.departmentName}</Paragraph.sm>
                    </MetaRow>
                )}

                <MetaRow icon={<Clock className="size-4" />} label="Submitted">
                    <Paragraph.sm>{formatUtcIsoInBrowserTimeZone(tracked.createdAt)}</Paragraph.sm>
                </MetaRow>

                <MetaRow icon={<History className="size-4" />} label="Last updated">
                    <Paragraph.sm>{formatUtcIsoInBrowserTimeZone(tracked.updatedAt)}</Paragraph.sm>
                </MetaRow>

                <div className="border-t border-secondary pt-4">
                    <Paragraph.xs className="text-quaternary">
                        Requested by <span className="text-tertiary">{tracked.requestedByName}</span>
                    </Paragraph.xs>
                </div>

                <div className="pt-2">
                    <a href="/submit">
                        <Button variant="secondary" className="w-full">Submit another request</Button>
                    </a>
                </div>

                <Paragraph.xs className="text-center text-quaternary pt-2">
                    Status updates are tracked here as the team progresses. Bookmark this page to check back.
                </Paragraph.xs>

                <div className="pt-2 border-t border-secondary">
                    <Label.sm className="text-tertiary">What the statuses mean</Label.sm>
                    <ul className="mt-2 space-y-1 paragraph-xs text-quaternary">
                        <li><span className="text-tertiary font-medium">Submitted</span> — we've received it; it's awaiting triage.</li>
                        <li><span className="text-tertiary font-medium">Triaged</span> — categorised and queued for the right team.</li>
                        <li><span className="text-tertiary font-medium">In Progress</span> — actively being worked on.</li>
                        <li><span className="text-tertiary font-medium">Blocked</span> — the team has paused pending information.</li>
                        <li><span className="text-tertiary font-medium">Completed</span> — we're done.</li>
                    </ul>
                </div>
            </div>
        </PublicLayout>
    )
}
