import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { Modal } from '@/components/overlays/modal'
import { Button } from '@/components/controls/button'
import { Label, Paragraph } from '@/components/display/text'

export type ConfirmIntent = 'danger' | 'primary'

export type ConfirmOptions = {
    title: string
    description?: string
    confirmLabel?: string
    cancelLabel?: string
    intent?: ConfirmIntent
}

type Pending = ConfirmOptions & { resolve: (value: boolean) => void }

type ConfirmContextValue = (options: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmContextValue | null>(null)

export function ConfirmProvider({ children }: { children: ReactNode }) {
    const [pending, setPending] = useState<Pending | null>(null)

    const confirm = useCallback<ConfirmContextValue>((options) => {
        return new Promise<boolean>(resolve => {
            setPending({ ...options, resolve })
        })
    }, [])

    function handleResolve(value: boolean) {
        if (!pending) return
        pending.resolve(value)
        setPending(null)
    }

    const value = useMemo(() => confirm, [confirm])

    return (
        <ConfirmContext value={value}>
            {children}
            <Modal.Root open={pending !== null} onOpenChange={open => { if (!open) handleResolve(false) }}>
                <Modal.Portal>
                    <Modal.Backdrop />
                    <Modal.Positioner>
                        <Modal.Panel className="!max-w-md">
                            <Modal.Header>
                                <span className={pending?.intent === 'danger' ? 'text-error' : 'text-brand_secondary'}>
                                    <AlertTriangle className="size-5" />
                                </span>
                                <Label.lg>{pending?.title ?? 'Confirm'}</Label.lg>
                                <Modal.Close>
                                    <Button.Icon icon={<X />} variant="ghost" aria-label="Close" />
                                </Modal.Close>
                            </Modal.Header>
                            <Modal.Content>
                                {pending?.description && (
                                    <Paragraph.sm className="text-tertiary">{pending.description}</Paragraph.sm>
                                )}
                            </Modal.Content>
                            <Modal.Footer>
                                <Button variant="secondary" onClick={() => handleResolve(false)}>
                                    {pending?.cancelLabel ?? 'Cancel'}
                                </Button>
                                <Button
                                    variant={pending?.intent === 'danger' ? 'danger' : 'primary'}
                                    onClick={() => handleResolve(true)}
                                >
                                    {pending?.confirmLabel ?? 'Confirm'}
                                </Button>
                            </Modal.Footer>
                        </Modal.Panel>
                    </Modal.Positioner>
                </Modal.Portal>
            </Modal.Root>
        </ConfirmContext>
    )
}

export function useConfirm(): ConfirmContextValue {
    const ctx = useContext(ConfirmContext)
    if (!ctx) throw new Error('useConfirm must be used within a ConfirmProvider')
    return ctx
}
