import type { DepartmentMember, DepartmentRole } from '@/types/departments'

export type DepartmentMemberRow = {
    id: string
    department_id: string
    user_id: string
    role: DepartmentRole
    created_at: string
}

export function mapDepartmentMember(row: DepartmentMemberRow): DepartmentMember {
    return {
        departmentId: row.department_id,
        userId: row.user_id,
        role: row.role,
        createdAt: row.created_at,
    }
}
