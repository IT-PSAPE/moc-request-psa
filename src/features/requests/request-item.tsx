import { CalendarFold, CircleAlert, Tag } from 'lucide-react'
import { Label, Paragraph } from '@/components/display/text'
import { Badge } from '@/components/display/badge'
import { Drawer } from '@/components/overlays/drawer'
import { useDrawer } from '@/components/overlays/drawer'
import { cn } from '@/utils/cn'
import { formatUtcIsoInBrowserTimeZone } from '@/utils/browser-date-time'
import { badgeColor } from '@/lib/color-keys'
import { priorityLabel, priorityColor } from '@/types/requests'
import type { Request } from '@/types/requests'
import { RequestDrawer } from './request-drawer'

const baseCard = 'w-full flex justify-between px-4 py-3 gap-4 bg-background-primary rounded-lg shadow-[0px_1px_2px_0px_rgba(10,13,18,0.05)] outline outline-1 outline-offset-[-1px] outline-border-secondary *:flex-1'
const rowCard = 'items-center *:odd:flex-1 *:odd:max-w-xl *:even:justify-end max-mobile:flex-col *:max-mobile:odd:max-none *:max-mobile:even:justify-start *:max-mobile:w-full'
const stackCard = 'flex-col'
const interactiveCard = 'cursor-pointer hover:bg-background-primary-hover active:bg-background-primary-hover transition-colors'

function CardBody({ request, layoutClass }: { request: Request; layoutClass: string }) {
    return (
        <div className={cn(baseCard, layoutClass, interactiveCard)}>
            <div>
                <Label.sm>{request.title}</Label.sm>
                <Paragraph.sm className="text-tertiary line-clamp-2">{request.what}</Paragraph.sm>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
                <Badge
                    label={priorityLabel[request.priority]}
                    icon={<CircleAlert />}
                    color={badgeColor(priorityColor[request.priority])}
                />
                {request.categoryLabel && (
                    <Badge label={request.categoryLabel} icon={<Tag />} color={badgeColor(request.categoryColor)} />
                )}
                {request.dueDate && (
                    <Badge
                        icon={<CalendarFold />}
                        label={formatUtcIsoInBrowserTimeZone(request.dueDate, { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        variant="outline"
                    />
                )}
            </div>
        </div>
    )
}

function DrawerWrappedCard({ request, layoutClass }: { request: Request; layoutClass: string }) {
    return (
        <Drawer.Root>
            <Drawer.Trigger>
                <CardBody request={request} layoutClass={layoutClass} />
            </Drawer.Trigger>
            <BoundRequestDrawer request={request} />
        </Drawer.Root>
    )
}

function BoundRequestDrawer({ request }: { request: Request }) {
    const { actions } = useDrawer()
    return <RequestDrawer request={request} onClose={actions.close} />
}

export function RequestItem({ request }: { request: Request }) {
    return <DrawerWrappedCard request={request} layoutClass={rowCard} />
}

export function RequestItemStack({ request }: { request: Request }) {
    return <CardBody request={request} layoutClass={stackCard} />
}
