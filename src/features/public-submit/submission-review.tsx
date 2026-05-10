import {
    Calendar,
    FileText,
    Flag,
    Lightbulb,
    MapPin,
    StickyNote,
    Tag,
    Target,
    User,
    Users,
    Wrench,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { Badge } from '@/components/display/badge'
import { Label, Paragraph } from '@/components/display/text'
import { badgeColor } from '@/lib/color-keys'
import { priorityLabel, priorityColor } from '@/types/requests'
import type { Category } from '@/types/categories'
import type { SubmissionFormState } from './submission-form'

type SubmissionReviewProps = {
    state: SubmissionFormState
    categories: Category[]
}

function ReviewRow({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
    return (
        <div className="flex items-start gap-3 py-2">
            <div className="flex items-center gap-2 w-32 shrink-0 text-tertiary pt-0.5">
                <span className="*:size-4">{icon}</span>
                <Label.sm className="text-tertiary">{label}</Label.sm>
            </div>
            <div className="flex-1 min-w-0">{children}</div>
        </div>
    )
}

function formatDueDate(iso: string | null) {
    if (!iso) return '—'
    const d = new Date(iso)
    if (isNaN(d.getTime())) return '—'
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })
}

export function SubmissionReview({ state, categories }: SubmissionReviewProps) {
    const selectedCategory = categories.find(c => c.id === state.categoryId)

    return (
        <div className="space-y-6">
            <section className="space-y-1">
                <Paragraph.xs className="text-quaternary tracking-wide uppercase">Basic info</Paragraph.xs>
                <div className="divide-y divide-secondary">
                    <ReviewRow icon={<FileText />} label="Title">
                        <Paragraph.sm className="text-primary">{state.title || '—'}</Paragraph.sm>
                    </ReviewRow>
                    <ReviewRow icon={<User />} label="Requested by">
                        <Paragraph.sm className="text-primary">{state.requestedByName || '—'}</Paragraph.sm>
                    </ReviewRow>
                    <ReviewRow icon={<Flag />} label="Priority">
                        <Badge label={priorityLabel[state.priority]} color={badgeColor(priorityColor[state.priority])} />
                    </ReviewRow>
                    <ReviewRow icon={<Tag />} label="Category">
                        {selectedCategory ? (
                            <Badge label={selectedCategory.label} color={badgeColor(selectedCategory.colorKey)} />
                        ) : (
                            <Paragraph.sm className="text-quaternary">—</Paragraph.sm>
                        )}
                    </ReviewRow>
                    <ReviewRow icon={<Calendar />} label="Due date">
                        <Paragraph.sm className="text-primary">{formatDueDate(state.dueDate)}</Paragraph.sm>
                    </ReviewRow>
                </div>
            </section>

            <section className="space-y-1">
                <Paragraph.xs className="text-quaternary tracking-wide uppercase">Details</Paragraph.xs>
                <div className="divide-y divide-secondary">
                    <ReviewRow icon={<Users />} label="Who">
                        <Paragraph.sm className="text-primary whitespace-pre-wrap">{state.who || '—'}</Paragraph.sm>
                    </ReviewRow>
                    <ReviewRow icon={<Target />} label="What">
                        <Paragraph.sm className="text-primary whitespace-pre-wrap">{state.what || '—'}</Paragraph.sm>
                    </ReviewRow>
                    <ReviewRow icon={<Calendar />} label="When">
                        <Paragraph.sm className="text-primary whitespace-pre-wrap">{state.when || '—'}</Paragraph.sm>
                    </ReviewRow>
                    <ReviewRow icon={<MapPin />} label="Where">
                        <Paragraph.sm className="text-primary whitespace-pre-wrap">{state.where || '—'}</Paragraph.sm>
                    </ReviewRow>
                    <ReviewRow icon={<Lightbulb />} label="Why">
                        <Paragraph.sm className="text-primary whitespace-pre-wrap">{state.why || '—'}</Paragraph.sm>
                    </ReviewRow>
                    <ReviewRow icon={<Wrench />} label="How">
                        <Paragraph.sm className="text-primary whitespace-pre-wrap">{state.how || '—'}</Paragraph.sm>
                    </ReviewRow>
                    {state.notes.trim() && (
                        <ReviewRow icon={<StickyNote />} label="Notes">
                            <Paragraph.sm className="text-primary whitespace-pre-wrap">{state.notes}</Paragraph.sm>
                        </ReviewRow>
                    )}
                </div>
            </section>
        </div>
    )
}

