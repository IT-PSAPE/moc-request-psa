import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ExternalLink } from 'lucide-react'
import { Drawer } from '@/components/overlays/drawer'
import { Button } from '@/components/controls/button'
import { Label } from '@/components/display/text'
import { Spinner } from '@/components/feedback/spinner'
import { fetchAssigneesForRequest } from '@/data/fetch-assignees'
import { RequestPropertiesView } from './request-properties-view'
import type { Request, ResolvedAssignee } from '@/types/requests'

type RequestDrawerProps = {
    request: Request
    onClose: () => void
}

export function RequestDrawer({ request, onClose }: RequestDrawerProps) {
    const navigate = useNavigate()
    const [assignees, setAssignees] = useState<ResolvedAssignee[] | null>(null)

    useEffect(() => {
        let active = true
        fetchAssigneesForRequest(request.id).then(list => {
            if (active) setAssignees(list)
        })
        return () => { active = false }
    }, [request.id])

    function openDetail() {
        onClose()
        navigate(`/requests/${request.id}`)
    }

    return (
        <Drawer.Portal>
            <Drawer.Backdrop />
            <Drawer.Panel className="!max-w-lg">
                <Drawer.Header>
                    <Label.lg>{request.title}</Label.lg>
                </Drawer.Header>

                <Drawer.Content className="space-y-6">
                    <RequestPropertiesView.Meta request={request} />
                    <RequestPropertiesView.FiveW request={request} />
                    <RequestPropertiesView.Notes request={request} />
                    {assignees === null ? (
                        <div className="py-4 flex justify-center"><Spinner size="md" /></div>
                    ) : (
                        <RequestPropertiesView.Assignees assignees={assignees} />
                    )}
                </Drawer.Content>

                <Drawer.Footer>
                    <Button variant="secondary" onClick={onClose} className="flex-1">Close</Button>
                    <Button icon={<ExternalLink />} iconPosition="trailing" onClick={openDetail} className="flex-1">
                        Open detail
                    </Button>
                </Drawer.Footer>
            </Drawer.Panel>
        </Drawer.Portal>
    )
}
