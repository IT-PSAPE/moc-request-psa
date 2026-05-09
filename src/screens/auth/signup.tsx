import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Mail, Lock, User } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/controls/button'
import { Input } from '@/components/form/input'
import { FormLabel } from '@/components/form/form-label'
import { Spinner } from '@/components/feedback/spinner'
import { fetchWorkspaceBySlug } from '@/data/fetch-workspaces'
import { routes } from '@/screens/app-routes'
import { AuthLayout } from './auth-layout'

type ResolvedWorkspace = { id: string; name: string; slug: string; description: string | null }

export function SignupScreen() {
    const { actions: { signUp } } = useAuth()
    const { workspaceSlug } = useParams<{ workspaceSlug: string }>()
    const navigate = useNavigate()

    const [resolving, setResolving] = useState(true)
    const [workspace, setWorkspace] = useState<ResolvedWorkspace | null>(null)
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [submittedEmail, setSubmittedEmail] = useState<string | null>(null)

    useEffect(() => {
        let active = true
        if (!workspaceSlug) {
            setResolving(false)
            return () => { active = false }
        }
        fetchWorkspaceBySlug(workspaceSlug).then(ws => {
            if (!active) return
            setWorkspace(ws)
            setResolving(false)
        })
        return () => { active = false }
    }, [workspaceSlug])

    async function handleSubmit(e: FormEvent) {
        e.preventDefault()
        setError('')
        if (!workspace) return

        const trimmedName = name.trim()
        if (!trimmedName) return setError('Name is required')
        if (password !== confirmPassword) return setError('Passwords do not match')
        if (password.length < 6) return setError('Password must be at least 6 characters')

        setLoading(true)
        const { error: signUpError, needsEmailConfirmation } = await signUp({
            email,
            password,
            name: trimmedName,
            surname: null,
            workspaceId: workspace.id,
        })

        if (signUpError) {
            setError(signUpError.message)
            setLoading(false)
            return
        }

        if (needsEmailConfirmation) {
            setSubmittedEmail(email.trim().toLowerCase())
            setLoading(false)
            return
        }

        navigate(`/${routes.pending}`, { replace: true })
    }

    if (resolving) {
        return (
            <AuthLayout>
                <div className="flex justify-center py-8"><Spinner size="lg" /></div>
            </AuthLayout>
        )
    }

    if (!workspace) {
        return (
            <AuthLayout>
                <div className="space-y-3">
                    <h2 className="title-h6">Workspace not found</h2>
                    <p className="paragraph-sm text-tertiary">
                        The sign-up link you followed doesn't match a known workspace. Double-check the link your team
                        shared with you, or get in touch with them for the correct URL.
                    </p>
                    <Link to={`/${routes.login}`} className="paragraph-sm text-brand_secondary hover:underline">
                        Back to sign in
                    </Link>
                </div>
            </AuthLayout>
        )
    }

    return (
        <AuthLayout>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                    <p className="paragraph-xs text-quaternary tracking-wide uppercase">
                        Joining {workspace.name}
                    </p>
                    <h2 className="title-h6">Request access</h2>
                    <p className="paragraph-sm text-tertiary">
                        Submit your details and an admin of {workspace.name} will review your request.
                    </p>
                </div>

                {error && (
                    <div className="rounded-lg border border-error bg-error_subtle p-3">
                        <p className="paragraph-sm text-error">{error}</p>
                    </div>
                )}

                <div className="space-y-1">
                    <FormLabel label="Full name" required />
                    <Input
                        type="text"
                        placeholder="Your name"
                        icon={<User />}
                        value={name}
                        onChange={e => setName(e.target.value)}
                        required
                    />
                </div>

                <div className="space-y-1">
                    <FormLabel label="Email" required />
                    <Input
                        type="email"
                        placeholder="you@example.com"
                        icon={<Mail />}
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                    />
                </div>

                <div className="space-y-1">
                    <FormLabel label="Password" required />
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

                <Button type="submit" disabled={loading} className="w-full">
                    {loading ? 'Submitting…' : 'Request access'}
                </Button>

                <p className="paragraph-sm text-center text-tertiary">
                    Already have an account?{' '}
                    <Link to={`/${routes.login}`} className="text-brand_secondary hover:underline">
                        Sign in
                    </Link>
                </p>
            </form>
        </AuthLayout>
    )
}
