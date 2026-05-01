import { clearMockTable, mockStore } from './mock-store'
import { tableKey, passwordKey, SESSION_KEY, type MockTable } from './storage-keys'
import profilesSeed from '@/data/mocks/profiles.json'
import workspacesSeed from '@/data/mocks/workspaces.json'
import workspaceRolesSeed from '@/data/mocks/workspace_roles.json'
import workspaceMembersSeed from '@/data/mocks/workspace_members.json'
import departmentsSeed from '@/data/mocks/departments.json'
import departmentMembersSeed from '@/data/mocks/department_members.json'
import categoriesSeed from '@/data/mocks/categories.json'
import requestsSeed from '@/data/mocks/requests.json'
import requestAssigneesSeed from '@/data/mocks/request_assignees.json'
import commentsSeed from '@/data/mocks/comments.json'
import activityLogsSeed from '@/data/mocks/activity_logs.json'
import seedPasswords from '@/data/mocks/passwords.json'

const SEED_BY_TABLE: Record<MockTable, unknown[]> = {
    profiles: profilesSeed,
    workspaces: workspacesSeed,
    workspace_roles: workspaceRolesSeed,
    workspace_members: workspaceMembersSeed,
    departments: departmentsSeed,
    department_members: departmentMembersSeed,
    categories: categoriesSeed,
    requests: requestsSeed,
    request_assignees: requestAssigneesSeed,
    comments: commentsSeed,
    activity_logs: activityLogsSeed,
}

const ALL_TABLES = Object.keys(SEED_BY_TABLE) as MockTable[]

export function ensureSeeded(): void {
    for (const table of ALL_TABLES) {
        const store = mockStore(table)
        if (!store.isSeeded()) {
            store.seed(SEED_BY_TABLE[table] as { id: string }[])
        }
    }
    seedPasswordsIfMissing()
}

function seedPasswordsIfMissing(): void {
    if (typeof window === 'undefined') return
    for (const [userId, password] of Object.entries(seedPasswords as Record<string, string>)) {
        const key = passwordKey(userId)
        if (!window.localStorage.getItem(key)) {
            window.localStorage.setItem(key, password)
        }
    }
}

export function resetMockData(): void {
    if (typeof window === 'undefined') return

    for (const table of ALL_TABLES) {
        clearMockTable(table)
        window.localStorage.removeItem(tableKey(table))
    }
    for (const userId of Object.keys(seedPasswords as Record<string, string>)) {
        window.localStorage.removeItem(passwordKey(userId))
    }
    window.localStorage.removeItem(SESSION_KEY)

    if (typeof window !== 'undefined') {
        window.location.href = '/login'
    }
}
