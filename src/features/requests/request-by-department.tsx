import { Link } from 'react-router-dom'
import { ArrowRight, Building2 } from 'lucide-react'
import { Card } from '@/components/display/card'
import { Indicator } from '@/components/display/indicator'
import { Label, Paragraph } from '@/components/display/text'
import { Button } from '@/components/controls/button'
import { EmptyState } from '@/components/feedback/empty-state'
import { badgeColor } from '@/lib/color-keys'
import type { Department } from '@/types/departments'
import type { Request } from '@/types/requests'
import { RequestItem } from './request-item'

const PREVIEW_LIMIT = 4

type Group = {
    department: Department
    requests: Request[]
}

type RequestByDepartmentProps = {
    requests: Request[]
    departments: Department[]
    emptyTitle?: string
    emptyDescription?: string
}

export function RequestByDepartment({ requests, departments, emptyTitle, emptyDescription }: RequestByDepartmentProps) {
    if (requests.length === 0) {
        return (
            <div className="px-4 py-8">
                <EmptyState
                    icon={<Building2 />}
                    title={emptyTitle ?? 'No active requests'}
                    description={emptyDescription ?? 'When requests come in, they\'ll show up grouped by department.'}
                />
            </div>
        )
    }

    const groups: Group[] = []
    for (const dept of departments) {
        const items = requests.filter(r => r.departmentId === dept.id)
        if (items.length > 0) groups.push({ department: dept, requests: items })
    }

    return (
        <div className="flex flex-col gap-4 p-4 pt-0 mx-auto w-full max-w-content">
            {groups.map(group => {
                const total = group.requests.length
                const preview = group.requests.slice(0, PREVIEW_LIMIT)
                const hidden = total - preview.length
                const detailHref = `/departments/${group.department.id}`
                return (
                    <Card.Root key={group.department.id}>
                        <Card.Header className="gap-1.5">
                            <Indicator color={badgeColor(group.department.colorKey)} className="size-6" />
                            <Label.sm>{group.department.name}</Label.sm>
                            {group.department.description && (
                                <Paragraph.xs className="text-quaternary truncate hidden md:block">
                                    {group.department.description}
                                </Paragraph.xs>
                            )}
                            <Label.sm className="text-quaternary ml-auto">{total}</Label.sm>
                        </Card.Header>
                        <Card.Content ghost className="flex flex-col gap-1.5">
                            {preview.map(r => (
                                <RequestItem key={r.id} request={r} />
                            ))}
                            {hidden > 0 && (
                                <Link to={detailHref} className="self-end pt-1">
                                    <Button variant="ghost" icon={<ArrowRight />} iconPosition="trailing">
                                        View {hidden} more
                                    </Button>
                                </Link>
                            )}
                        </Card.Content>
                    </Card.Root>
                )
            })}
        </div>
    )
}
