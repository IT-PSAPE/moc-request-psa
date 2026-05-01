export type Comment = {
    id: string
    requestId: string
    authorId: string
    body: string
    createdAt: string
    updatedAt: string
}

export type ResolvedComment = Comment & {
    authorName: string
    authorEmail: string
    authorInitials: string
}
