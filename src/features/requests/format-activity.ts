import { mockStore } from '@/data/store/mock-store'
import { type ProfileRow } from '@/data/map-profile'
import { type DepartmentRow } from '@/data/map-department'
import { type CategoryRow } from '@/data/map-category'
import { statusLabel, priorityLabel } from '@/types/requests'
import type { ResolvedActivityEntry, ActivityAction } from '@/types/activity'
import type { Status, Priority } from '@/types/requests'

function userName(userId: unknown): string | null {
    if (typeof userId !== 'string') return null
    const profile = mockStore<ProfileRow>('profiles').find(userId)
    if (!profile) return null
    return [profile.name, profile.surname].filter(Boolean).join(' ')
}

function departmentName(deptId: unknown): string | null {
    if (typeof deptId !== 'string') return null
    return mockStore<DepartmentRow>('departments').find(deptId)?.name ?? null
}

function categoryLabel(catId: unknown): string | null {
    if (typeof catId !== 'string') return null
    return mockStore<CategoryRow>('categories').find(catId)?.label ?? null
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

export function formatActivity(entry: ResolvedActivityEntry): string {
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
            const from = categoryLabel(p.fromId) ?? 'Uncategorized'
            const to = categoryLabel(p.toId) ?? 'Uncategorized'
            return `${actor} changed category from ${from} to ${to}`
        }
        case 'department_routed': {
            const from = departmentName(p.fromId) ?? 'Unrouted'
            const to = departmentName(p.toId) ?? 'Unrouted'
            return `${actor} routed from ${from} to ${to}`
        }
        case 'assignee_added': {
            const who = userName(p.userId) ?? 'a member'
            const duty = typeof p.duty === 'string' ? ` as ${p.duty}` : ''
            return `${actor} assigned ${who}${duty}`
        }
        case 'assignee_removed': {
            const who = userName(p.userId) ?? 'a member'
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
