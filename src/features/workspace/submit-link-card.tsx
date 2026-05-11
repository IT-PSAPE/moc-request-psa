import { useState } from 'react'
import { Check, Copy, ExternalLink, Link2 } from 'lucide-react'
import { Button } from '@/components/controls/button'
import { Input } from '@/components/form/input'
import { Label, Paragraph } from '@/components/display/text'
import { useFeedback } from '@/components/feedback/feedback-provider'
import { routes } from '@/screens/app-routes'

type SubmitLinkCardProps = {
    slug: string
    variant?: 'compact' | 'full'
}

function buildSubmitUrl(slug: string): string {
    const path = routes.submit.replace(':workspaceSlug', slug)
    if (typeof window === 'undefined') return `/${path}`
    return `${window.location.origin}/${path}`
}

export function SubmitLinkCard({ slug, variant = 'full' }: SubmitLinkCardProps) {
    const { toast } = useFeedback()
    const [copied, setCopied] = useState(false)
    const url = buildSubmitUrl(slug)

    async function handleCopy() {
        try {
            await navigator.clipboard.writeText(url)
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
        } catch {
            toast({ title: 'Could not copy', description: 'Select and copy the link manually.', variant: 'error' })
        }
    }

    if (variant === 'compact') {
        return (
            <div className="rounded-lg border border-secondary bg-primary px-3 py-2.5">
                <div className="flex items-center gap-3">
                    <Link2 className="size-4 text-tertiary shrink-0" />
                    <div className="min-w-0 flex-1">
                        <Label.sm className="block">Public submit link</Label.sm>
                        <Paragraph.xs className="text-quaternary truncate">{url}</Paragraph.xs>
                    </div>
                    <Button
                        variant="secondary"
                        icon={copied ? <Check /> : <Copy />}
                        onClick={handleCopy}
                    >
                        {copied ? 'Copied' : 'Copy'}
                    </Button>
                    <Button.Icon
                        variant="ghost"
                        icon={<ExternalLink />}
                        aria-label="Open submit page"
                        onClick={() => window.open(url, '_blank', 'noopener')}
                    />
                </div>
            </div>
        )
    }

    return (
        <div className="rounded-lg border border-secondary bg-primary p-4 space-y-3">
            <div className="space-y-1">
                <Label.md>Public submit link</Label.md>
                <Paragraph.sm className="text-tertiary">
                    Anyone with this link can submit a request to your workspace. Share it on your website,
                    print it on a poster, or paste it anywhere intake forms make sense.
                </Paragraph.sm>
            </div>
            <div className="flex items-center gap-2">
                <Input value={url} readOnly className="flex-1" />
                <Button
                    variant="secondary"
                    icon={copied ? <Check /> : <Copy />}
                    onClick={handleCopy}
                >
                    {copied ? 'Copied' : 'Copy'}
                </Button>
                <Button.Icon
                    variant="ghost"
                    icon={<ExternalLink />}
                    aria-label="Open submit page"
                    onClick={() => window.open(url, '_blank', 'noopener')}
                />
            </div>
        </div>
    )
}
