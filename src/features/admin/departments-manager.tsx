import { useState } from 'react'
import { ChevronDown, Plus, Save } from 'lucide-react'
import { Button } from '@/components/controls/button'
import { Input } from '@/components/form/input'
import { Textarea } from '@/components/form/textarea'
import { FormField } from '@/components/form/form-label'
import { Indicator } from '@/components/display/indicator'
import { Paragraph, Title } from '@/components/display/text'
import { Dropdown } from '@/components/overlays/dropdown'
import { Tabs } from '@/components/layout/tabs'
import { useFeedback } from '@/components/feedback/feedback-provider'
import { createDepartment } from '@/data/mutate-departments'
import { badgeColor } from '@/lib/color-keys'
import { getErrorMessage } from '@/utils/get-error-message'
import { useDepartmentsEditor } from './use-departments-editor'
import { useDirtyBlocker } from './use-dirty-blocker'
import { DepartmentCreateModal, type DepartmentCreateValues } from './department-create-modal'
import { DepartmentMembersTable } from './department-members-table'
import type { Department } from '@/types/departments'
import type { ResolvedMember } from '@/data/fetch-workspace-members'
import type { WorkspaceRole } from '@/types/workspaces'

const COLOR_OPTIONS = ['blue', 'purple', 'green', 'orange', 'red', 'yellow', 'teal', 'pink', 'gray'] as const

type DepartmentsManagerProps = {
    departments: Department[]
    members: ResolvedMember[]
    activeMembers: ResolvedMember[]
    roles: WorkspaceRole[]
    onSaved: () => Promise<void>
}

export function DepartmentsManager({ departments, members, activeMembers, roles, onSaved }: DepartmentsManagerProps) {
    const { toast } = useFeedback()
    const { state, actions } = useDepartmentsEditor(departments)
    const [createOpen, setCreateOpen] = useState(false)
    const [activeTab, setActiveTab] = useState<string>('')

    const effectiveTab = departments.some(d => d.id === activeTab)
        ? activeTab
        : departments[0]?.id ?? ''

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

    async function handleCreate(values: DepartmentCreateValues) {
        try {
            await createDepartment({
                name: values.name,
                description: values.description || null,
                colorKey: values.colorKey,
            })
            await onSaved()
            toast({ title: 'Department created', variant: 'success' })
        } catch (err) {
            toast({ title: 'Create failed', description: getErrorMessage(err, 'Could not create.'), variant: 'error' })
            throw err
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-end justify-between">
                <div className="space-y-1">
                    <Title.h6>Departments</Title.h6>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="secondary" icon={<Plus />} onClick={() => setCreateOpen(true)} disabled={state.isSaving}>
                        New department
                    </Button>
                    {state.isDirty && (
                        <Button icon={<Save />} onClick={handleSave} disabled={state.isSaving}>
                            {state.isSaving ? 'Saving…' : 'Save changes'}
                        </Button>
                    )}
                </div>
            </div>

            <DepartmentCreateModal
                open={createOpen}
                onOpenChange={setCreateOpen}
                onSubmit={handleCreate}
            />

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
                <Tabs.Root value={effectiveTab} onValueChange={setActiveTab}>
                    <Tabs.List>
                        {state.draft.map(d => {
                            const original = departments.find(x => x.id === d.id)
                            return (
                                <Tabs.Tab key={d.id} value={d.id}>
                                    <span className="inline-flex items-center gap-2">
                                        <Indicator color={badgeColor(d.colorKey)} className="size-3 shrink-0" />
                                        <span>{d.name.trim() || original?.name || 'Untitled'}</span>
                                    </span>
                                </Tabs.Tab>
                            )
                        })}
                    </Tabs.List>

                    <Tabs.Panels className="pt-5">
                        {state.draft.map(draft => {
                            const dept = departments.find(d => d.id === draft.id)
                            if (!dept) return null
                            return (
                                <Tabs.Panel key={draft.id} value={draft.id} className="space-y-6">
                                    <div className="space-y-4">
                                        <FormField label="Name" required>
                                            <Input value={draft.name} placeholder="Department name" onChange={e => actions.updateField(draft.id, 'name', e.target.value)} />
                                        </FormField>
                                        <FormField label="Color" >
                                            <Dropdown.Root placement="bottom-start" className="w-full">
                                                <Dropdown.Trigger className="w-full">
                                                    <span className="flex w-full items-center gap-2 cursor-pointer rounded-lg border border-secondary px-3 py-2 hover:bg-secondary">
                                                        <Indicator color={badgeColor(draft.colorKey)} className="size-4 shrink-0" />
                                                        <span className="paragraph-sm text-primary capitalize flex-1 text-left">{draft.colorKey}</span>
                                                        <ChevronDown className="size-4 text-tertiary shrink-0" />
                                                    </span>
                                                </Dropdown.Trigger>
                                                <Dropdown.Panel>
                                                    {COLOR_OPTIONS.map(c => (
                                                        <Dropdown.Item key={c} onSelect={() => actions.updateField(draft.id, 'colorKey', c)}>
                                                            <Indicator color={badgeColor(c)} className="size-4 shrink-0" />
                                                            <span className="capitalize">{c}</span>
                                                        </Dropdown.Item>
                                                    ))}
                                                </Dropdown.Panel>
                                            </Dropdown.Root>
                                        </FormField>
                                        <FormField label="Description" optional >
                                            <Textarea value={draft.description} placeholder="What this department covers" rows={2} onChange={e => actions.updateField(draft.id, 'description', e.target.value)} />
                                        </FormField>
                                    </div>
                                    <DepartmentMembersTable
                                        department={dept}
                                        members={members}
                                        activeMembers={activeMembers}
                                        roles={roles}
                                        onChanged={onSaved}
                                    />
                                </Tabs.Panel>
                            )
                        })}
                    </Tabs.Panels>
                </Tabs.Root>
            )}
        </div>
    )
}
