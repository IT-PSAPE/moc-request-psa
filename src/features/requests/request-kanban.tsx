import { useCallback, useState } from 'react'
import { DndContext, DragOverlay, PointerSensor, useDroppable, useDraggable, useSensor, useSensors, closestCenter, type DragStartEvent, type DragEndEvent } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Card } from '@/components/display/card'
import { Indicator } from '@/components/display/indicator'
import { Label } from '@/components/display/text'
import { useFeedback } from '@/components/feedback/feedback-provider'
import { badgeColor } from '@/lib/color-keys'
import { statusGroups, type StatusGroup } from '@/types/requests'
import type { Request } from '@/types/requests'
import { useRequests } from './request-provider'
import { updateRequestStatus } from '@/data/mutate-requests'
import { getErrorMessage } from '@/utils/get-error-message'
import { RequestItem } from './request-item'

function DraggableRequestItem({ request }: { request: Request }) {
    const [drawerOpen, setDrawerOpen] = useState(false)
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: request.id,
        data: { request },
        disabled: drawerOpen,
    })

    const handleDrawerOpenChange = useCallback((open: boolean) => setDrawerOpen(open), [])

    const style = {
        transform: isDragging ? undefined : CSS.Translate.toString(transform),
    }

    return (
        <div ref={setNodeRef} style={style} {...(drawerOpen ? {} : { ...listeners, ...attributes })}>
            {isDragging ? (
                <div className="rounded-lg border-2 border-dashed border-secondary">
                    <div className="invisible">
                        <RequestItem request={request} vertical />
                    </div>
                </div>
            ) : (
                <RequestItem request={request} vertical onDrawerOpenChange={handleDrawerOpenChange} />
            )}
        </div>
    )
}

function DroppableColumn({ group, items }: { group: StatusGroup; items: Request[] }) {
    const { setNodeRef, isOver } = useDroppable({ id: group.key })

    return (
        <Card.Root className={isOver ? 'ring-2 ring-brand ring-offset-2 transition-shadow' : 'transition-shadow'}>
            <Card.Header className="gap-1.5">
                <Indicator color={badgeColor(group.color)} className="size-6" />
                <Label.sm>{group.label}</Label.sm>
                <Label.sm className="text-quaternary ml-auto">{items.length}</Label.sm>
            </Card.Header>
            <div ref={setNodeRef}>
                <Card.Content ghost className="flex flex-col gap-1.5 min-h-16">
                    {items.map(r => (
                        <DraggableRequestItem key={r.id} request={r} />
                    ))}
                </Card.Content>
            </div>
        </Card.Root>
    )
}

export function RequestKanban({ requests }: { requests: Request[] }) {
    const { actions: { syncRequest } } = useRequests()
    const { toast } = useFeedback()
    const [activeRequest, setActiveRequest] = useState<Request | null>(null)

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

    function handleDragStart(event: DragStartEvent) {
        const req = event.active.data.current?.request as Request | undefined
        setActiveRequest(req ?? null)
    }

    async function handleDragEnd(event: DragEndEvent) {
        setActiveRequest(null)
        const { active, over } = event
        if (!over) return

        const request = active.data.current?.request as Request | undefined
        if (!request) return

        const targetGroup = statusGroups.find(g => g.key === over.id)
        if (!targetGroup) return

        // No-op if request already in this group
        if (targetGroup.statuses.includes(request.status)) return

        const previousStatus = request.status
        const newStatus = targetGroup.targetStatus
        const optimistic = { ...request, status: newStatus, updatedAt: new Date().toISOString() }
        syncRequest(optimistic)

        try {
            const persisted = await updateRequestStatus(request.id, newStatus)
            syncRequest(persisted)
            toast({ title: `Moved to ${targetGroup.label}`, variant: 'success' })
        } catch (error) {
            syncRequest({ ...request, status: previousStatus })
            toast({ title: 'Failed to update status', description: getErrorMessage(error, 'Status could not be updated.'), variant: 'error' })
        }
    }

    return (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="overflow-x-auto w-full">
                <div className="flex gap-3 p-4 pt-0 mx-auto w-full max-w-content *:flex-1 *:min-w-sm">
                    {statusGroups.map(group => {
                        const items = requests.filter(r => group.statuses.includes(r.status))
                        return <DroppableColumn key={group.key} group={group} items={items} />
                    })}
                </div>
            </div>
            <DragOverlay>
                {activeRequest && (
                    <div className="opacity-90 rotate-2 scale-105">
                        <RequestItem request={activeRequest} vertical />
                    </div>
                )}
            </DragOverlay>
        </DndContext>
    )
}
