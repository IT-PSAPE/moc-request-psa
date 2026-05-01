export type RequestAssignee = {
    id: string
    requestId: string
    userId: string
    duty: string
    createdAt: string
}

export type ResolvedAssignee = {
    id: string
    requestId: string
    userId: string
    duty: string
    name: string
    surname: string | null
    email: string
}
