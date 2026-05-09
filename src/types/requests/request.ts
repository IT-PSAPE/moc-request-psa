import type { Priority } from './priority'
import type { Status } from './status'
import type { SubmissionSource } from './source'

export type Request = {
    id: string
    workspaceId: string
    trackingId: string
    title: string
    categoryId: string | null
    categoryLabel: string | null
    categoryColor: string
    departmentId: string
    departmentName: string | null
    priority: Priority
    status: Status
    dueDate: string | null
    requestedByName: string
    requestedByEmail: string | null
    submittedByUserId: string | null
    source: SubmissionSource
    who: string
    what: string
    when: string
    where: string
    why: string
    how: string
    notes: string | null
    createdAt: string
    updatedAt: string
}
