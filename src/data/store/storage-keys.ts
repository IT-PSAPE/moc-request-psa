// Bumping the version invalidates older localStorage keys so updated seed JSON
// is picked up automatically on next load.
export const STORAGE_NAMESPACE = 'mocrequest:v2'

export const SESSION_KEY = `${STORAGE_NAMESPACE}:session`

export type MockTable =
    | 'profiles'
    | 'workspaces'
    | 'workspace_roles'
    | 'workspace_members'
    | 'departments'
    | 'department_members'
    | 'categories'
    | 'requests'
    | 'request_assignees'
    | 'comments'
    | 'activity_logs'

export function tableKey(table: MockTable): string {
    return `${STORAGE_NAMESPACE}:${table}`
}

export function passwordKey(userId: string): string {
    return `${STORAGE_NAMESPACE}:password:${userId}`
}
