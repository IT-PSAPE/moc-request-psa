import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/controls/button'
import { fetchWorkspaceById } from '@/data/fetch-workspaces'
import type { Workspace } from '@/types/workspaces'
import { routes } from '@/screens/app-routes'
import { AuthLayout } from './auth-layout'

export function PendingScreen() {
    const { state: { profile, memberships, activeMembership }, actions: { signOut, refresh } } = useAuth()
    const navigate = useNavigate()
    const [pendingWorkspace, setPendingWorkspace] = useState<Workspace | null>(null)
    const [checking, setChecking] = useState(false)

    // If the user already has an active membership (e.g. an admin approved them
    // while they were sitting on this screen, or this page was reached by mistake),
    // forward straight to the dashboard. /pending lives outside RequireActiveMembership,
    // so this guard has to live here.
    useEffect(() => {
        if (activeMembership?.status === 'active') {
            navigate(`/${routes.dashboard}`, { replace: true })
        }
    }, [activeMembership, navigate])

    useEffect(() => {
        let active = true
        const pending = memberships.find(m => m.status === 'pending')
        if (!pending) {
            setPendingWorkspace(null)
            return
        }
        fetchWorkspaceById(pending.workspaceId).then(ws => {
            if (active) setPendingWorkspace(ws)
        })
        return () => { active = false }
    }, [memberships])

    async function handleCheckStatus() {
        setChecking(true)
        try {
            await refresh()
        } finally {
            setChecking(false)
        }
    }

    async function handleSignOut() {
        await signOut()
        navigate(`/${routes.login}`, { replace: true })
    }

    return (
        <AuthLayout>
            <div className="space-y-4 text-center">
                <h2 className="title-h6">Awaiting approval</h2>
                <p className="paragraph-sm text-tertiary">
                    Hi {profile?.name ?? 'there'}, an admin
                    {pendingWorkspace ? ` of ${pendingWorkspace.name}` : ''} has been notified about your registration.
                    You'll get full access as soon as they approve you.
                </p>
                <Button className="w-full" onClick={handleCheckStatus} disabled={checking}>
                    {checking ? 'Checking…' : 'Check status'}
                </Button>
                <Button variant="secondary" className="w-full" onClick={handleSignOut}>
                    Sign out
                </Button>
            </div>
        </AuthLayout>
    )
}
