import { useCallback, useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
    Bug,
    ChevronsUpDown,
    LayoutGrid,
    LogOut,
    ScrollText,
    Settings,
    Shield,
    ShieldCheck,
    User,
    UserCog,
} from 'lucide-react'
import { Sidebar, useSidebar } from '@/components/navigation/sidebar'
import { Breadcrumb } from '@/components/navigation/breadcrumb'
import { Divider } from '@/components/display/divider'
import { Avatar } from '@/components/display/avatar'
import { Indicator } from '@/components/display/indicator'
import { Dropdown } from '@/components/overlays/dropdown'
import { useFeedback } from '@/components/feedback/feedback-provider'
import { useAuth } from '@/lib/auth-context'
import { useCurrentWorkspace } from '@/features/workspace/workspace-provider'
import { useDepartments } from '@/features/departments/department-provider'
import { TopBar } from '@/features/topbar'
import { ReportBugModal } from '@/features/support/report-bug-modal'
import { badgeColor } from '@/lib/color-keys'
import { routes } from '@/screens/app-routes'
import { cn } from '@/utils/cn'

export function AppShell() {
    const navigate = useNavigate()
    const { pathname } = useLocation()

    const { state, actions } = useSidebar()
    const { state: { profile }, actions: { signOut } } = useAuth()
    const { state: { workspace, role } } = useCurrentWorkspace()
    const { state: deptState } = useDepartments()
    const { toast } = useFeedback()
    const [isSigningOut, setIsSigningOut] = useState(false)
    const [bugReportOpen, setBugReportOpen] = useState(false)

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

                </Sidebar.Content>

                <Sidebar.Footer>
                    <Dropdown.Root placement="top-start" className="w-full">
                        <Dropdown.Trigger
                            className={cn(
                                'group flex flex-1 items-center gap-2 rounded-lg p-1.5 cursor-pointer',
                                'transition-colors hover:bg-secondary',
                                state.isCollapsed && 'justify-center',
                                isSigningOut && 'pointer-events-none opacity-60',
                            )}
                            aria-label="Open account menu"
                        >
                            <Avatar.initials name={userInitials} />
                            {!state.isCollapsed && (
                                <>
                                    <div className="flex min-w-0 flex-1 flex-col text-left">
                                        <span className="label-sm truncate leading-none">{userDisplayName}</span>
                                        <span className="paragraph-xs text-quaternary truncate leading-none capitalize">
                                            {role?.name ?? (isPlatformAdmin ? 'Platform admin' : 'Member')}
                                        </span>
                                    </div>
                                    <ChevronsUpDown className="size-4 text-quaternary shrink-0" />
                                </>
                            )}
                        </Dropdown.Trigger>
                        <Dropdown.Panel className="min-w-60">
                            <div className="flex items-center gap-2 px-2 py-2">
                                <Avatar.initials size="sm" name={userInitials} />
                                <div className="flex min-w-0 flex-1 flex-col">
                                    <span className="label-sm truncate leading-none">{userDisplayName}</span>
                                    <span className="paragraph-xs text-quaternary truncate leading-none">
                                        {profile?.email ?? ''}
                                    </span>
                                </div>
                            </div>
                            <Dropdown.Separator />

                            <Dropdown.Item onClick={() => navigateToRoute(routes.profile)}>
                                <User className="size-4" />
                                <span>Profile</span>
                            </Dropdown.Item>
                            {canManageWorkspace && (
                                <Dropdown.Item onClick={() => navigateToRoute(routes.settings)}>
                                    <Settings className="size-4" />
                                    <span>Settings</span>
                                </Dropdown.Item>
                            )}
                            {isPlatformAdmin && (
                                <Dropdown.Item onClick={() => navigateToRoute(routes.platformWorkspaces)}>
                                    <UserCog className="size-4" />
                                    <span>Platform admin</span>
                                </Dropdown.Item>
                            )}

                            <Dropdown.Separator />
                            <div className="px-2 pt-1 pb-0.5">
                                <span className="paragraph-xs text-quaternary uppercase tracking-wider">Help</span>
                            </div>
                            <Dropdown.Item onClick={() => navigateToRoute(routes.terms)}>
                                <ScrollText className="size-4" />
                                <span>Terms of service</span>
                            </Dropdown.Item>
                            <Dropdown.Item onClick={() => navigateToRoute(routes.privacy)}>
                                <ShieldCheck className="size-4" />
                                <span>Privacy policy</span>
                            </Dropdown.Item>
                            <Dropdown.Item onClick={() => setBugReportOpen(true)}>
                                <Bug className="size-4" />
                                <span>Report a bug</span>
                            </Dropdown.Item>

                            <Dropdown.Separator />
                            <Dropdown.Item onClick={handleSignOut}>
                                <LogOut className="size-4" />
                                <span>{isSigningOut ? 'Signing out…' : 'Log out'}</span>
                            </Dropdown.Item>
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

            <ReportBugModal open={bugReportOpen} onOpenChange={setBugReportOpen} />
        </div>
    )
}
