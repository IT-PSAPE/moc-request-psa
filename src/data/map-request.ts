import type { Request, Priority, Status, SubmissionSource } from '@/types/requests'
import type { CategoryRow } from './map-category'
import type { DepartmentRow } from './map-department'

export type RequestRow = {
    id: string
    workspace_id: string
    tracking_id: string
    title: string
    category_id: string | null
    department_id: string
    priority: Priority
    status: Status
    due_date: string | null
    requested_by_name: string
    requested_by_email: string | null
    submitted_by_user_id: string | null
    source: SubmissionSource
    who: string
    what: string
    when_text: string
    where_text: string
    why: string
    how: string
    notes: string | null
    created_at: string
    updated_at: string
}

export type RequestRowJoins = {
    category?: CategoryRow | null
    department?: DepartmentRow | null
}

export function mapRequest(row: RequestRow, joins: RequestRowJoins = {}): Request {
    return {
        id: row.id,
        workspaceId: row.workspace_id,
        trackingId: row.tracking_id,
        title: row.title,
        categoryId: row.category_id,
        categoryLabel: joins.category?.label ?? null,
        categoryColor: joins.category?.color_key ?? 'gray',
        departmentId: row.department_id,
        departmentName: joins.department?.name ?? null,
        priority: row.priority,
        status: row.status,
        dueDate: row.due_date,
        requestedByName: row.requested_by_name,
        requestedByEmail: row.requested_by_email,
        submittedByUserId: row.submitted_by_user_id,
        source: row.source,
        who: row.who,
        what: row.what,
        when: row.when_text,
        where: row.where_text,
        why: row.why,
        how: row.how,
        notes: row.notes,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    }
}

export function requestToRow(request: Request): RequestRow {
    return {
        id: request.id,
        workspace_id: request.workspaceId,
        tracking_id: request.trackingId,
        title: request.title,
        category_id: request.categoryId,
        department_id: request.departmentId,
        priority: request.priority,
        status: request.status,
        due_date: request.dueDate,
        requested_by_name: request.requestedByName,
        requested_by_email: request.requestedByEmail,
        submitted_by_user_id: request.submittedByUserId,
        source: request.source,
        who: request.who,
        what: request.what,
        when_text: request.when,
        where_text: request.where,
        why: request.why,
        how: request.how,
        notes: request.notes,
        created_at: request.createdAt,
        updated_at: request.updatedAt,
    }
}
