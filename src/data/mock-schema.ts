export const MOCK_TABLES = [
    'profiles',
    'workspaces',
    'workspace_roles',
    'workspace_members',
    'departments',
    'department_members',
    'categories',
    'requests',
    'request_assignees',
    'comments',
    'activity_logs',
    'bug_reports',
] as const

export type MockTable = (typeof MOCK_TABLES)[number]

export type MockRow = {
    id: string
}

export type MockDataTables = {
    [K in MockTable]: MockRow[]
}

export type MockPasswords = Record<string, string>

export type MockDataBundle = {
    tables: MockDataTables
    passwords: MockPasswords
}
