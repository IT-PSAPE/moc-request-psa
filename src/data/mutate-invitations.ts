import { supabase } from '@/lib/supabase'
import { getCurrentContext } from './store/current-context'
import type { DepartmentRole } from '@/types/departments'

export type InviteDepartmentAssignment = {
    departmentId: string
    role: DepartmentRole
}

export type InviteMemberInput = {
    email: string
    name?: string | null
    workspaceRoleId: string
    departmentAssignments?: InviteDepartmentAssignment[]
}

export type InviteResult =
    | { ok: true; mode: 'invited_new' | 'added_existing'; userId: string | null }
    | { ok: false; error: string; alreadyMemberStatus?: string }

async function callInviteEndpoint<TResult>(body: Record<string, unknown>): Promise<TResult> {
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token
    if (!token) throw new Error('Not signed in')

    const response = await fetch('/api/invite-member', {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
    })

    let payload: unknown = null
    try { payload = await response.json() } catch { /* empty body */ }

    if (!response.ok) {
        const errMessage = payload && typeof payload === 'object' && 'error' in payload
            ? String((payload as { error: unknown }).error)
            : `Request failed (${response.status})`
        throw new Error(errMessage)
    }
    return payload as TResult
}

export async function inviteWorkspaceMember(input: InviteMemberInput): Promise<InviteResult> {
    const ctx = getCurrentContext()
    if (!ctx.activeWorkspaceId) throw new Error('No active workspace')

    try {
        const result = await callInviteEndpoint<{ ok: boolean; mode?: string; user_id?: string | null }>({
            action: 'invite',
            workspace_id: ctx.activeWorkspaceId,
            email: input.email,
            name: input.name ?? null,
            workspace_role_id: input.workspaceRoleId,
            department_assignments: (input.departmentAssignments ?? []).map(d => ({
                department_id: d.departmentId,
                role: d.role,
            })),
        })
        if (!result.ok) return { ok: false, error: 'Invite failed' }
        return {
            ok: true,
            mode: (result.mode as 'invited_new' | 'added_existing'),
            userId: result.user_id ?? null,
        }
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Invite failed'
        if (message === 'already_member') {
            return { ok: false, error: 'already_member' }
        }
        return { ok: false, error: message }
    }
}

export async function resendWorkspaceInvitation(userId: string): Promise<void> {
    const ctx = getCurrentContext()
    if (!ctx.activeWorkspaceId) throw new Error('No active workspace')
    await callInviteEndpoint({
        action: 'resend',
        workspace_id: ctx.activeWorkspaceId,
        user_id: userId,
    })
}
