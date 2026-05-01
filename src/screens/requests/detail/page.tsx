import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Archive, ArchiveRestore, Save, Trash2, Undo2 } from 'lucide-react'
import { Spinner } from '@/components/feedback/spinner'
import { Button } from '@/components/controls/button'
import { Card } from '@/components/display/card'
import { Label } from '@/components/display/text'
import { Input } from '@/components/form/input'
import { useFeedback } from '@/components/feedback/feedback-provider'
import { useConfirm } from '@/components/feedback/confirm-modal'
import { fetchRequestById } from '@/data/fetch-requests'
import { fetchAssigneesForRequest } from '@/data/fetch-assignees'
import { archiveRequest, deleteRequest, unarchiveRequest } from '@/data/mutate-requests'
import { useRequests } from '@/features/requests/request-provider'
import { useRequestStore } from '@/features/requests/use-request-store'
import { RequestMetaFields, RequestFiveW, RequestNotes, RequestAssigneeList } from '@/features/requests/request-properties'
import { RequestComments } from '@/features/requests/request-comments'
import { RequestActivityTimeline } from '@/features/requests/request-activity-timeline'
import { TopBarActions } from '@/features/topbar'
import { getErrorMessage } from '@/utils/get-error-message'
import { routes } from '@/screens/app-routes'
import type { Request, ResolvedAssignee } from '@/types/requests'

export function RequestDetailScreen() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { toast } = useFeedback()
    const { actions: { syncRequest, removeRequest } } = useRequests()
    const [initial, setInitial] = useState<Request | null>(null)
    const [notFound, setNotFound] = useState(false)
    const [loading, setLoading] = useState(true)
    const [assignees, setAssignees] = useState<ResolvedAssignee[]>([])

    useEffect(() => {
        let active = true
        if (!id) {
            queueMicrotask(() => {
                if (!active) return
                setNotFound(true)
                setLoading(false)
            })
            return () => { active = false }
        }
        Promise.all([fetchRequestById(id), fetchAssigneesForRequest(id)])
            .then(([req, list]) => {
                if (!active) return
                if (!req) {
                    setNotFound(true)
                } else {
                    setInitial(req)
                    setAssignees(list)
                }
                setLoading(false)
            })
        return () => { active = false }
    }, [id])

    if (loading) {
        return (
            <div className="flex min-h-full items-center justify-center p-12">
                <Spinner size="lg" />
            </div>
        )
    }

    if (notFound || !initial) {
        return <Navigate to={`/${routes.dashboard}`} replace />
    }

    return <RequestDetailContent request={initial} assignees={assignees} navigate={navigate} toast={toast} syncRequest={syncRequest} removeRequest={removeRequest} />
}

type ContentProps = {
    request: Request
    assignees: ResolvedAssignee[]
    navigate: ReturnType<typeof useNavigate>
    toast: ReturnType<typeof useFeedback>['toast']
    syncRequest: (request: Request) => void
    removeRequest: (id: string) => void
}

function RequestDetailContent({ request, assignees, navigate, toast, syncRequest, removeRequest }: ContentProps) {
    const { state, actions } = useRequestStore(request, { syncRequest })
    const confirm = useConfirm()
    const draft = state.draft

    async function handleSave() {
        try {
            await actions.save()
            toast({ title: 'Request saved', variant: 'success' })
        } catch (error) {
            toast({ title: 'Save failed', description: getErrorMessage(error, 'Could not save the request.'), variant: 'error' })
        }
    }

    async function handleArchiveToggle() {
        try {
            const next = draft.status === 'archived'
                ? await unarchiveRequest(draft.id)
                : await archiveRequest(draft.id)
            actions.reset(next)
            syncRequest(next)
            toast({ title: next.status === 'archived' ? 'Archived' : 'Restored', variant: 'success' })
        } catch (error) {
            toast({ title: 'Update failed', description: getErrorMessage(error, 'Could not update.'), variant: 'error' })
        }
    }

    async function handleDelete() {
        const ok = await confirm({
            title: 'Delete this request?',
            description: 'This is permanent. Comments, assignees, and the activity timeline will be removed.',
            confirmLabel: 'Delete',
            intent: 'danger',
        })
        if (!ok) return
        try {
            await deleteRequest(draft.id)
            removeRequest(draft.id)
            toast({ title: 'Request deleted', variant: 'success' })
            navigate(`/${routes.dashboard}`)
        } catch (error) {
            toast({ title: 'Delete failed', description: getErrorMessage(error, 'Could not delete.'), variant: 'error' })
        }
    }

    return (
        <div className="px-6 py-8 max-w-4xl mx-auto space-y-6">
            <TopBarActions>
                <Button variant="ghost" icon={<ArrowLeft />} onClick={() => navigate(-1)}>Back</Button>
                {state.isDirty && (
                    <Button variant="secondary" icon={<Undo2 />} onClick={actions.discard} disabled={state.isSaving}>
                        Discard
                    </Button>
                )}
                <Button icon={<Save />} onClick={handleSave} disabled={!state.isDirty || state.isSaving}>
                    {state.isSaving ? 'Saving…' : 'Save'}
                </Button>
            </TopBarActions>

            <div className="space-y-1">
                <Input
                    value={draft.title}
                    onChange={e => actions.updateField('title', e.target.value)}
                    style="ghost"
                    className="text-2xl font-semibold"
                />
                <p className="paragraph-xs text-quaternary font-mono">#{draft.trackingId}</p>
            </div>

            {state.error && (
                <div className="rounded-lg border border-error bg-error_subtle p-3">
                    <p className="paragraph-sm text-error">{state.error}</p>
                </div>
            )}

            <div className="grid gap-6 md:grid-cols-[1fr_320px]">
                <div className="space-y-6">
                    <Card.Root>
                        <Card.Content>
                            <RequestFiveW request={draft} editable onFieldChange={actions.updateField} />
                        </Card.Content>
                    </Card.Root>

                    <Card.Root>
                        <Card.Content>
                            <RequestNotes request={draft} editable onFieldChange={actions.updateField} />
                        </Card.Content>
                    </Card.Root>

                    <Card.Root>
                        <Card.Content>
                            <RequestComments requestId={draft.id} />
                        </Card.Content>
                    </Card.Root>

                    <Card.Root>
                        <Card.Content>
                            <RequestActivityTimeline requestId={draft.id} />
                        </Card.Content>
                    </Card.Root>
                </div>

                <div className="space-y-6">
                    <Card.Root>
                        <Card.Content>
                            <Label.md className="block pb-3">Properties</Label.md>
                            <RequestMetaFields request={draft} editable onFieldChange={actions.updateField} />
                        </Card.Content>
                    </Card.Root>

                    <Card.Root>
                        <Card.Content>
                            <RequestAssigneeList assignees={assignees} />
                        </Card.Content>
                    </Card.Root>

                    <Card.Root>
                        <Card.Content>
                            <Label.md className="block pb-3">Danger zone</Label.md>
                            <div className="space-y-2">
                                <Button
                                    variant="secondary"
                                    className="w-full"
                                    icon={draft.status === 'archived' ? <ArchiveRestore /> : <Archive />}
                                    onClick={handleArchiveToggle}
                                    disabled={state.isSaving}
                                >
                                    {draft.status === 'archived' ? 'Restore from archive' : 'Archive request'}
                                </Button>
                                <Button
                                    variant="danger-secondary"
                                    className="w-full"
                                    icon={<Trash2 />}
                                    onClick={handleDelete}
                                    disabled={state.isSaving}
                                >
                                    Delete request
                                </Button>
                            </div>
                        </Card.Content>
                    </Card.Root>
                </div>
            </div>
        </div>
    )
}
