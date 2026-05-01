import { Card } from '@/components/display/card'
import { Indicator } from '@/components/display/indicator'
import { Label } from '@/components/display/text'
import { EmptyState } from '@/components/feedback/empty-state'
import { FileText } from 'lucide-react'
import { badgeColor } from '@/lib/color-keys'
import { statusGroups } from '@/types/requests'
import type { Request } from '@/types/requests'
import { RequestItem } from './request-item'

export function RequestList({ requests }: { requests: Request[] }) {
    if (requests.length === 0) {
        return (
            <div className="px-4 py-8">
                <EmptyState
                    icon={<FileText />}
                    title="No requests yet"
                    description="Requests routed here will show up grouped by status."
                />
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-4 p-4 pt-0 mx-auto w-full max-w-content">
            {statusGroups.map(group => {
                const items = requests.filter(r => group.statuses.includes(r.status))
                if (items.length === 0) return null
                return (
                    <Card.Root key={group.key}>
                        <Card.Header className="gap-1.5">
                            <Indicator color={badgeColor(group.color)} className="size-6" />
                            <Label.sm>{group.label}</Label.sm>
                            <Label.sm className="text-quaternary ml-auto">{items.length}</Label.sm>
                        </Card.Header>
                        <Card.Content ghost className="flex flex-col gap-1.5">
                            {items.map(r => (
                                <RequestItem key={r.id} request={r} />
                            ))}
                        </Card.Content>
                    </Card.Root>
                )
            })}
        </div>
    )
}
