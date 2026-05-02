import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/controls/button'
import { Input } from '@/components/form/input'
import { FormLabel } from '@/components/form/form-label'
import { routes } from '@/screens/app-routes'
import { AuthLayout } from './auth-layout'

export function LoginScreen() {
    const { actions: { signIn } } = useAuth()
    const navigate = useNavigate()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    async function handleSubmit(e: FormEvent) {
        e.preventDefault()
        setError('')
        setLoading(true)

        const { error } = await signIn(email, password)
        if (error) {
            setError(error.message)
            setLoading(false)
            return
        }

        navigate('/', { replace: true })
    }

    return (
        <AuthLayout>
            <form onSubmit={handleSubmit} className="space-y-4">
                <h2 className="title-h6">Sign in</h2>

                {error && (
                    <div className="rounded-lg border border-error bg-error_subtle p-3">
                        <p className="paragraph-sm text-error">{error}</p>
                    </div>
                )}

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
                        placeholder="Enter your password"
                        icon={<Lock />}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                    />
                </div>

                <Button type="submit" disabled={loading} className="w-full">
                    {loading ? 'Signing in…' : 'Sign in'}
                </Button>

                <p className="paragraph-sm text-center text-tertiary">
                    Don't have an account?{' '}
                    <Link to={`/${routes.signup}`} className="text-brand_secondary hover:underline">
                        Sign up
                    </Link>
                </p>
            </form>
        </AuthLayout>
    )
}
