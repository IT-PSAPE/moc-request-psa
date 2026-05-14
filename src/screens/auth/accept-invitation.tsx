import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/controls/button'
import { Input } from '@/components/form/input'
import { FormLabel } from '@/components/form/form-label'
import { Spinner } from '@/components/feedback/spinner'
import { Badge } from '@/components/display/badge'
import { fetchWorkspaceById, fetchWorkspaceRoleById } from '@/data/fetch-workspaces'
import { fetchDepartmentMembershipsForUser } from '@/data/fetch-workspace-members'
import { fetchDepartmentsForCurrentWorkspace } from '@/data/fetch-departments'
import { setActiveWorkspaceId } from '@/data/store/current-context'
import { badgeColor } from '@/lib/color-keys'
import { getErrorMessage } from '@/utils/get-error-message'
import { routes } from '@/screens/app-routes'
import type { Workspace, WorkspaceRole } from '@/types/workspaces'
import type { Department } from '@/types/departments'
import { AuthLayout } from './auth-layout'

type Preview = {
    workspace: Workspace
    role: WorkspaceRole | null
    departments: Department[]
}

export function AcceptInvitationScreen() {
    const { state: { userId, memberships, loading: authLoading }, actions: { refresh } } = useAuth()
    const navigate = useNavigate()
    const [preview, setPreview] = useState<Preview | null>(null)
    const [previewError, setPreviewError] = useState<string | null>(null)
    const [previewLoading, setPreviewLoading] = useState(true)
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const invitedMembership = useMemo(
        () => memberships.find(m => m.status === 'invited') ?? null,
        [memberships],
    )

    useEffect(() => {
        if (authLoading) return
        if (!userId) return
        if (!invitedMembership) {
            // Nothing to accept — they've either already accepted or this is the
            // wrong screen for them. Send them onward.
            navigate(`/${routes.dashboard}`, { replace: true })
            return
        }

        let active = true
        ;(async () => {
            setPreviewLoading(true)
            try {
                setActiveWorkspaceId(invitedMembership.workspaceId)
                const [workspace, role, depts, allDepts] = await Promise.all([
                    fetchWorkspaceById(invitedMembership.workspaceId),
                    invitedMembership.workspaceRoleId
                        ? fetchWorkspaceRoleById(invitedMembership.workspaceRoleId)
                        : Promise.resolve(null),
                    fetchDepartmentMembershipsForUser(userId),
                    fetchDepartmentsForCurrentWorkspace(),
                ])
                if (!active) return
                if (!workspace) {
                    setPreviewError('We could not load this workspace.')
                    return
                }
                const deptIds = new Set(depts.map(d => d.departmentId))
                const userDepts = allDepts.filter(d => deptIds.has(d.id))
                setPreview({ workspace, role, departments: userDepts })
            } catch (err) {
                if (!active) return
                setPreviewError(getErrorMessage(err, 'Could not load invitation.'))
            } finally {
                if (active) setPreviewLoading(false)
            }
        })()
        return () => { active = false }
    }, [authLoading, userId, invitedMembership, navigate])

    async function handleSubmit(e: FormEvent) {
        e.preventDefault()
        setError(null)
        if (password.length < 6) return setError('Password must be at least 6 characters')
        if (password !== confirmPassword) return setError('Passwords do not match')

        setSubmitting(true)
        try {
            const { error: updateError } = await supabase.auth.updateUser({ password })
            if (updateError) {
                setError(updateError.message)
                return
            }
            const { error: completeError } = await supabase.rpc('complete_invitation')
            if (completeError) {
                setError(completeError.message)
                return
            }
            await refresh()
            navigate(`/${routes.dashboard}`, { replace: true })
        } catch (err) {
            setError(getErrorMessage(err, 'Could not finish setup.'))
        } finally {
            setSubmitting(false)
        }
    }

    if (authLoading || previewLoading) {
        return (
            <AuthLayout>
                <div className="flex justify-center py-8"><Spinner size="lg" /></div>
            </AuthLayout>
        )
    }

    if (!userId) {
        return (
            <AuthLayout>
                <div className="space-y-3">
                    <h2 className="title-h6">Invitation link expired</h2>
                    <p className="paragraph-sm text-tertiary">
                        This link is no longer active. Ask the workspace admin who invited you to send a fresh one.
                    </p>
                </div>
            </AuthLayout>
        )
    }

    if (previewError || !preview) {
        return (
            <AuthLayout>
                <div className="space-y-3">
                    <h2 className="title-h6">Could not load invitation</h2>
                    <p className="paragraph-sm text-tertiary">
                        {previewError ?? 'This invitation could not be found. It may have been revoked.'}
                    </p>
                </div>
            </AuthLayout>
        )
    }

    return (
        <AuthLayout>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <p className="paragraph-xs text-quaternary tracking-wide uppercase">
                        Welcome
                    </p>
                    <h2 className="title-h6">Join {preview.workspace.name}</h2>
                    <p className="paragraph-sm text-tertiary">
                        You've been invited as <span className="font-medium text-primary">{preview.role?.name ?? 'a member'}</span>.
                        {preview.departments.length > 0 && (
                            <> You'll have access to:</>
                        )}
                    </p>
                    {preview.departments.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                            {preview.departments.map(d => (
                                <Badge key={d.id} label={d.name} color={badgeColor(d.colorKey)} />
                            ))}
                        </div>
                    )}
                </div>

                {error && (
                    <div className="rounded-lg border border-error bg-error_subtle p-3">
                        <p className="paragraph-sm text-error">{error}</p>
                    </div>
                )}

                <div className="space-y-1">
                    <FormLabel label="Set a password" required />
                    <Input
                        type="password"
                        placeholder="At least 6 characters"
                        icon={<Lock />}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                    />
                </div>

                <div className="space-y-1">
                    <FormLabel label="Confirm password" required />
                    <Input
                        type="password"
                        placeholder="Re-enter your password"
                        icon={<Lock />}
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        required
                    />
                </div>

                <Button type="submit" disabled={submitting} className="w-full">
                    {submitting ? 'Setting up…' : 'Accept & enter workspace'}
                </Button>
            </form>
        </AuthLayout>
    )
}
