import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth-context'
import { useCurrentWorkspace } from '@/features/workspace/workspace-provider'
import { Spinner } from '@/components/feedback/spinner'
import { Tabs } from '@/components/layout/tabs'
import { routes } from '@/screens/app-routes'
import { Paragraph, Title } from '@/components/display/text';

const TABS = [
    { value: `/${routes.settingsWorkspace}`, label: 'Workspace' },
    { value: `/${routes.settingsMembers}`, label: 'Members' },
    { value: `/${routes.settingsDepartments}`, label: 'Departments' },
    { value: `/${routes.settingsCategories}`, label: 'Categories' },
] as const

export function SettingsLayout() {
    const { state: { profile } } = useAuth()
    const { state: { role, loading } } = useCurrentWorkspace()
    const { pathname } = useLocation()
    const navigate = useNavigate()

    if (loading) {
        return (
            <div className="flex min-h-full items-center justify-center p-12">
                <Spinner size="lg" />
            </div>
        )
    }

    const isAuthorized = profile?.isPlatformAdmin || role?.canManageRoles
    if (!isAuthorized) return <Navigate to={`/${routes.dashboard}`} replace />

    const activeTab = TABS.find(t => pathname.startsWith(t.value))?.value ?? TABS[0].value

    return (
        <div className="px-6 py-8 max-w-6xl mx-auto space-y-6">
            <div className="space-y-1">
                <Title.h4>Settings</Title.h4>
                <Paragraph.md className="paragraph-sm text-tertiary">
                    Manage your workspace, members, departments, and categories.
                </Paragraph.md>
            </div>

            <Tabs.Root orientation="vertical" value={activeTab} onValueChange={(next) => navigate(next)} >
                <div className="grid gap-10 md:grid-cols-[200px_1fr] items-start">
                    
                    <Tabs.List className="md:sticky md:top-4">
                        {TABS.map(tab => (
                            <Tabs.Tab key={tab.value} value={tab.value}>
                                {tab.label}
                            </Tabs.Tab>
                        ))}
                    </Tabs.List>

                    <div className="min-w-0">
                        <Outlet />
                    </div>
                </div>
            </Tabs.Root>
        </div>
    )
}

export function SettingsIndex() {
    return <Navigate to={`/${routes.settingsWorkspace}`} replace />
}
