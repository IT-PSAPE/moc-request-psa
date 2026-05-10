import { ChevronDown } from 'lucide-react'
import { Input } from '@/components/form/input'
import { Textarea } from '@/components/form/textarea'
import { FormLabel } from '@/components/form/form-label'
import { Dropdown } from '@/components/overlays/dropdown'
import type { Priority } from '@/types/requests'
import { priorityLabel } from '@/types/requests'
import type { Category } from '@/types/categories'

export type SubmissionFormState = {
    title: string
    requestedByName: string
    requestedByEmail: string
    priority: Priority
    dueDate: string | null
    categoryId: string
    who: string
    what: string
    when: string
    where: string
    why: string
    how: string
    notes: string
}

export const initialFormState: SubmissionFormState = {
    title: '',
    requestedByName: '',
    requestedByEmail: '',
    priority: 'medium',
    dueDate: null,
    categoryId: '',
    who: '',
    what: '',
    when: '',
    where: '',
    why: '',
    how: '',
    notes: '',
}

const allPriorities: Priority[] = ['low', 'medium', 'high', 'urgent']

type FieldChange = <K extends keyof SubmissionFormState>(field: K, value: SubmissionFormState[K]) => void

// ─── Basic Info ──────────────────────────────────────────────────────

type BasicInfoStepProps = {
    state: SubmissionFormState
    onChange: FieldChange
    categories: Category[]
    categoriesLoading: boolean
}

export function BasicInfoStep({ state, onChange, categories, categoriesLoading }: BasicInfoStepProps) {
    function handleDueDate(value: string) {
        if (!value) {
            onChange('dueDate', null)
            return
        }
        const date = new Date(value)
        onChange('dueDate', isNaN(date.getTime()) ? null : date.toISOString())
    }

    const dueDateValue = state.dueDate ? state.dueDate.slice(0, 10) : ''
    const selectedCategory = categories.find(c => c.id === state.categoryId)

    return (
        <div className="space-y-5">
            <div className="space-y-1.5">
                <FormLabel label="Title" required />
                <Input
                    placeholder="e.g. Easter service recap video"
                    value={state.title}
                    onChange={e => onChange('title', e.target.value)}
                    required
                />
            </div>

            <div className="space-y-1.5">
                <FormLabel label="Requested by" required />
                <Input
                    placeholder="e.g. Lead Pastor"
                    value={state.requestedByName}
                    onChange={e => onChange('requestedByName', e.target.value)}
                    required
                />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                    <FormLabel label="Priority" required />
                    <Dropdown.Root placement="bottom-start" className="w-full">
                        <Dropdown.Trigger className="w-full">
                            <span className="flex w-full items-center gap-2 cursor-pointer rounded-lg border border-secondary px-3 py-2 hover:bg-secondary">
                                <span className="paragraph-sm text-primary flex-1 text-left">
                                    {priorityLabel[state.priority]}
                                </span>
                                <ChevronDown className="size-4 text-tertiary shrink-0" />
                            </span>
                        </Dropdown.Trigger>
                        <Dropdown.Panel>
                            {allPriorities.map(p => (
                                <Dropdown.Item key={p} onSelect={() => onChange('priority', p)}>
                                    {priorityLabel[p]}
                                </Dropdown.Item>
                            ))}
                        </Dropdown.Panel>
                    </Dropdown.Root>
                </div>

                <div className="space-y-1.5">
                    <FormLabel label="Category" required />
                    <Dropdown.Root placement="bottom-start" className="w-full">
                        <Dropdown.Trigger className="w-full">
                            <span className="flex w-full items-center gap-2 cursor-pointer rounded-lg border border-secondary px-3 py-2 hover:bg-secondary">
                                <span className="paragraph-sm text-primary flex-1 text-left">
                                    {selectedCategory?.label
                                        ?? (categoriesLoading ? 'Loading…' : categories.length === 0 ? 'No categories available' : 'Select a category')}
                                </span>
                                <ChevronDown className="size-4 text-tertiary shrink-0" />
                            </span>
                        </Dropdown.Trigger>
                        <Dropdown.Panel>
                            {categories.map(c => (
                                <Dropdown.Item key={c.id} onSelect={() => onChange('categoryId', c.id)}>
                                    {c.label}
                                </Dropdown.Item>
                            ))}
                        </Dropdown.Panel>
                    </Dropdown.Root>
                </div>
            </div>

            <div className="space-y-1.5">
                <FormLabel label="Due date" required />
                <Input
                    type="date"
                    value={dueDateValue}
                    onChange={e => handleDueDate(e.target.value)}
                    required
                />
            </div>
        </div>
    )
}

// ─── Details ─────────────────────────────────────────────────────────

const fiveWFields: { key: keyof SubmissionFormState; label: string; placeholder: string }[] = [
    { key: 'who', label: 'Who', placeholder: 'Who is involved or responsible?' },
    { key: 'what', label: 'What', placeholder: 'What needs to be done?' },
    { key: 'when', label: 'When', placeholder: 'When does this need to happen?' },
    { key: 'where', label: 'Where', placeholder: 'Where will this take place?' },
    { key: 'why', label: 'Why', placeholder: 'Why is this needed?' },
    { key: 'how', label: 'How', placeholder: 'How should it be approached?' },
]

type DetailsStepProps = {
    state: SubmissionFormState
    onChange: FieldChange
}

export function DetailsStep({ state, onChange }: DetailsStepProps) {
    return (
        <div className="space-y-5">
            {fiveWFields.map(({ key, label, placeholder }) => (
                <div key={key} className="space-y-1.5">
                    <FormLabel label={label} required />
                    <Textarea
                        value={state[key] as string}
                        onChange={e => onChange(key, e.target.value as SubmissionFormState[typeof key])}
                        placeholder={placeholder}
                        rows={2}
                    />
                </div>
            ))}

            <div className="space-y-1.5">
                <FormLabel label="Notes" optional />
                <Textarea
                    value={state.notes}
                    onChange={e => onChange('notes', e.target.value)}
                    placeholder="Anything else worth knowing?"
                    rows={3}
                />
            </div>
        </div>
    )
}
