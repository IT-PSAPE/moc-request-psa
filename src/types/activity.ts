import type { ActivityAction } from '@/data/mutate-activity'

export type ActivityEntry = {
    id: string
    requestId: string
    actorId: string | null
    action: ActivityAction
    payload: Record<string, unknown>
    createdAt: string
}

export type ResolvedActivityEntry = ActivityEntry & {
    actorName: string | null
    actorInitials: string | null
}

export type { ActivityAction } from '@/data/mutate-activity'
