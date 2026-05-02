import { Plus, Save } from 'lucide-react'
import { Button } from '@/components/controls/button'
import { Table } from '@/components/display/table'
import { Input } from '@/components/form/input'
import { Indicator } from '@/components/display/indicator'
import { Paragraph } from '@/components/display/text'
import { Dropdown } from '@/components/overlays/dropdown'
import { useFeedback } from '@/components/feedback/feedback-provider'
import { badgeColor } from '@/lib/color-keys'
import { getErrorMessage } from '@/utils/get-error-message'
import { useDepartmentsEditor } from './use-departments-editor'
import { useDirtyBlocker } from './use-dirty-blocker'
import type { Department } from '@/types/departments'

const COLOR_OPTIONS = ['blue', 'purple', 'green', 'orange', 'red', 'yellow', 'teal', 'pink', 'gray'] as const

type DepartmentsTableProps = {
    departments: Department[]
    onSaved: () => Promise<void>
}

export function DepartmentsTable({ departments, onSaved }: DepartmentsTableProps) {
    const { toast } = useFeedback()
    const { state, actions } = useDepartmentsEditor(departments)

    useDirtyBlocker({
        enabled: state.isDirty,
        title: 'Discard department changes?',
        description: 'You have unsaved edits to your departments. Leave the page and lose them?',
    })

    async function handleSave() {
        try {
            await actions.save(onSaved)
            toast({ title: 'Departments saved', variant: 'success' })
        } catch (err) {
            toast({ title: 'Save failed', description: getErrorMessage(err, 'Could not save.'), variant: 'error' })
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-end justify-between">
                <div className="space-y-1">
                    <h2 className="title-h6">Departments</h2>
                    <p className="paragraph-sm text-tertiary">
                        Departments group requests for the team handling them.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="secondary" icon={<Plus />} onClick={actions.addRow} disabled={state.isSaving}>
                        New department
                    </Button>
                    <Button icon={<Save />} onClick={handleSave} disabled={!state.isDirty || state.isSaving}>
                        {state.isSaving ? 'Saving…' : 'Save changes'}
                    </Button>
                </div>
            </div>

            {state.error && (
                <div className="rounded-lg border border-error bg-error_subtle p-3">
                    <Paragraph.sm className="text-error">{state.error}</Paragraph.sm>
                </div>
            )}

            {state.draft.length === 0 ? (
                <div className="rounded-lg border border-secondary bg-primary px-6 py-8 text-center">
                    <Paragraph.sm className="text-tertiary">
                        No departments yet. Click <span className="text-primary font-medium">New department</span> to add one.
                    </Paragraph.sm>
                </div>
            ) : (
                <div className="overflow-x-auto rounded-lg border border-secondary bg-primary">
                    <Table className="w-full">
                        <Table.Head>
                            <Table.Row>
                                <Table.Header className="px-3 py-2 paragraph-xs">Name</Table.Header>
                                <Table.Header className="px-3 py-2 paragraph-xs">Description</Table.Header>
                                <Table.Header className="px-3 py-2 paragraph-xs w-40">Color</Table.Header>
                            </Table.Row>
                        </Table.Head>
                        <Table.Body>
                            {state.draft.map(row => (
                                <Table.Row key={row.id}>
                                    <Table.Cell className="px-2 py-1.5">
                                        <Input
                                            style="ghost"
                                            value={row.name}
                                            placeholder="Department name"
                                            onChange={e => actions.updateField(row.id, 'name', e.target.value)}
                                        />
                                    </Table.Cell>
                                    <Table.Cell className="px-2 py-1.5">
                                        <Input
                                            style="ghost"
                                            value={row.description}
                                            placeholder="What this department covers"
                                            onChange={e => actions.updateField(row.id, 'description', e.target.value)}
                                        />
                                    </Table.Cell>
                                    <Table.Cell className="px-2 py-1.5">
                                        <Dropdown.Root placement="bottom-start">
                                            <Dropdown.Trigger>
                                                <span className="inline-flex items-center gap-2 cursor-pointer hover:text-brand">
                                                    <Indicator color={badgeColor(row.colorKey)} className="size-4 shrink-0" />
                                                    <span className="paragraph-sm text-primary capitalize">{row.colorKey}</span>
                                                </span>
                                            </Dropdown.Trigger>
                                            <Dropdown.Panel>
                                                {COLOR_OPTIONS.map(c => (
                                                    <Dropdown.Item key={c} onSelect={() => actions.updateField(row.id, 'colorKey', c)}>
                                                        <Indicator color={badgeColor(c)} className="size-4 shrink-0" />
                                                        <span className="capitalize">{c}</span>
                                                    </Dropdown.Item>
                                                ))}
                                            </Dropdown.Panel>
                                        </Dropdown.Root>
                                    </Table.Cell>
                                </Table.Row>
                            ))}
                        </Table.Body>
                    </Table>
                </div>
            )}
        </div>
    )
}
