import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { ChevronDown, Tag, X } from 'lucide-react'
import { Modal } from '@/components/overlays/modal'
import { Button } from '@/components/controls/button'
import { Input } from '@/components/form/input'
import { FormLabel } from '@/components/form/form-label'
import { Checkbox } from '@/components/form/checkbox'
import { Dropdown } from '@/components/overlays/dropdown'
import { Indicator } from '@/components/display/indicator'
import { Label, Paragraph } from '@/components/display/text'
import { badgeColor } from '@/lib/color-keys'
import type { Department } from '@/types/departments'

const COLOR_OPTIONS = ['blue', 'purple', 'green', 'orange', 'red', 'yellow', 'teal', 'pink', 'gray'] as const

export type CategoryCreateValues = {
    label: string
    colorKey: string
    defaultDepartmentId: string
    isActive: boolean
}

type CategoryCreateModalProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    departments: Department[]
    onSubmit: (values: CategoryCreateValues) => Promise<void>
}

export function CategoryCreateModal({ open, onOpenChange, departments, onSubmit }: CategoryCreateModalProps) {
    const labelRef = useRef<HTMLInputElement>(null)
    const [label, setLabel] = useState('')
    const [colorKey, setColorKey] = useState<string>('blue')
    const [defaultDepartmentId, setDefaultDepartmentId] = useState<string>('')
    const [isActive, setIsActive] = useState(true)
    const [busy, setBusy] = useState(false)

    useEffect(() => {
        if (open) {
            setLabel('')
            setColorKey('blue')
            setDefaultDepartmentId(departments[0]?.id ?? '')
            setIsActive(true)
            setBusy(false)
            setTimeout(() => labelRef.current?.focus(), 50)
        }
    }, [open, departments])

    function handleClose() {
        if (busy) return
        onOpenChange(false)
    }

    async function handleSubmit(e: FormEvent) {
        e.preventDefault()
        if (!label.trim() || !defaultDepartmentId) return
        setBusy(true)
        try {
            await onSubmit({
                label: label.trim(),
                colorKey,
                defaultDepartmentId,
                isActive,
            })
            onOpenChange(false)
        } finally {
            setBusy(false)
        }
    }

    const selectedDept = departments.find(d => d.id === defaultDepartmentId)
    const noDepartments = departments.length === 0

    return (
        <Modal.Root open={open} onOpenChange={onOpenChange}>
            <Modal.Portal>
                <Modal.Backdrop />
                <Modal.Positioner>
                    <Modal.Panel className="!max-w-md w-full">
                        <Modal.Header>
                            <Tag className="size-4 text-tertiary shrink-0" />
                            <Label.lg className="flex-1">New category</Label.lg>
                            <Button.Icon icon={<X />} variant="ghost" aria-label="Close" onClick={handleClose} />
                        </Modal.Header>

                        <form onSubmit={handleSubmit}>
                            <Modal.Content className="space-y-4">
                                {noDepartments && (
                                    <div className="rounded-lg border border-warning bg-warning_subtle p-3">
                                        <Paragraph.sm className="text-warning">
                                            Create at least one department first — categories must route to a department.
                                        </Paragraph.sm>
                                    </div>
                                )}

                                <div className="space-y-1">
                                    <FormLabel label="Label" required />
                                    <Input
                                        ref={labelRef}
                                        value={label}
                                        onChange={e => setLabel(e.target.value)}
                                        placeholder="Category label"
                                        required
                                        disabled={noDepartments}
                                    />
                                </div>

                                <div className="space-y-1">
                                    <FormLabel label="Routes to" required />
                                    <Dropdown.Root placement="bottom-start" className="w-full">
                                        <Dropdown.Trigger className="w-full">
                                            <span className="flex w-full items-center gap-2 cursor-pointer rounded-lg border border-secondary px-3 py-2 hover:bg-secondary">
                                                <span className="paragraph-sm text-primary flex-1 text-left">
                                                    {selectedDept?.name ?? 'Pick a department'}
                                                </span>
                                                <ChevronDown className="size-4 text-tertiary shrink-0" />
                                            </span>
                                        </Dropdown.Trigger>
                                        <Dropdown.Panel>
                                            {departments.map(d => (
                                                <Dropdown.Item key={d.id} onSelect={() => setDefaultDepartmentId(d.id)}>
                                                    {d.name}
                                                </Dropdown.Item>
                                            ))}
                                        </Dropdown.Panel>
                                    </Dropdown.Root>
                                </div>

                                <div className="space-y-1">
                                    <FormLabel label="Color" />
                                    <Dropdown.Root placement="bottom-start" className="w-full">
                                        <Dropdown.Trigger className="w-full">
                                            <span className="flex w-full items-center gap-2 cursor-pointer rounded-lg border border-secondary px-3 py-2 hover:bg-secondary">
                                                <Indicator color={badgeColor(colorKey)} className="size-4 shrink-0" />
                                                <span className="paragraph-sm text-primary capitalize flex-1 text-left">{colorKey}</span>
                                                <ChevronDown className="size-4 text-tertiary shrink-0" />
                                            </span>
                                        </Dropdown.Trigger>
                                        <Dropdown.Panel>
                                            {COLOR_OPTIONS.map(c => (
                                                <Dropdown.Item key={c} onSelect={() => setColorKey(c)}>
                                                    <Indicator color={badgeColor(c)} className="size-4 shrink-0" />
                                                    <span className="capitalize">{c}</span>
                                                </Dropdown.Item>
                                            ))}
                                        </Dropdown.Panel>
                                    </Dropdown.Root>
                                </div>

                                <label className="flex items-center gap-2 cursor-pointer">
                                    <Checkbox
                                        checked={isActive}
                                        onChange={e => setIsActive(e.target.checked)}
                                    />
                                    <span className="paragraph-sm text-primary">Active on the public submission form</span>
                                </label>
                            </Modal.Content>

                            <Modal.Footer>
                                <Button type="button" variant="secondary" onClick={handleClose} disabled={busy} className="flex-1">
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={!label.trim() || !defaultDepartmentId || busy} className="flex-1">
                                    {busy ? 'Creating…' : 'Create category'}
                                </Button>
                            </Modal.Footer>
                        </form>
                    </Modal.Panel>
                </Modal.Positioner>
            </Modal.Portal>
        </Modal.Root>
    )
}
