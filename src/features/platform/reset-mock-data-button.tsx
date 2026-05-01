import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { Button } from '@/components/controls/button'
import { useConfirm } from '@/components/feedback/confirm-modal'
import { resetMockData } from '@/data/store/reset'

export function ResetMockDataButton() {
    const confirm = useConfirm()
    const [busy, setBusy] = useState(false)

    async function handleReset() {
        const ok = await confirm({
            title: 'Reset all mock data?',
            description: 'Any locally created workspaces, departments, categories, requests, comments, and activity logs will be wiped and re-seeded from JSON.',
            confirmLabel: 'Reset',
            intent: 'danger',
        })
        if (!ok) return
        setBusy(true)
        resetMockData()
    }

    return (
        <Button variant="danger-secondary" icon={<RotateCcw />} onClick={handleReset} disabled={busy}>
            {busy ? 'Resetting…' : 'Reset mock data'}
        </Button>
    )
}
