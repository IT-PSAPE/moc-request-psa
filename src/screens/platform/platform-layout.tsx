import { Outlet, Navigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth-context'
import { Spinner } from '@/components/feedback/spinner'
import { routes } from '@/screens/app-routes'

export function PlatformLayout() {
    const { state: { profile, loading } } = useAuth()

    if (loading) {
        return (
            <div className="flex min-h-full items-center justify-center p-12">
                <Spinner size="lg" />
            </div>
        )
    }

    if (!profile?.isPlatformAdmin) return <Navigate to={`/${routes.dashboard}`} replace />
    return <Outlet />
}
