import { useState } from 'react'
import { LayoutGrid, List } from 'lucide-react'
import { SegmentedControl } from '@/components/controls/segmented-control'
import type { Request } from '@/types/requests'
import { RequestList } from './request-list'
import { RequestKanban } from './request-kanban'

type ViewMode = 'list' | 'kanban'

export function RequestViews({ requests }: { requests: Request[] }) {
    const [view, setView] = useState<ViewMode>('list')

    return (
        <div className="space-y-3">
            <div className="px-4 flex items-center justify-end">
                <SegmentedControl.Root value={view} onValueChange={v => setView(v as ViewMode)}>
                    <SegmentedControl.Item value="list" icon={<List />}>List</SegmentedControl.Item>
                    <SegmentedControl.Item value="kanban" icon={<LayoutGrid />}>Kanban</SegmentedControl.Item>
                </SegmentedControl.Root>
            </div>
            {view === 'list' ? <RequestList requests={requests} /> : <RequestKanban requests={requests} />}
        </div>
    )
}
