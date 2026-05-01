import type { Comment } from '@/types/comments'

export type CommentRow = {
    id: string
    request_id: string
    author_id: string
    body: string
    created_at: string
    updated_at: string
}

export function mapComment(row: CommentRow): Comment {
    return {
        id: row.id,
        requestId: row.request_id,
        authorId: row.author_id,
        body: row.body,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    }
}
