import type { ProfileRow } from './map-profile'
import type { RequestAssignee, ResolvedAssignee } from '@/types/requests'

export type RequestAssigneeRow = {
    id: string
    request_id: string
    user_id: string
    duty: string
    created_at: string
}

export function mapAssignee(row: RequestAssigneeRow): RequestAssignee {
    return {
        id: row.id,
        requestId: row.request_id,
        userId: row.user_id,
        duty: row.duty,
        createdAt: row.created_at,
    }
}

export function mapResolvedAssignee(row: RequestAssigneeRow, profile: ProfileRow): ResolvedAssignee {
    return {
        id: row.id,
        requestId: row.request_id,
        userId: row.user_id,
        duty: row.duty,
        name: profile.name,
        surname: profile.surname,
        email: profile.email,
    }
}
