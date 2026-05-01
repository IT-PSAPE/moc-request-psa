import { useCallback, useState } from 'react'
import { CalendarFold, CircleAlert, Tag } from 'lucide-react'
import { Label, Paragraph } from '@/components/display/text'
import { Badge } from '@/components/display/badge'
import { Drawer } from '@/components/overlays/drawer'
import { cn } from '@/utils/cn'
import { cv } from '@/utils/cv'
import { formatUtcIsoInBrowserTimeZone } from '@/utils/browser-date-time'
import { badgeColor } from '@/lib/color-keys'
import { priorityLabel, priorityColor } from '@/types/requests'
import type { Request } from '@/types/requests'
import { RequestDrawer } from './request-drawer'

const itemVariants = cv({
    base: [
        'w-full flex justify-between px-4 py-3 gap-4 bg-background-primary rounded-lg shadow-[0px_1px_2px_0px_rgba(10,13,18,0.05)] outline outline-1 outline-offset-[-1px] outline-border-secondary *:flex-1',
    ],
    variants: {
        vertical: {
            true: ['flex-col'],
            false: ['items-center *:odd:flex-1 *:odd:max-w-xl *:even:justify-end max-mobile:flex-col *:max-mobile:odd:max-none *:max-mobile:even:justify-start *:max-mobile:w-full'],
        },
    },
    defaultVariants: {
        vertical: 'false',
    },
})

type RequestItemProps = {
    request: Request
    vertical?: boolean
    onDrawerOpenChange?: (open: boolean) => void
}

export function RequestItem({ request, vertical, onDrawerOpenChange }: RequestItemProps) {
    const [open, setOpen] = useState(false)

    const handleOpenChange = useCallback((nextOpen: boolean) => {
        setOpen(nextOpen)
        onDrawerOpenChange?.(nextOpen)
    }, [onDrawerOpenChange])

    return (
        <Drawer.Root open={open} onOpenChange={handleOpenChange}>
            <Drawer.Trigger>
                <div className={cn(itemVariants({ vertical: vertical ? 'true' : 'false' }), 'cursor-pointer hover:bg-background-primary-hover active:bg-background-primary-hover transition-colors')}>
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
            </Drawer.Trigger>
            <RequestDrawer request={request} onClose={() => handleOpenChange(false)} />
        </Drawer.Root>
    )
}
