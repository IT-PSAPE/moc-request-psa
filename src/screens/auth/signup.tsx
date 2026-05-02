import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, User } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/controls/button'
import { Input } from '@/components/form/input'
import { Select } from '@/components/form/select'
import { FormLabel } from '@/components/form/form-label'
import { fetchPublicWorkspaces } from '@/data/fetch-workspaces'
import { routes } from '@/screens/app-routes'
import { AuthLayout } from './auth-layout'

type WorkspaceOption = { id: string; name: string; slug: string }

export function SignupScreen() {
    const { actions: { signUp } } = useAuth()
    const navigate = useNavigate()

    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [workspaceId, setWorkspaceId] = useState('')
    const [workspaces, setWorkspaces] = useState<WorkspaceOption[]>([])
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        let active = true
        fetchPublicWorkspaces().then(list => {
            if (!active) return
            setWorkspaces(list)
            if (list.length > 0) setWorkspaceId(list[0].id)
        })
        return () => { active = false }
    }, [])

    async function handleSubmit(e: FormEvent) {
        e.preventDefault()
        setError('')

        const trimmedName = name.trim()
        if (!trimmedName) return setError('Name is required')
        if (!workspaceId) return setError('Please choose a workspace')
        if (password !== confirmPassword) return setError('Passwords do not match')
        if (password.length < 6) return setError('Password must be at least 6 characters')

        setLoading(true)
        const { error } = await signUp({
            email,
            password,
            name: trimmedName,
            surname: null,
            workspaceId,
        })

        if (error) {
            setError(error.message)
            setLoading(false)
            return
        }

        navigate(`/${routes.pending}`, { replace: true })
    }

    return (
        <AuthLayout>
            <form onSubmit={handleSubmit} className="space-y-4">
                <h2 className="title-h6">Request access</h2>
                <p className="paragraph-sm text-tertiary">
                    Choose the workspace you want to join. An admin will review your request.
                </p>

                {error && (
                    <div className="rounded-lg border border-error bg-error_subtle p-3">
                        <p className="paragraph-sm text-error">{error}</p>
                    </div>
                )}

                <div className="space-y-1">
                    <FormLabel label="Workspace" required />
                    <Select
                        value={workspaceId}
                        onChange={e => setWorkspaceId(e.target.value)}
                        required
                    >
                        {workspaces.length === 0 && <option value="">Loading…</option>}
                        {workspaces.map(w => (
                            <option key={w.id} value={w.id}>{w.name}</option>
                        ))}
                    </Select>
                </div>

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
