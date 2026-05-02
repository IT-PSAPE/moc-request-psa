import { useState } from 'react'
import type { FormEvent } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/controls/button'
import { Avatar } from '@/components/display/avatar'
import { Label, Paragraph } from '@/components/display/text'
import { Input } from '@/components/form/input'
import { Spinner } from '@/components/feedback/spinner'
import { useFeedback } from '@/components/feedback/feedback-provider'
import { useConfirm } from '@/components/feedback/confirm-modal'
import { useAuth } from '@/lib/auth-context'
import { formatUtcIsoInBrowserTimeZone } from '@/utils/browser-date-time'
import { getErrorMessage } from '@/utils/get-error-message'
import { useRequestComments } from './use-request-comments'

type RequestCommentsProps = {
    requestId: string
}

export function RequestComments({ requestId }: RequestCommentsProps) {
    const { state: { profile } } = useAuth()
    const { toast } = useFeedback()
    const confirm = useConfirm()
    const { comments, loading, post, remove } = useRequestComments(requestId)
    const [body, setBody] = useState('')
    const [busy, setBusy] = useState(false)

    async function handleSubmit(e: FormEvent) {
        e.preventDefault()
        if (!body.trim()) return
        setBusy(true)
        try {
            await post(body)
            setBody('')
        } catch (err) {
            toast({ title: 'Could not post', description: getErrorMessage(err, 'Comment failed.'), variant: 'error' })
        } finally {
            setBusy(false)
        }
    }

    async function handleRemove(id: string) {
        const ok = await confirm({
            title: 'Delete this comment?',
            description: 'This is permanent and cannot be undone.',
            confirmLabel: 'Delete',
            intent: 'danger',
        })
        if (!ok) return
        try {
            await remove(id)
        } catch (err) {
            toast({ title: 'Delete failed', description: getErrorMessage(err, 'Could not delete.'), variant: 'error' })
        }
    }

    return (
        <div>
            <Label.md className="block pb-3">Internal comments</Label.md>

            {loading ? (
                <div className="flex justify-center py-4"><Spinner size="md" /></div>
            ) : comments.length === 0 ? (
                <Paragraph.sm className="text-quaternary">No comments yet.</Paragraph.sm>
            ) : (
                <div className="space-y-3">
                    {comments.map(c => (
                        <div key={c.id} className="flex gap-3">
                            <Avatar.initials size="md" name={c.authorInitials} />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <Label.sm>{c.authorName}</Label.sm>
                                    <Paragraph.xs className="text-quaternary">
                                        {formatUtcIsoInBrowserTimeZone(c.createdAt)}
                                    </Paragraph.xs>
                                    {profile?.id === c.authorId && (
                                        <button
                                            type="button"
                                            onClick={() => handleRemove(c.id)}
                                            className="ml-auto text-quaternary hover:text-error cursor-pointer"
                                            aria-label="Delete comment"
                                        >
                                            <Trash2 className="size-4" />
                                        </button>
                                    )}
                                </div>
                                <Paragraph.sm className="text-tertiary whitespace-pre-wrap">{c.body}</Paragraph.sm>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
                <Input
                    placeholder="Add a comment…"
                    value={body}
                    onChange={e => setBody(e.target.value)}
                    className="flex-1"
                />
                <Button type="submit" disabled={!body.trim() || busy}>
                    {busy ? 'Posting…' : 'Post'}
                </Button>
            </form>
        </div>
    )
}
