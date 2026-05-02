import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Save } from 'lucide-react'
import { Button } from '@/components/controls/button'
import { Input } from '@/components/form/input'
import { FormLabel } from '@/components/form/form-label'
import { Spinner } from '@/components/feedback/spinner'
import { useFeedback } from '@/components/feedback/feedback-provider'
import { useAuth } from '@/lib/auth-context'
import { updateProfile } from '@/data/mutate-profile'
import { getErrorMessage } from '@/utils/get-error-message'

export function ProfileScreen() {
    const { state: { profile, loading }, actions: { refresh } } = useAuth()
    const { toast } = useFeedback()
    const [name, setName] = useState('')
    const [surname, setSurname] = useState('')
    const [email, setEmail] = useState('')
    const [busy, setBusy] = useState(false)

    useEffect(() => {
        if (!profile) return
        queueMicrotask(() => {
            setName(profile.name)
            setSurname(profile.surname ?? '')
            setEmail(profile.email)
        })
    }, [profile])

    if (loading || !profile) {
        return (
            <div className="flex min-h-full items-center justify-center p-12">
                <Spinner size="lg" />
            </div>
        )
    }

    const isDirty =
        name.trim() !== profile.name
        || (surname.trim() || null) !== (profile.surname ?? null)
        || email.trim().toLowerCase() !== profile.email

    async function handleSubmit(e: FormEvent) {
        e.preventDefault()
        if (!profile) return
        if (!name.trim()) {
            toast({ title: 'Name is required', variant: 'error' })
            return
        }
        if (!email.trim()) {
            toast({ title: 'Email is required', variant: 'error' })
            return
        }
        setBusy(true)
        try {
            await updateProfile(profile.id, { name, surname, email })
            await refresh()
            toast({ title: 'Profile updated', variant: 'success' })
        } catch (err) {
            toast({ title: 'Save failed', description: getErrorMessage(err, 'Could not save.'), variant: 'error' })
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className="px-6 py-8 max-w-2xl mx-auto space-y-6">
            <div className="space-y-1">
                <h2 className="title-h6">Profile</h2>
                <p className="paragraph-sm text-tertiary">
                    The basics other people see when you comment, get assigned, or sign things off.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1">
                        <FormLabel label="First name" required />
                        <Input value={name} onChange={e => setName(e.target.value)} required />
                    </div>
                    <div className="space-y-1">
                        <FormLabel label="Last name" optional />
                        <Input value={surname} onChange={e => setSurname(e.target.value)} />
                    </div>
                </div>
                <div className="space-y-1">
                    <FormLabel label="Email" required />
                    <Input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                    />
                    <p className="paragraph-xs text-quaternary">
                        Used to sign in and for workspace admins to reach you.
                    </p>
                </div>

                <Button type="submit" icon={<Save />} disabled={!isDirty || busy} className="w-full md:w-auto">
                    {busy ? 'Saving…' : 'Save changes'}
                </Button>
            </form>
        </div>
    )
}
