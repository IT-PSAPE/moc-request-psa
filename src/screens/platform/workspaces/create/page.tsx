import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import { Button } from '@/components/controls/button'
import { Input } from '@/components/form/input'
import { FormLabel } from '@/components/form/form-label'
import { Card } from '@/components/display/card'
import { useFeedback } from '@/components/feedback/feedback-provider'
import { createWorkspace } from '@/data/mutate-workspaces'
import { getErrorMessage } from '@/utils/get-error-message'
import { routes } from '@/screens/app-routes'

function deriveSlug(name: string) {
    return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)
}

export function PlatformCreateWorkspaceScreen() {
    const navigate = useNavigate()
    const { toast } = useFeedback()
    const [name, setName] = useState('')
    const [slug, setSlug] = useState('')
    const [description, setDescription] = useState('')
    const [error, setError] = useState('')
    const [busy, setBusy] = useState(false)

    function handleNameChange(value: string) {
        setName(value)
        if (!slug || slug === deriveSlug(name)) {
            setSlug(deriveSlug(value))
        }
    }

    async function handleSubmit(e: FormEvent) {
        e.preventDefault()
        setError('')
        if (!name.trim()) return setError('Name is required')
        if (!slug.trim()) return setError('Slug is required')

        setBusy(true)
        try {
            const result = await createWorkspace({ name, slug, description: description || null })
            toast({ title: 'Workspace created', variant: 'success' })
            navigate(`/platform/workspaces/${result.workspace.id}`)
        } catch (err) {
            setError(getErrorMessage(err, 'Could not create workspace.'))
            setBusy(false)
        }
    }

    return (
        <div className="px-6 py-8 max-w-xl mx-auto space-y-6">
            <Button variant="ghost" icon={<ArrowLeft />} onClick={() => navigate(`/${routes.platformWorkspaces}`)}>
                All workspaces
            </Button>

            <div className="space-y-1">
                <h1 className="title-h5">New workspace</h1>
                <p className="paragraph-sm text-tertiary">
                    Each workspace gets its own departments, categories, and members. After creation, assign an initial admin to take over day-to-day management.
                </p>
            </div>

            {error && (
                <div className="rounded-lg border border-error bg-error_subtle p-3">
                    <p className="paragraph-sm text-error">{error}</p>
                </div>
            )}

            <Card.Root>
                <Card.Content>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1">
                            <FormLabel label="Name" required />
                            <Input value={name} onChange={e => handleNameChange(e.target.value)} placeholder="e.g. Studio West" required />
                        </div>
                        <div className="space-y-1">
                            <FormLabel label="Slug" required />
                            <Input
                                value={slug}
                                onChange={e => setSlug(e.target.value.toLowerCase())}
                                placeholder="studio-west"
                                required
                            />
                            <p className="paragraph-xs text-quaternary">
                                Used in URLs. Lowercase letters, numbers, and dashes only.
                            </p>
                        </div>
                        <div className="space-y-1">
                            <FormLabel label="Description" optional />
                            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="What this workspace is for" />
                        </div>
                        <Button type="submit" icon={<Save />} className="w-full" disabled={busy}>
                            {busy ? 'Creating…' : 'Create workspace'}
                        </Button>
                    </form>
                </Card.Content>
            </Card.Root>
        </div>
    )
}
