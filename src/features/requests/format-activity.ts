import { statusLabel, priorityLabel } from '@/types/requests'
import type { ResolvedActivityEntry, ActivityAction } from '@/types/activity'
import type { Status, Priority } from '@/types/requests'

export type ActivityLookups = {
    userName: (id: string) => string | null
    departmentName: (id: string) => string | null
    categoryLabel: (id: string) => string | null
}

const FIELD_LABELS: Record<string, string> = {
    title: 'title',
    who: 'who',
    what: 'what',
    when_text: 'when',
    where_text: 'where',
    why: 'why',
    how: 'how',
    notes: 'notes',
    due_date: 'due date',
    requested_by_name: 'requester name',
    requested_by_email: 'requester email',
}

function lookup(value: unknown, fn: (id: string) => string | null): string | null {
    return typeof value === 'string' ? fn(value) : null
}

export function formatActivity(entry: ResolvedActivityEntry, lookups: ActivityLookups): string {
    const actor = entry.actorName ?? 'Anonymous'
    const action = entry.action as ActivityAction
    const p = entry.payload

    switch (action) {
        case 'created': {
            const source = p.source === 'public_form' ? 'submitted via the public form' : 'created the request'
            return `${actor} ${source}`
        }
        case 'status_changed': {
            const from = statusLabel[p.from as Status] ?? p.from
            const to = statusLabel[p.to as Status] ?? p.to
            return `${actor} moved status from ${from} to ${to}`
        }
        case 'priority_changed': {
            const from = priorityLabel[p.from as Priority] ?? p.from
            const to = priorityLabel[p.to as Priority] ?? p.to
            return `${actor} changed priority from ${from} to ${to}`
        }
        case 'category_changed': {
            const from = lookup(p.fromId, lookups.categoryLabel) ?? 'Uncategorized'
            const to = lookup(p.toId, lookups.categoryLabel) ?? 'Uncategorized'
            return `${actor} changed category from ${from} to ${to}`
        }
        case 'department_routed': {
            const from = lookup(p.fromId, lookups.departmentName)
            const to = lookup(p.toId, lookups.departmentName) ?? '—'
            return from ? `${actor} re-routed from ${from} to ${to}` : `${actor} routed to ${to}`
        }
        case 'assignee_added': {
            const who = lookup(p.userId, lookups.userName) ?? 'a member'
            const duty = typeof p.duty === 'string' ? ` as ${p.duty}` : ''
            return `${actor} assigned ${who}${duty}`
        }
        case 'assignee_removed': {
            const who = lookup(p.userId, lookups.userName) ?? 'a member'
            return `${actor} unassigned ${who}`
        }
        case 'field_updated': {
            const field = typeof p.field === 'string' ? FIELD_LABELS[p.field] ?? p.field : 'a field'
            return `${actor} updated ${field}`
        }
        case 'comment_posted': {
            return `${actor} posted a comment`
        }
        default: {
            return `${actor} updated the request`
        }
    }
}
