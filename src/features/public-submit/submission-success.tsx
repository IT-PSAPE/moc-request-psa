import { useState } from 'react'
import { Check, Copy, ExternalLink } from 'lucide-react'
import { Button } from '@/components/controls/button'
import { Label, Paragraph } from '@/components/display/text'

type SubmissionSuccessProps = {
    trackingId: string
    workspaceName: string
    onSubmitAnother: () => void
}

export function SubmissionSuccess({ trackingId, workspaceName, onSubmitAnother }: SubmissionSuccessProps) {
    const trackingUrl = `${window.location.origin}/track/${trackingId}`
    const [copied, setCopied] = useState(false)

    async function handleCopy() {
        try {
            await navigator.clipboard.writeText(trackingUrl)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch {
            // Older browsers / iframes — silent fall-through
        }
    }

    return (
        <div className="space-y-5 text-center">
            <div className="mx-auto size-12 rounded-full bg-success_primary grid place-items-center text-success">
                <Check className="size-6" />
            </div>
            <div className="space-y-1">
                <Label.lg>Request submitted</Label.lg>
                <Paragraph.sm className="text-tertiary">
                    Thanks — the {workspaceName} team has been notified.
                </Paragraph.sm>
            </div>

            <div className="rounded-lg border border-secondary bg-secondary p-3 space-y-2">
                <Paragraph.xs className="text-quaternary uppercase tracking-wide">Your tracking ID</Paragraph.xs>
                <Label.lg className="font-mono">{trackingId}</Label.lg>
                <Paragraph.xs className="text-tertiary">
                    Save this link to check the status later.
                </Paragraph.xs>
                <div className="flex items-center justify-center gap-2 pt-1">
                    <Button variant="secondary" icon={copied ? <Check /> : <Copy />} onClick={handleCopy}>
                        {copied ? 'Copied' : 'Copy link'}
                    </Button>
                    <a href={`/track/${trackingId}`}>
                        <Button variant="ghost" icon={<ExternalLink />} iconPosition="trailing">
                            Open status page
                        </Button>
                    </a>
                </div>
            </div>

            <Button variant="secondary" className="w-full" onClick={onSubmitAnother}>
                Submit another request
            </Button>
        </div>
    )
}
