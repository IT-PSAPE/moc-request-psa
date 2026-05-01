export type DepartmentRole = 'lead' | 'member'

export type Department = {
    id: string
    workspaceId: string
    name: string
    description: string | null
    colorKey: string
    sortOrder: number
    createdAt: string
    updatedAt: string
}

export type DepartmentMember = {
    departmentId: string
    userId: string
    role: DepartmentRole
    createdAt: string
}
