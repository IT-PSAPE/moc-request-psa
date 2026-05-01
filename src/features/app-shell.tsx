import { useCallback, useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
    EllipsisVertical,
    LayoutGrid,
    LogOut,
    Settings,
    Shield,
    UserCog,
} from 'lucide-react'
import { Sidebar, useSidebar } from '@/components/navigation/sidebar'
import { Breadcrumb } from '@/components/navigation/breadcrumb'
import { Divider } from '@/components/display/divider'
import { Avatar } from '@/components/display/avatar'
import { Indicator } from '@/components/display/indicator'
import { Dropdown } from '@/components/overlays/dropdown'
import { Button } from '@/components/controls/button'
import { useFeedback } from '@/components/feedback/feedback-provider'
import { useAuth } from '@/lib/auth-context'
import { useCurrentWorkspace } from '@/features/workspace/workspace-provider'
import { useDepartments } from '@/features/departments/department-provider'
import { TopBar } from '@/features/topbar'
import { badgeColor } from '@/lib/color-keys'
import { routes } from '@/screens/app-routes'

export function AppShell() {
    const navigate = useNavigate()
    const { pathname } = useLocation()

    const { state, actions } = useSidebar()
    const { profile, signOut } = useAuth()
    const { workspace, role } = useCurrentWorkspace()
    const { state: deptState } = useDepartments()
    const { toast } = useFeedback()
    const [isSigningOut, setIsSigningOut] = useState(false)

    useEffect(() => {
        actions.closeMobile()
    }, [pathname, actions])

    function navigateToRoute(route: string) {
        navigate(`/${route}`)
    }

    function isActive(route: string) {
        return pathname === `/${route}`
    }

    function isDepartmentActive(departmentId: string) {
        return pathname === `/departments/${departmentId}`
    }

    const userInitials = profile
        ? `${profile.name[0] ?? ''}${profile.surname?.[0] ?? ''}`.trim() || profile.name[0]
        : 'M'
    const userDisplayName = profile
        ? [profile.name, profile.surname].filter(Boolean).join(' ')
        : 'Member'

    const handleSignOut = useCallback(async () => {
        if (isSigningOut) return
        setIsSigningOut(true)
        try {
            const { error } = await signOut()
            actions.closeMobile()
            if (error) {
                toast({ title: 'Sign-out issue', description: error.message, variant: 'info' })
            }
        } finally {
            window.location.replace(`/${routes.login}`)
        }
    }, [actions, isSigningOut, signOut, toast])

    const canManageWorkspace = Boolean(role?.canManageRoles)
    const isPlatformAdmin = Boolean(profile?.isPlatformAdmin)

    return (
        <div className="app-grid md:app-grid-desktop bg-primary text-primary">
            <Sidebar.Panel>
                <Sidebar.Header>
                    <div className="size-8 shrink-0 rounded-xl bg-brand_solid grid place-items-center text-primary_on-brand">
                        <span className="label-sm">{workspace?.name?.[0] ?? 'M'}</span>
                    </div>
                    {!state.isCollapsed && (
                        <div className="flex flex-col">
                            <span className="label-sm truncate leading-none">{workspace?.name ?? 'MOC Request'}</span>
                            <span className="paragraph-xs text-quaternary truncate leading-none">{role?.name ?? 'Member'}</span>
                        </div>
                    )}
                </Sidebar.Header>

                <Sidebar.Content>
                    <Sidebar.Group>
                        <Sidebar.GroupContent>
                            <Sidebar.MenuItem
                                title="Dashboard"
                                icon={<LayoutGrid />}
                                active={isActive(routes.dashboard)}
                                onClick={() => navigateToRoute(routes.dashboard)}
                            />
                        </Sidebar.GroupContent>
                    </Sidebar.Group>

                    <Divider className="px-2" />

                    <Sidebar.Group>
                        <Sidebar.GroupTitle title="Departments" />
                        <Sidebar.GroupContent>
                            {deptState.loading && (
                                <span className="paragraph-xs text-quaternary px-2">Loading…</span>
                            )}
                            {!deptState.loading && deptState.userDepartments.length === 0 && (
                                <span className="paragraph-xs text-quaternary px-2">
                                    You're not in any department yet.
                                </span>
                            )}
                            {deptState.userDepartments.map(dept => (
                                <Sidebar.MenuItem
                                    key={dept.id}
                                    title={dept.name}
                                    icon={<Indicator color={badgeColor(dept.colorKey)} />}
                                    active={isDepartmentActive(dept.id)}
                                    onClick={() => navigate(`/departments/${dept.id}`)}
                                />
                            ))}
                        </Sidebar.GroupContent>
                    </Sidebar.Group>

                    {isPlatformAdmin && (
                        <>
                            <Divider className="px-2" />
                            <Sidebar.Group>
                                <Sidebar.GroupTitle title="Platform" />
                                <Sidebar.GroupContent>
                                    <Sidebar.MenuItem
                                        title="Workspaces"
                                        icon={<Shield />}
                                        active={isActive(routes.platformWorkspaces)}
                                        onClick={() => navigateToRoute(routes.platformWorkspaces)}
                                    />
                                </Sidebar.GroupContent>
                            </Sidebar.Group>
                        </>
                    )}

                    {canManageWorkspace && (
                        <Sidebar.Group className="mt-auto pt-2">
                            <Sidebar.GroupContent>
                                <Sidebar.MenuItem
                                    title="Settings"
                                    icon={<Settings />}
                                    active={pathname.startsWith(`/${routes.settings}`)}
                                    onClick={() => navigateToRoute(routes.settings)}
                                />
                            </Sidebar.GroupContent>
                        </Sidebar.Group>
                    )}
                </Sidebar.Content>

                <Sidebar.Footer>
                    <Avatar.initials name={userInitials} />
                    {!state.isCollapsed && (
                        <div className="flex min-w-0 flex-1 flex-col">
                            <span className="label-sm truncate leading-none">{userDisplayName}</span>
                            <span className="paragraph-xs text-quaternary truncate leading-none capitalize">
                                {role?.name ?? (isPlatformAdmin ? 'Platform admin' : 'Member')}
                            </span>
                        </div>
                    )}
                    <Dropdown.Root placement="bottom">
                        <Dropdown.Trigger>
                            <Button.Icon
                                aria-label="Open account options"
                                disabled={isSigningOut}
                                icon={<EllipsisVertical />}
                                variant="ghost"
                            />
                        </Dropdown.Trigger>
                        <Dropdown.Panel>
                            <Dropdown.Item onClick={handleSignOut}>
                                <LogOut className="size-4" />
                                <span>{isSigningOut ? 'Signing out…' : 'Sign out'}</span>
                            </Dropdown.Item>
                            {isPlatformAdmin && (
                                <Dropdown.Item onClick={() => navigateToRoute(routes.platformWorkspaces)}>
                                    <UserCog className="size-4" />
                                    <span>Platform admin</span>
                                </Dropdown.Item>
                            )}
                        </Dropdown.Panel>
                    </Dropdown.Root>
                </Sidebar.Footer>
            </Sidebar.Panel>

            {state.isMobileOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 md:hidden"
                    onClick={actions.closeMobile}
                    aria-hidden="true"
                />
            )}

            <TopBar>
                <Breadcrumb.Root />
            </TopBar>

            <main className="area-content min-h-0 overflow-y-auto bg-[var(--background-color-primary)]">
                <Outlet />
            </main>
        </div>
    )
}
