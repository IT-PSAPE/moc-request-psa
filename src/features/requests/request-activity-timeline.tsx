import { useEffect, useMemo, useState } from 'react'
import { Archive, CircleAlert, CircleCheck, GitPullRequestArrow, Loader, MessageSquare, Tag, Trash2, UserPlus, UserMinus } from 'lucide-react'
import type { ReactNode } from 'react'
import { Avatar } from '@/components/display/avatar'
import { Label, Paragraph } from '@/components/display/text'
import { Spinner } from '@/components/feedback/spinner'
import { formatUtcIsoInBrowserTimeZone } from '@/utils/browser-date-time'
import { useDepartments } from '@/features/departments/department-provider'
import { fetchCategoriesForCurrentWorkspace } from '@/data/fetch-categories'
import { fetchWorkspaceMembers } from '@/data/fetch-workspace-members'
import { useRequestActivity } from './use-request-activity'
import { formatActivity, type ActivityLookups } from './format-activity'
import type { ActivityAction } from '@/types/activity'

function ActionIcon({ action }: { action: ActivityAction }): ReactNode {
    const cls = 'size-3.5 text-quaternary'
    switch (action) {
        case 'created': return <CircleCheck className={cls} />
        case 'status_changed': return <Loader className={cls} />
        case 'priority_changed': return <CircleAlert className={cls} />
        case 'category_changed': return <Tag className={cls} />
        case 'department_routed': return <GitPullRequestArrow className={cls} />
        case 'assignee_added': return <UserPlus className={cls} />
        case 'assignee_removed': return <UserMinus className={cls} />
        case 'comment_posted': return <MessageSquare className={cls} />
        case 'field_updated': return <Archive className={cls} />
        default: return <Trash2 className={cls} />
    }
}

type RequestActivityTimelineProps = {
    requestId: string
}

export function RequestActivityTimeline({ requestId }: RequestActivityTimelineProps) {
    const { entries, loading } = useRequestActivity(requestId)
    const { state: deptState } = useDepartments()
    const [categories, setCategories] = useState<{ id: string; label: string }[]>([])
    const [members, setMembers] = useState<{ id: string; name: string; surname: string | null }[]>([])

    useEffect(() => {
        let active = true
        Promise.all([
            fetchCategoriesForCurrentWorkspace(),
            fetchWorkspaceMembers(),
        ]).then(([cats, mems]) => {
            if (!active) return
            setCategories(cats.map(c => ({ id: c.id, label: c.label })))
            setMembers(mems.map(m => ({ id: m.profile.id, name: m.profile.name, surname: m.profile.surname })))
        })
        return () => { active = false }
    }, [])

    const lookups = useMemo<ActivityLookups>(() => {
        const userMap = new Map(members.map(m => [m.id, [m.name, m.surname].filter(Boolean).join(' ')]))
        const deptMap = new Map(deptState.allDepartments.map(d => [d.id, d.name]))
        const catMap = new Map(categories.map(c => [c.id, c.label]))
        return {
            userName: id => userMap.get(id) ?? null,
            departmentName: id => deptMap.get(id) ?? null,
            categoryLabel: id => catMap.get(id) ?? null,
        }
    }, [members, categories, deptState.allDepartments])

    return (
        <div>
            <Label.md className="block pb-3">Activity</Label.md>
            {loading ? (
                <div className="flex justify-center py-4"><Spinner size="md" /></div>
            ) : entries.length === 0 ? (
                <Paragraph.sm className="text-quaternary">No activity yet.</Paragraph.sm>
            ) : (
                <ol className="space-y-0">
                    {entries.map((entry, index) => {
                        const sentence = formatActivity(entry, lookups)
                        const actorName = entry.actorName ?? 'Anonymous'
                        const actionText = sentence.startsWith(actorName)
                            ? sentence.slice(actorName.length).trimStart()
                            : sentence

                        const isLast = index === entries.length - 1

                        return (
                            <li key={entry.id} className="relative flex gap-3 last:pb-0">
                                {/* Icon column with stem */}
                                <div className="flex flex-col items-center shrink-0" style={{ width: 20 }}>
                                    <span className="size-5 rounded-full bg-primary border border-secondary flex items-center justify-center z-10 shrink-0">
                                        <ActionIcon action={entry.action as ActivityAction} />
                                    </span>
                                    {!isLast && (
                                        <div className="w-[2px] flex-1 bg-border-secondary my-1" />
                                    )}
                                </div>
                                {/* Content */}
                                <div className="flex items-start gap-2 min-w-0 pb-5">
                                    {entry.actorInitials ? (
                                        <Avatar.initials size="xs" name={entry.actorInitials} className="shrink-0" />
                                    ) : (
                                        <span className="shrink-0 size-5 rounded-full bg-secondary grid place-items-center">
                                            <span className="paragraph-xs text-quaternary">?</span>
                                        </span>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-baseline gap-1.5 flex-wrap">
                                            <span className="label-sm text-primary">{actorName}</span>
                                            <Paragraph.sm className="text-tertiary">{actionText}</Paragraph.sm>
                                        </div>
                                        <span className="paragraph-xs text-quaternary mt-0.5 block">
                                            {formatUtcIsoInBrowserTimeZone(entry.createdAt)}
                                        </span>
                                    </div>
                                </div>
                            </li>
                        )
                    })}
                </ol>
            )}
        </div>
    )
}
