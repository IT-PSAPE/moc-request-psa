import type { ChangeEvent } from 'react'
import { Input } from '@/components/form/input'
import { Select } from '@/components/form/select'
import { FormLabel } from '@/components/form/form-label'
import { formatUtcIsoForBrowserDateTimeInput, parseBrowserDateTimeInputToUtcIso } from '@/utils/browser-date-time'
import type { Priority } from '@/types/requests'
import { priorityLabel } from '@/types/requests'

export type SubmissionFormState = {
    title: string
    requestedByName: string
    requestedByEmail: string
    priority: Priority
    dueDate: string | null
    who: string
    what: string
    when: string
    where: string
    why: string
    how: string
}

export const initialFormState: SubmissionFormState = {
    title: '',
    requestedByName: '',
    requestedByEmail: '',
    priority: 'medium',
    dueDate: null,
    who: '',
    what: '',
    when: '',
    where: '',
    why: '',
    how: '',
}

const allPriorities: Priority[] = ['low', 'medium', 'high', 'urgent']

type SubmissionFormProps = {
    state: SubmissionFormState
    onChange: <K extends keyof SubmissionFormState>(field: K, value: SubmissionFormState[K]) => void
}

export function SubmissionForm({ state, onChange }: SubmissionFormProps) {
    function handleDueDate(e: ChangeEvent<HTMLInputElement>) {
        const v = e.target.value
        onChange('dueDate', v ? parseBrowserDateTimeInputToUtcIso(v) : null)
    }

    return (
        <div className="space-y-4">
            <div className="space-y-1">
                <FormLabel label="Title" required />
                <Input
                    placeholder="Short summary of the request"
                    value={state.title}
                    onChange={e => onChange('title', e.target.value)}
                    required
                />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                    <FormLabel label="Your name" required />
                    <Input
                        placeholder="Full name"
                        value={state.requestedByName}
                        onChange={e => onChange('requestedByName', e.target.value)}
                        required
                    />
                </div>
                <div className="space-y-1">
                    <FormLabel label="Your email" optional />
                    <Input
                        type="email"
                        placeholder="you@example.com"
                        value={state.requestedByEmail}
                        onChange={e => onChange('requestedByEmail', e.target.value)}
                    />
                </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                    <FormLabel label="Priority" />
                    <Select
                        value={state.priority}
                        onChange={e => onChange('priority', e.target.value as Priority)}
                    >
                        {allPriorities.map(p => (
                            <option key={p} value={p}>{priorityLabel[p]}</option>
                        ))}
                    </Select>
                </div>
                <div className="space-y-1">
                    <FormLabel label="Preferred due date" optional />
                    <Input
                        type="datetime-local"
                        value={formatUtcIsoForBrowserDateTimeInput(state.dueDate)}
                        onChange={handleDueDate}
                    />
                </div>
            </div>

            <div className="space-y-3 pt-2">
                <h3 className="label-md">5 Ws and 1 H</h3>
                <div className="grid gap-3 md:grid-cols-2">
                    {(['who', 'what', 'when', 'where', 'why', 'how'] as const).map(key => (
                        <div key={key} className="space-y-1">
                            <FormLabel label={key.charAt(0).toUpperCase() + key.slice(1)} required={key === 'what'} />
                            <Input
                                placeholder={`${key.charAt(0).toUpperCase() + key.slice(1)}…`}
                                value={state[key]}
                                onChange={e => onChange(key, e.target.value)}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
