import { useEffect } from 'react'
import { useBlocker } from 'react-router-dom'
import { useConfirm } from '@/components/feedback/confirm-modal'

type UseDirtyBlockerOptions = {
    enabled: boolean
    title?: string
    description?: string
}

// Confirms with the user when they try to navigate away with unsaved changes.
// Also wires beforeunload for full page unloads / tab close.
export function useDirtyBlocker({ enabled, title, description }: UseDirtyBlockerOptions) {
    const confirm = useConfirm()
    const blocker = useBlocker(enabled)

    useEffect(() => {
        if (!enabled) return
        const onBeforeUnload = (event: BeforeUnloadEvent) => {
            event.preventDefault()
            event.returnValue = ''
        }
        window.addEventListener('beforeunload', onBeforeUnload)
        return () => window.removeEventListener('beforeunload', onBeforeUnload)
    }, [enabled])

    useEffect(() => {
        if (blocker.state !== 'blocked') return
        let cancelled = false
        confirm({
            title: title ?? 'Discard unsaved changes?',
            description: description ?? 'Your changes will be lost if you leave this page without saving.',
            confirmLabel: 'Discard',
            cancelLabel: 'Stay',
            intent: 'danger',
        }).then(ok => {
            if (cancelled) return
            if (ok) blocker.proceed?.()
            else blocker.reset?.()
        })
        return () => { cancelled = true }
    }, [blocker, confirm, title, description])
}
