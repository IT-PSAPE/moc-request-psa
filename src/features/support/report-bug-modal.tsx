import { useState } from 'react'
import { Bug, Send, X } from 'lucide-react'
import { Modal } from '@/components/overlays/modal'
import { Button } from '@/components/controls/button'
import { Label, Paragraph } from '@/components/display/text'
import { useFeedback } from '@/components/feedback/feedback-provider'
import { useAuth } from '@/lib/auth-context'
import { useCurrentWorkspace } from '@/features/workspace/workspace-provider'
import { submitBugReport } from '@/data/mutate-bug-reports'
import { captureDeviceContext } from '@/utils/device-context'
import { getErrorMessage } from '@/utils/get-error-message'
import { cn } from '@/utils/cn'
import { BUG_REPORT_DESCRIPTION_MAX } from '@/types/bug-reports'

type ReportBugModalProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function ReportBugModal({ open, onOpenChange }: ReportBugModalProps) {
    const { state: { profile } } = useAuth()
    const { state: { workspace } } = useCurrentWorkspace()
    const { toast } = useFeedback()
    const [description, setDescription] = useState('')
    const [busy, setBusy] = useState(false)

    function handleOpenChange(next: boolean) {
        if (!next) {
            setDescription('')
            setBusy(false)
        }
        onOpenChange(next)
    }

    const remaining = BUG_REPORT_DESCRIPTION_MAX - description.length
    const overLimit = remaining < 0
    const trimmedLength = description.trim().length
    const canSubmit = trimmedLength > 0 && !overLimit && !busy

    async function handleSubmit() {
        if (!canSubmit) return
        setBusy(true)
        try {
            await submitBugReport({
                description,
                reporterId: profile?.id ?? null,
                reporterName: profile ? [profile.name, profile.surname].filter(Boolean).join(' ') : null,
                reporterEmail: profile?.email ?? null,
                workspaceId: workspace?.id ?? null,
                context: captureDeviceContext(),
            })
            toast({
                title: 'Bug report sent',
                description: 'Thanks — we read every one of these.',
                variant: 'success',
            })
            handleOpenChange(false)
        } catch (err) {
            toast({ title: 'Could not send report', description: getErrorMessage(err, 'Try again.'), variant: 'error' })
            setBusy(false)
        }
    }

    return (
        <Modal.Root open={open} onOpenChange={handleOpenChange}>
            <Modal.Portal>
                <Modal.Backdrop />
                <Modal.Positioner>
                    <Modal.Panel className="!max-w-lg">
                        <Modal.Header>
                            <span className="text-brand_secondary"><Bug className="size-5" /></span>
                            <Label.lg>Report a bug</Label.lg>
                            <Modal.Close>
                                <Button.Icon icon={<X />} variant="ghost" aria-label="Close" />
                            </Modal.Close>
                        </Modal.Header>
                        <Modal.Content>
                            <div className="space-y-3">
                                <Paragraph.sm className="text-tertiary">
                                    Tell us what you were trying to do and what went wrong. We automatically attach the
                                    page you're on, your browser, and screen size — no need to mention those.
                                </Paragraph.sm>

                                <div className="space-y-1">
                                    <textarea
                                        value={description}
                                        onChange={e => setDescription(e.target.value)}
                                        placeholder="What happened?"
                                        rows={6}
                                        autoFocus
                                        disabled={busy}
                                        className={cn(
                                            'w-full resize-y rounded-lg border border-secondary bg-primary p-3 paragraph-sm',
                                            'focus:border-brand focus:ring-3 focus:ring-border-brand/10 focus:outline-none',
                                            'disabled:cursor-not-allowed disabled:bg-disabled',
                                            overLimit && 'border-error focus:border-error focus:ring-border-error/10',
                                        )}
                                    />
                                    <div className="flex justify-end">
                                        <span className={cn(
                                            'paragraph-xs text-quaternary',
                                            overLimit && 'text-error',
                                        )}>
                                            {remaining.toLocaleString()} characters left
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </Modal.Content>
                        <Modal.Footer>
                            <Modal.Close>
                                <Button variant="secondary" disabled={busy}>Cancel</Button>
                            </Modal.Close>
                            <Button icon={<Send />} onClick={handleSubmit} disabled={!canSubmit}>
                                {busy ? 'Sending…' : 'Send report'}
                            </Button>
                        </Modal.Footer>
                    </Modal.Panel>
                </Modal.Positioner>
            </Modal.Portal>
        </Modal.Root>
    )
}
