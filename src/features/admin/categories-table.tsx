import { Plus, Save } from 'lucide-react'
import { Button } from '@/components/controls/button'
import { Table } from '@/components/display/table'
import { Input } from '@/components/form/input'
import { Select } from '@/components/form/select'
import { Checkbox } from '@/components/form/checkbox'
import { Indicator } from '@/components/display/indicator'
import { Paragraph } from '@/components/display/text'
import { useFeedback } from '@/components/feedback/feedback-provider'
import { badgeColor } from '@/lib/color-keys'
import { getErrorMessage } from '@/utils/get-error-message'
import { useCategoriesEditor } from './use-categories-editor'
import { useDirtyBlocker } from './use-dirty-blocker'
import type { Category } from '@/types/categories'
import type { Department } from '@/types/departments'

const COLOR_OPTIONS = ['blue', 'purple', 'green', 'orange', 'red', 'yellow', 'teal', 'pink', 'gray'] as const

type CategoriesTableProps = {
    categories: Category[]
    departments: Department[]
    onSaved: () => Promise<void>
}

export function CategoriesTable({ categories, departments, onSaved }: CategoriesTableProps) {
    const { toast } = useFeedback()
    const { state, actions } = useCategoriesEditor(categories)

    useDirtyBlocker({
        enabled: state.isDirty,
        title: 'Discard category changes?',
        description: 'You have unsaved edits to your categories. Leave the page and lose them?',
    })

    async function handleSave() {
        try {
            await actions.save(onSaved)
            toast({ title: 'Categories saved', variant: 'success' })
        } catch (err) {
            toast({ title: 'Save failed', description: getErrorMessage(err, 'Could not save.'), variant: 'error' })
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-end justify-between">
                <div className="space-y-1">
                    <h2 className="title-h6">Categories</h2>
                    <p className="paragraph-sm text-tertiary">
                        Categories appear on the public submission form. Each one routes to a default department.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="secondary" icon={<Plus />} onClick={actions.addRow} disabled={state.isSaving}>
                        New category
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
                        No categories yet. Click <span className="text-primary font-medium">New category</span> to add one.
                    </Paragraph.sm>
                </div>
            ) : (
                <div className="overflow-x-auto rounded-lg border border-secondary bg-primary">
                    <Table className="w-full">
                        <Table.Head>
                            <Table.Row>
                                <Table.Header className="px-3 py-2 paragraph-xs">Label</Table.Header>
                                <Table.Header className="px-3 py-2 paragraph-xs">Routes to</Table.Header>
                                <Table.Header className="px-3 py-2 paragraph-xs w-40">Color</Table.Header>
                                <Table.Header className="px-3 py-2 paragraph-xs w-24">Active</Table.Header>
                            </Table.Row>
                        </Table.Head>
                        <Table.Body>
                            {state.draft.map(row => (
                                <Table.Row key={row.id}>
                                    <Table.Cell className="px-2 py-1.5">
                                        <Input
                                            style="ghost"
                                            value={row.label}
                                            placeholder="Category label"
                                            onChange={e => actions.updateField(row.id, { label: e.target.value })}
                                        />
                                    </Table.Cell>
                                    <Table.Cell className="px-2 py-1.5">
                                        <Select
                                            style="ghost"
                                            value={row.defaultDepartmentId ?? ''}
                                            onChange={e => actions.updateField(row.id, { defaultDepartmentId: e.target.value || null })}
                                        >
                                            <option value="">— Unrouted —</option>
                                            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                        </Select>
                                    </Table.Cell>
                                    <Table.Cell className="px-2 py-1.5">
                                        <div className="flex items-center gap-2">
                                            <Indicator color={badgeColor(row.colorKey)} className="size-5 shrink-0" />
                                            <Select
                                                style="ghost"
                                                value={row.colorKey}
                                                onChange={e => actions.updateField(row.id, { colorKey: e.target.value })}
                                                className="!w-auto"
                                            >
                                                {COLOR_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                                            </Select>
                                        </div>
                                    </Table.Cell>
                                    <Table.Cell className="px-2 py-1.5 text-center">
                                        <Checkbox
                                            checked={row.isActive}
                                            onChange={e => actions.updateField(row.id, { isActive: e.target.checked })}
                                        />
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
