import type { Priority } from './priority'
import type { Status } from './status'

export const statusLabel: Record<Status, string> = {
    submitted: 'Submitted',
    triaged: 'Triaged',
    in_progress: 'In Progress',
    blocked: 'Blocked',
    completed: 'Completed',
    archived: 'Archived',
    rejected: 'Rejected',
}

export const priorityLabel: Record<Priority, string> = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    urgent: 'Urgent',
}

export const statusColor: Record<Status, string> = {
    submitted: 'gray',
    triaged: 'blue',
    in_progress: 'yellow',
    blocked: 'red',
    completed: 'green',
    archived: 'gray',
    rejected: 'red',
}

export const priorityColor = {
    urgent: 'red',
    high: 'yellow',
    medium: 'blue',
    low: 'gray',
} as const satisfies Record<Priority, string>

export const eventColorMap: Record<string, string> = {
    red: 'bg-error_primary text-error',
    orange: 'bg-warning_primary text-warning',
    yellow: 'bg-warning_primary text-warning',
    green: 'bg-success_primary text-success',
    blue: 'bg-utility-blue-50 text-color-utility-blue-700',
    purple: 'bg-brand_primary text-brand_secondary',
    teal: 'bg-utility-blue-50 text-color-utility-blue-700',
    pink: 'bg-brand_primary text-brand_secondary',
    gray: 'bg-secondary text-tertiary',
}

// Active statuses (not archived/rejected) shown in working views
export const activeStatuses: Status[] = ['submitted', 'triaged', 'in_progress', 'blocked', 'completed']

// Kanban column groups — one column per group, each may match multiple statuses
export type StatusGroup = {
    key: string
    label: string
    color: string
    statuses: Status[]
    targetStatus: Status // status assigned when an item is dropped into this column
}

export const statusGroups: StatusGroup[] = [
    { key: 'new', label: 'New', color: 'gray', statuses: ['submitted', 'triaged'], targetStatus: 'submitted' },
    { key: 'in_progress', label: 'In Progress', color: 'yellow', statuses: ['in_progress', 'blocked'], targetStatus: 'in_progress' },
    { key: 'completed', label: 'Completed', color: 'green', statuses: ['completed'], targetStatus: 'completed' },
]

export const requestDuties = [
    'Producer',
    'Lead',
    'Coordinator',
    'Designer',
    'Editor',
    'Reviewer',
    'Camera',
    'Audio',
] as const
