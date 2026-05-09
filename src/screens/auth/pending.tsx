import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/controls/button'
import { fetchWorkspaceById } from '@/data/fetch-workspaces'
import type { Workspace } from '@/types/workspaces'
import { routes } from '@/screens/app-routes'
import { AuthLayout } from './auth-layout'

export function PendingScreen() {
    const { state: { profile, memberships }, actions: { signOut } } = useAuth()
    const navigate = useNavigate()
    const [pendingWorkspace, setPendingWorkspace] = useState<Workspace | null>(null)

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
                <p className="paragraph-xs text-quaternary">
                    Try signing in again later to check your status.
                </p>
                <Button variant="secondary" className="w-full" onClick={handleSignOut}>
                    Sign out
                </Button>
            </div>
        </AuthLayout>
    )
}
