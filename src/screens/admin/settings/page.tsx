import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Save } from 'lucide-react'
import { Button } from '@/components/controls/button'
import { Input } from '@/components/form/input'
import { FormLabel } from '@/components/form/form-label'
import { Spinner } from '@/components/feedback/spinner'
import { useFeedback } from '@/components/feedback/feedback-provider'
import { useCurrentWorkspace } from '@/features/workspace/workspace-provider'
import { updateWorkspace } from '@/data/mutate-workspaces'
import { getErrorMessage } from '@/utils/get-error-message'

export function AdminSettingsScreen() {
    const { workspace, loading } = useCurrentWorkspace()
    const { toast } = useFeedback()
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [busy, setBusy] = useState(false)

    useEffect(() => {
        if (!workspace) return
        queueMicrotask(() => {
            setName(workspace.name)
            setDescription(workspace.description ?? '')
        })
    }, [workspace])

    if (loading || !workspace) {
        return (
            <div className="flex min-h-full items-center justify-center p-12">
                <Spinner size="lg" />
            </div>
        )
    }

    const isDirty = name.trim() !== workspace.name || (description.trim() || null) !== (workspace.description ?? null)

    async function handleSubmit(e: FormEvent) {
        e.preventDefault()
        if (!workspace) return
        if (!name.trim()) {
            toast({ title: 'Name is required', variant: 'error' })
            return
        }
        setBusy(true)
        try {
            await updateWorkspace(workspace.id, { name, description: description || null })
            toast({ title: 'Workspace updated', variant: 'success' })
            // Force a soft refresh so the AppShell pulls the new name
            window.location.reload()
        } catch (err) {
            toast({ title: 'Save failed', description: getErrorMessage(err, 'Could not save.'), variant: 'error' })
            setBusy(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="space-y-1">
                <h2 className="title-h6">Workspace</h2>
                <p className="paragraph-sm text-tertiary">
                    Update the basics of your workspace. The name shows everywhere people see this team.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                    <FormLabel label="Workspace name" required />
                    <Input value={name} onChange={e => setName(e.target.value)} required />
                </div>
                <div className="space-y-1">
                    <FormLabel label="Description" optional />
                    <Input
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder="What this workspace does"
                    />
                </div>
                <div className="space-y-1">
                    <FormLabel label="Slug" />
                    <Input value={workspace.slug} disabled />
                    <p className="paragraph-xs text-quaternary">Workspace slugs are managed by the platform.</p>
                </div>
                <Button type="submit" icon={<Save />} disabled={!isDirty || busy} className="w-full md:w-auto">
                    {busy ? 'Saving…' : 'Save changes'}
                </Button>
            </form>
        </div>
    )
}
