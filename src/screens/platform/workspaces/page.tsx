import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Shield } from 'lucide-react'
import { Button } from '@/components/controls/button'
import { Label, Paragraph } from '@/components/display/text'
import { Spinner } from '@/components/feedback/spinner'
import { EmptyState } from '@/components/feedback/empty-state'
import { fetchAllWorkspaces } from '@/data/fetch-workspaces'
import { routes } from '@/screens/app-routes'
import type { Workspace } from '@/types/workspaces'

export function PlatformWorkspacesScreen() {
    const navigate = useNavigate()
    const [workspaces, setWorkspaces] = useState<Workspace[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let active = true
        fetchAllWorkspaces().then(list => {
            if (!active) return
            setWorkspaces(list)
            setLoading(false)
        })
        return () => { active = false }
    }, [])

    if (loading) {
        return (
            <div className="flex min-h-full items-center justify-center p-12">
                <Spinner size="lg" />
            </div>
        )
    }

    return (
        <div className="px-6 py-8 max-w-5xl mx-auto space-y-6">
            <div className="flex items-end justify-between">
                <div className="space-y-1">
                    <h1 className="title-h5">Platform · Workspaces</h1>
                    <p className="paragraph-sm text-tertiary">
                        Create new workspaces and assign their initial admin.
                    </p>
                </div>
                <Button icon={<Plus />} onClick={() => navigate(`/${routes.platformCreateWorkspace}`)}>
                    New workspace
                </Button>
            </div>

            {workspaces.length === 0 ? (
                <EmptyState
                    icon={<Shield />}
                    title="No workspaces yet"
                    description="Create the first workspace to get started."
                />
            ) : (
                <div className="space-y-3">
                    {workspaces.map(ws => (
                        <button
                            key={ws.id}
                            type="button"
                            onClick={() => navigate(`/platform/workspaces/${ws.id}`)}
                            className="w-full text-left rounded-lg border border-secondary bg-primary p-4 hover:bg-primary_hover transition-colors cursor-pointer"
                        >
                            <div className="flex items-center gap-3">
                                <div className="size-10 shrink-0 rounded-xl bg-brand_solid grid place-items-center text-primary_on-brand">
                                    <span className="label-md">{ws.name[0]}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <Label.md>{ws.name}</Label.md>
                                    <Paragraph.xs className="text-quaternary truncate font-mono">{ws.slug}</Paragraph.xs>
                                    {ws.description && (
                                        <Paragraph.sm className="text-tertiary truncate">{ws.description}</Paragraph.sm>
                                    )}
                                </div>
                                <Label.xs className="text-quaternary">Manage</Label.xs>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}
