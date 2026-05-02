import { Navigate, Outlet } from 'react-router-dom'
import { Spinner } from '@/components/feedback/spinner'
import { useAuth } from '@/lib/auth-context'
import { routes } from '@/screens/app-routes'

function LoadingShell() {
    return (
        <div className="flex min-h-dvh items-center justify-center">
            <Spinner size="lg" />
        </div>
    )
}

export function RequireAuth() {
    const { state: { userId, loading } } = useAuth()
    if (loading) return <LoadingShell />
    if (!userId) return <Navigate to={`/${routes.login}`} replace />
    return <Outlet />
}

export function RequireActiveMembership() {
    const { state: { loading, activeMembership, profile } } = useAuth()
    if (loading) return <LoadingShell />
    if (!profile) return <Navigate to={`/${routes.login}`} replace />
    if (profile.isPlatformAdmin) return <Outlet />
    if (!activeMembership || activeMembership.status !== 'active') {
        return <Navigate to={`/${routes.pending}`} replace />
    }
    return <Outlet />
}

export function RedirectIfAuth({ children }: { children: React.ReactNode }) {
    const { state: { userId, loading, profile, activeMembership } } = useAuth()
    if (loading) return <LoadingShell />
    if (userId) {
        if (profile?.isPlatformAdmin) {
            return <Navigate to={`/${routes.dashboard}`} replace />
        }
        if (!activeMembership || activeMembership.status !== 'active') {
            return <Navigate to={`/${routes.pending}`} replace />
        }
        return <Navigate to={`/${routes.dashboard}`} replace />
    }
    return <>{children}</>
}
