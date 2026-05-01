import { useState } from 'react'
import { Select } from '@/components/form/select'
import { useFeedback } from '@/components/feedback/feedback-provider'
import { useConfirm } from '@/components/feedback/confirm-modal'
import { setMemberStatus } from '@/data/mutate-workspace-members'
import { getErrorMessage } from '@/utils/get-error-message'
import type { MemberStatus, Profile } from '@/types/profiles'
import type { WorkspaceRole } from '@/types/workspaces'

const STATUS_LABELS: Record<MemberStatus, string> = {
    pending: 'Pending',
    active: 'Active',
    rejected: 'Rejected',
    suspended: 'Suspended',
}

const STATUS_ORDER: MemberStatus[] = ['pending', 'active', 'rejected', 'suspended']

const TRANSITION_COPY: Partial<Record<MemberStatus, { title: (name: string) => string; description: string; intent?: 'danger' | 'primary' }>> = {
    active: {
        title: name => `Approve ${name}?`,
        description: 'They will gain access to the workspace immediately.',
    },
    rejected: {
        title: name => `Reject ${name}'s request?`,
        description: 'Their record stays in the system but they cannot access the workspace.',
        intent: 'danger',
    },
    suspended: {
        title: name => `Suspend ${name}?`,
        description: 'They will lose workspace access until you reactivate them.',
        intent: 'danger',
    },
    pending: {
        title: name => `Re-open ${name}'s request as pending?`,
        description: 'Their status will return to pending so you can approve or reject again.',
    },
}

type MemberStatusSelectProps = {
    membershipId: string
    profile: Profile
    status: MemberStatus
    roles: WorkspaceRole[]
    onChanged: () => Promise<void>
}

export function MemberStatusSelect({ membershipId, profile, status, roles, onChanged }: MemberStatusSelectProps) {
    const { toast } = useFeedback()
    const confirm = useConfirm()
    const [busy, setBusy] = useState(false)

    async function handleChange(next: MemberStatus) {
        if (next === status) return

        const copy = TRANSITION_COPY[next]
        if (copy) {
            const ok = await confirm({
                title: copy.title([profile.name, profile.surname].filter(Boolean).join(' ')),
                description: copy.description,
                confirmLabel: STATUS_LABELS[next],
                intent: copy.intent,
            })
            if (!ok) return
        }

        setBusy(true)
        try {
            await setMemberStatus(membershipId, next, { fallbackRoleId: roles[0]?.id })
            toast({ title: `Status set to ${STATUS_LABELS[next]}`, variant: 'success' })
            await onChanged()
        } catch (err) {
            toast({ title: 'Status update failed', description: getErrorMessage(err, 'Could not update.'), variant: 'error' })
        } finally {
            setBusy(false)
        }
    }

    return (
        <Select
            style="ghost"
            value={status}
            onChange={e => handleChange(e.target.value as MemberStatus)}
            disabled={busy}
            className="!w-auto min-w-28"
        >
            {STATUS_ORDER.map(s => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
        </Select>
    )
}
