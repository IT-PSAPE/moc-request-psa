import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Building2, ChevronDown, X } from 'lucide-react'
import { Modal } from '@/components/overlays/modal'
import { Button } from '@/components/controls/button'
import { Input } from '@/components/form/input'
import { Textarea } from '@/components/form/textarea'
import { FormLabel } from '@/components/form/form-label'
import { Dropdown } from '@/components/overlays/dropdown'
import { Indicator } from '@/components/display/indicator'
import { Label } from '@/components/display/text'
import { badgeColor } from '@/lib/color-keys'

const COLOR_OPTIONS = ['blue', 'purple', 'green', 'orange', 'red', 'yellow', 'teal', 'pink', 'gray'] as const

export type DepartmentCreateValues = {
    name: string
    description: string
    colorKey: string
}

type DepartmentCreateModalProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSubmit: (values: DepartmentCreateValues) => Promise<void>
}

export function DepartmentCreateModal({ open, onOpenChange, onSubmit }: DepartmentCreateModalProps) {
    const nameRef = useRef<HTMLInputElement>(null)
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [colorKey, setColorKey] = useState<string>('blue')
    const [busy, setBusy] = useState(false)

    useEffect(() => {
        if (open) {
            setName('')
            setDescription('')
            setColorKey('blue')
            setBusy(false)
            setTimeout(() => nameRef.current?.focus(), 50)
        }
    }, [open])

    function handleClose() {
        if (busy) return
        onOpenChange(false)
    }

    async function handleSubmit(e: FormEvent) {
        e.preventDefault()
        if (!name.trim()) return
        setBusy(true)
        try {
            await onSubmit({ name: name.trim(), description: description.trim(), colorKey })
            onOpenChange(false)
        } finally {
            setBusy(false)
        }
    }

    return (
        <Modal.Root open={open} onOpenChange={onOpenChange}>
            <Modal.Portal>
                <Modal.Backdrop />
                <Modal.Positioner>
                    <Modal.Panel className="!max-w-md w-full">
                        <Modal.Header>
                            <Building2 className="size-4 text-tertiary shrink-0" />
                            <Label.lg className="flex-1">New department</Label.lg>
                            <Button.Icon icon={<X />} variant="ghost" aria-label="Close" onClick={handleClose} />
                        </Modal.Header>

                        <form onSubmit={handleSubmit}>
                            <Modal.Content className="space-y-4">
                                <div className="space-y-1">
                                    <FormLabel label="Name" required />
                                    <Input
                                        ref={nameRef}
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        placeholder="Department name"
                                        required
                                    />
                                </div>

                                <div className="space-y-1">
                                    <FormLabel label="Description" optional />
                                    <Textarea
                                        value={description}
                                        onChange={e => setDescription(e.target.value)}
                                        placeholder="What this department covers"
                                        rows={2}
                                    />
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
                            </Modal.Content>

                            <Modal.Footer>
                                <Button type="button" variant="secondary" onClick={handleClose} disabled={busy} className="flex-1">
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={!name.trim() || busy} className="flex-1">
                                    {busy ? 'Creating…' : 'Create department'}
                                </Button>
                            </Modal.Footer>
                        </form>
                    </Modal.Panel>
                </Modal.Positioner>
            </Modal.Portal>
        </Modal.Root>
    )
}
