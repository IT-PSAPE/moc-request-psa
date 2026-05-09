import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import { RequireAuth, RequireActiveMembership, RedirectIfAuth } from '@/features/auth/require-auth'
import { LoginScreen } from '@/screens/auth/login'
import { SignupScreen } from '@/screens/auth/signup'
import { PendingScreen } from '@/screens/auth/pending'
import { DashboardScreen } from '@/screens/dashboard/page'
import { DepartmentScreen } from '@/screens/departments/page'
import { RequestDetailScreen } from '@/screens/requests/detail/page'
import { ProfileScreen } from '@/screens/profile/page'
import { PublicSubmitScreen } from '@/screens/public/submit/page'
import { PublicSubmitSuccessScreen } from '@/screens/public/submit/success'
import { PublicTrackScreen } from '@/screens/public/track/page'
import { PublicPrivacyScreen } from '@/screens/public/legal/privacy'
import { PublicTermsScreen } from '@/screens/public/legal/terms'
import { PublicSupportScreen } from '@/screens/public/support/page'
import { SettingsLayout, SettingsIndex } from '@/screens/settings/settings-layout'
import { AdminMembersScreen } from '@/screens/admin/members/page'
import { AdminDepartmentsScreen } from '@/screens/admin/departments/page'
import { AdminCategoriesScreen } from '@/screens/admin/categories/page'
import { AdminSettingsScreen } from '@/screens/admin/settings/page'
import { PlatformLayout } from '@/screens/platform/platform-layout'
import { PlatformWorkspacesScreen } from '@/screens/platform/workspaces/page'
import { PlatformCreateWorkspaceScreen } from '@/screens/platform/workspaces/create/page'
import { PlatformWorkspaceDetailScreen } from '@/screens/platform/workspaces/detail/page'
import { AppShell } from '@/features/app-shell'
import { WorkspaceProvider } from '@/features/workspace/workspace-provider'
import { DepartmentProvider } from '@/features/departments/department-provider'
import { RequestsProvider } from '@/features/requests/request-provider'
import { SidebarProvider } from '@/components/navigation/sidebar'
import { TopBarProvider } from '@/features/topbar'
import { BreadcrumbProvider } from '@/components/navigation/breadcrumb'
import { routes } from '@/screens/app-routes'

function AppShellLayout() {
    return (
        <BreadcrumbProvider>
            <SidebarProvider>
                <TopBarProvider>
                    <WorkspaceProvider>
                        <DepartmentProvider>
                            <RequestsProvider>
                                <AppShell />
                            </RequestsProvider>
                        </DepartmentProvider>
                    </WorkspaceProvider>
                </TopBarProvider>
            </SidebarProvider>
        </BreadcrumbProvider>
    )
}

const router = createBrowserRouter([
    // Public — no auth, no AppShell
    { path: routes.submitSuccess, element: <PublicSubmitSuccessScreen /> },
    { path: routes.submit, element: <PublicSubmitScreen /> },
    { path: routes.track, element: <PublicTrackScreen /> },
    { path: routes.privacy, element: <PublicPrivacyScreen /> },
    { path: routes.terms, element: <PublicTermsScreen /> },
    { path: routes.support, element: <PublicSupportScreen /> },

    // Auth
    { path: routes.login, element: <RedirectIfAuth><LoginScreen /></RedirectIfAuth> },
    { path: routes.signup, element: <RedirectIfAuth><SignupScreen /></RedirectIfAuth> },

    {
        element: <RequireAuth />,
        children: [
            { path: routes.pending, element: <PendingScreen /> },
            {
                element: <RequireActiveMembership />,
                children: [
                    {
                        element: <AppShellLayout />,
                        children: [
                            { index: true, element: <Navigate to={`/${routes.dashboard}`} replace /> },
                            { path: routes.dashboard, element: <DashboardScreen /> },
                            { path: routes.department, element: <DepartmentScreen /> },
                            { path: routes.requestDetail, element: <RequestDetailScreen /> },
                            { path: routes.profile, element: <ProfileScreen /> },
                            {
                                element: <SettingsLayout />,
                                children: [
                                    { path: routes.settings, element: <SettingsIndex /> },
                                    { path: routes.settingsWorkspace, element: <AdminSettingsScreen /> },
                                    { path: routes.settingsMembers, element: <AdminMembersScreen /> },
                                    { path: routes.settingsDepartments, element: <AdminDepartmentsScreen /> },
                                    { path: routes.settingsCategories, element: <AdminCategoriesScreen /> },
                                ],
                            },
                            {
                                element: <PlatformLayout />,
                                children: [
                                    { path: routes.platformWorkspaces, element: <PlatformWorkspacesScreen /> },
                                    { path: routes.platformCreateWorkspace, element: <PlatformCreateWorkspaceScreen /> },
                                    { path: routes.platformWorkspaceDetail, element: <PlatformWorkspaceDetailScreen /> },
                                ],
                            },
                        ],
                    },
                ],
            },
        ],
    },

    { path: '*', element: <Navigate to={`/${routes.login}`} replace /> },
])

export default function App() {
    return <RouterProvider router={router} />
}
