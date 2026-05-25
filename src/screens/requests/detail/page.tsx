import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Spinner } from '@/components/feedback/spinner'
import { Button } from '@/components/controls/button'
import { Divider } from '@/components/display/divider'
import { Tabs } from '@/components/layout/tabs'
import { Label } from '@/components/display/text'
import { fetchRequestById } from '@/data/fetch-requests'
import { fetchAssigneesForRequest } from '@/data/fetch-assignees'
import { useRequests } from '@/features/requests/request-provider'
import { usePermissions } from '@/features/auth/use-permissions'
import { RequestEditor } from '@/features/requests/request-editor'
import { RequestComments } from '@/features/requests/request-comments'
import { RequestActivityTimeline } from '@/features/requests/request-activity-timeline'
import { TopBarActions } from '@/features/topbar'
import { routes } from '@/screens/app-routes'
import type { Request, ResolvedAssignee } from '@/types/requests'

const SECTIONS = [
    { value: 'overview', label: 'Overview' },
    { value: 'details', label: 'Details' },
    { value: 'assignees', label: 'Assignees' },
    { value: 'activity', label: 'Activity' },
    { value: 'danger', label: 'Danger zone' },
] as const

export function RequestDetailScreen() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { canUpdate, canDelete } = usePermissions()
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

    // The Danger zone (archive / delete) is only reachable for roles that can
    // act on it; hide the tab entirely for read-only members.
    const sections = SECTIONS.filter(s => s.value !== 'danger' || canUpdate || canDelete)

    return (
        <RequestEditor.Root request={initial} assignees={assignees} onSync={syncRequest} onRemove={removeRequest}>
            <TopBarActions>
                <Button variant="ghost" icon={<ArrowLeft />} onClick={() => navigate(-1)}>Back</Button>
                <RequestEditor.DiscardButton />
                <RequestEditor.SaveButton />
            </TopBarActions>

            <div className="px-6 py-8 max-w-6xl mx-auto space-y-6">
                <RequestEditor.Title />
                <RequestEditor.ErrorBanner />

                <Tabs.Root orientation="vertical" defaultTab="overview">
                    <div className="grid gap-10 md:grid-cols-[200px_1fr] items-start">
                        <Tabs.List className="md:sticky md:top-4">
                            {sections.map(s => (
                                <Tabs.Tab key={s.value} value={s.value}>{s.label}</Tabs.Tab>
                            ))}
                        </Tabs.List>

                        <div className="min-w-0">
                            <Tabs.Panels>
                                <Tabs.Panel value="overview">
                                    <Label.md className="block pb-3">Overview</Label.md>
                                    <RequestEditor.MetaFields />
                                </Tabs.Panel>

                                <Tabs.Panel value="details">
                                    <RequestEditor.FiveW />
                                    <Divider className="my-6" />
                                    <RequestEditor.Notes />
                                    <Divider className="my-6" />
                                    <RequestComments requestId={initial.id} />
                                </Tabs.Panel>

                                <Tabs.Panel value="assignees">
                                    <RequestEditor.Assignees />
                                </Tabs.Panel>

                                <Tabs.Panel value="activity">
                                    <RequestActivityTimeline requestId={initial.id} />
                                </Tabs.Panel>

                                <Tabs.Panel value="danger">
                                    <RequestEditor.DangerZone />
                                </Tabs.Panel>
                            </Tabs.Panels>
                        </div>
                    </div>
                </Tabs.Root>
            </div>
        </RequestEditor.Root>
    )
}
