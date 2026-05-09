export const routes = {
    // Public
    submit: 'submit/:workspaceSlug',
    submitSuccess: 'submit/success',
    track: 'track/:trackingId',
    privacy: 'legal/privacy',
    terms: 'legal/terms',
    support: 'support',

    // Auth
    login: 'login',
    signup: 'signup/:workspaceSlug',
    resetPassword: 'reset-password',
    passwordRecovery: 'password-recovery',
    pending: 'pending',

    // App
    dashboard: 'dashboard',
    department: 'departments/:departmentId',
    requestDetail: 'requests/:id',
    profile: 'profile',

    // Settings (workspace_role.can_manage_roles)
    settings: 'settings',
    settingsWorkspace: 'settings/workspace',
    settingsMembers: 'settings/members',
    settingsDepartments: 'settings/departments',
    settingsCategories: 'settings/categories',

    // Platform
    platformWorkspaces: 'platform/workspaces',
    platformCreateWorkspace: 'platform/workspaces/new',
    platformWorkspaceDetail: 'platform/workspaces/:workspaceId',
} as const
