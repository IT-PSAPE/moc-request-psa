// POST /api/invite-member
//
// Modes:
//   action="invite"  → invite a brand-new user, OR add an existing auth user
//                      directly to the workspace as 'active' if they already
//                      have an account elsewhere.
//   action="resend"  → resend the invite email for an unaccepted 'invited'
//                      member. The membership row already exists.
//
// Auth: caller passes their Supabase access token in the Authorization header.
// Permission: caller must be a workspace admin (canManageRoles) of the target
// workspace OR a platform admin.
//
// Required env (set on Vercel):
//   VITE_SUPABASE_URL       (shared with the client build)
//   SUPABASE_SECRET_KEY     (server-only, sb_secret_… — replaces the legacy SUPABASE_SERVICE_ROLE_KEY)
//   APP_PUBLIC_URL          (used as the redirectTo for the magic link)

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export const config = { runtime: 'edge' }

type DepartmentAssignment = { department_id: string; role: 'member' | 'lead' }

type InvitePayload = {
    action: 'invite'
    email: string
    name?: string | null
    workspace_id: string
    workspace_role_id: string
    department_assignments?: DepartmentAssignment[]
}

type ResendPayload = {
    action: 'resend'
    workspace_id: string
    user_id: string
}

type Payload = InvitePayload | ResendPayload

function getRequiredEnv(name: string): string {
    const value = process.env[name]?.trim()
    if (!value) throw new Error(`Missing ${name}`)
    return value
}

function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            'content-type': 'application/json; charset=utf-8',
            'cache-control': 'no-store',
        },
    })
}

function cleanEmail(raw: string): string {
    return raw.trim().toLowerCase()
}

function getAppPublicUrl(request: Request): string {
    const configured = process.env.APP_PUBLIC_URL?.trim()
    if (configured) return configured.replace(/\/$/, '')
    return new URL('/', request.url).toString().replace(/\/$/, '')
}

async function findUserByEmail(admin: SupabaseClient, email: string): Promise<{ id: string } | null> {
    const cleaned = cleanEmail(email)
    let page = 1
    while (true) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
        if (error) throw new Error(error.message)
        const hit = data.users.find(u => (u.email ?? '').toLowerCase() === cleaned)
        if (hit) return { id: hit.id }
        if (data.users.length < 200) return null
        page += 1
        if (page > 50) return null // safety bound
    }
}

class HttpError extends Error {
    status: number
    constructor(status: number, message: string) {
        super(message)
        this.status = status
    }
}

async function ensureCallerIsWorkspaceAdmin(
    callerToken: string,
    admin: SupabaseClient,
    workspaceId: string,
): Promise<{ userId: string }> {
    const supabaseUrl = getRequiredEnv('VITE_SUPABASE_URL')
    const secretKey = getRequiredEnv('SUPABASE_SECRET_KEY')
    const userClient = createClient(supabaseUrl, secretKey, {
        global: { headers: { Authorization: `Bearer ${callerToken}` } },
        auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data: userResult, error: userError } = await userClient.auth.getUser(callerToken)
    if (userError || !userResult.user) throw new HttpError(401, 'Unauthorized')
    const callerId = userResult.user.id

    // Platform-admin shortcut.
    const { data: profile } = await admin
        .from('profiles')
        .select('is_platform_admin')
        .eq('id', callerId)
        .maybeSingle()
    if (profile && (profile as { is_platform_admin?: boolean }).is_platform_admin) {
        return { userId: callerId }
    }

    const { data: membership, error: memError } = await admin
        .from('workspace_members')
        .select('workspace_role_id, status, workspace_roles!workspace_members_workspace_role_id_fkey(can_manage_roles)')
        .eq('workspace_id', workspaceId)
        .eq('user_id', callerId)
        .eq('status', 'active')
        .maybeSingle()
    if (memError) throw new Error(memError.message)

    const role = membership && (membership as { workspace_roles?: { can_manage_roles?: boolean } | null }).workspace_roles
    if (!role || !role.can_manage_roles) {
        throw new HttpError(403, 'Forbidden: workspace admin required')
    }
    return { userId: callerId }
}

async function handleInvite(admin: SupabaseClient, payload: InvitePayload, redirectTo: string): Promise<Response> {
    const email = cleanEmail(payload.email)
    if (!email || !email.includes('@')) return jsonResponse({ error: 'Invalid email' }, 400)
    if (!payload.workspace_role_id) return jsonResponse({ error: 'workspace_role_id required' }, 400)

    const { data: roleRow, error: roleError } = await admin
        .from('workspace_roles')
        .select('id')
        .eq('id', payload.workspace_role_id)
        .eq('workspace_id', payload.workspace_id)
        .maybeSingle()
    if (roleError) return jsonResponse({ error: roleError.message }, 500)
    if (!roleRow) return jsonResponse({ error: 'Workspace role does not belong to this workspace' }, 400)

    const departmentAssignments = (payload.department_assignments ?? []).filter(d => d.department_id)

    const existing = await findUserByEmail(admin, email)

    if (existing) {
        const { data: alreadyMember, error: amError } = await admin
            .from('workspace_members')
            .select('id, status')
            .eq('workspace_id', payload.workspace_id)
            .eq('user_id', existing.id)
            .maybeSingle()
        if (amError) return jsonResponse({ error: amError.message }, 500)
        if (alreadyMember) {
            return jsonResponse({
                error: 'already_member',
                status: (alreadyMember as { status: string }).status,
            }, 409)
        }

        // Existing auth user, not in this workspace → add directly as 'active'.
        const { error: insertError } = await admin
            .from('workspace_members')
            .insert({
                workspace_id: payload.workspace_id,
                user_id: existing.id,
                status: 'active',
                workspace_role_id: payload.workspace_role_id,
                approved_at: new Date().toISOString(),
            })
        if (insertError) return jsonResponse({ error: insertError.message }, 500)

        if (departmentAssignments.length > 0) {
            const { error: dmError } = await admin
                .from('department_members')
                .insert(departmentAssignments.map(d => ({
                    department_id: d.department_id,
                    user_id: existing.id,
                    role: d.role,
                })))
            if (dmError) return jsonResponse({ error: dmError.message }, 500)
        }

        return jsonResponse({ ok: true, mode: 'added_existing', user_id: existing.id })
    }

    // Brand-new user → Supabase invite. The handle_new_user trigger reads our
    // metadata and creates the workspace_member ('invited') + department_members.
    const metadata: Record<string, unknown> = {
        invite_workspace_id: payload.workspace_id,
        invite_workspace_role_id: payload.workspace_role_id,
        invite_department_assignments: departmentAssignments,
    }
    if (payload.name && payload.name.trim()) metadata.name = payload.name.trim()

    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
        data: metadata,
        redirectTo: `${redirectTo}/accept-invitation`,
    })
    if (error) return jsonResponse({ error: error.message }, 500)
    return jsonResponse({ ok: true, mode: 'invited_new', user_id: data.user?.id })
}

async function handleResend(admin: SupabaseClient, payload: ResendPayload, redirectTo: string): Promise<Response> {
    const { data: membership, error: memError } = await admin
        .from('workspace_members')
        .select('user_id, status')
        .eq('workspace_id', payload.workspace_id)
        .eq('user_id', payload.user_id)
        .maybeSingle()
    if (memError) return jsonResponse({ error: memError.message }, 500)
    if (!membership) return jsonResponse({ error: 'Membership not found' }, 404)
    if ((membership as { status: string }).status !== 'invited') {
        return jsonResponse({ error: 'Only invited members can be resent' }, 400)
    }

    const { data: userResult, error: userError } = await admin.auth.admin.getUserById(payload.user_id)
    if (userError || !userResult?.user?.email) return jsonResponse({ error: 'Invitee account not found' }, 404)
    const email = userResult.user.email

    const adminAuth = admin.auth.admin as unknown as {
        generateLink?: (args: { type: string; email: string; options?: { redirectTo?: string } }) => Promise<{ error: { message: string } | null }>
    }
    if (typeof adminAuth.generateLink === 'function') {
        const { error } = await adminAuth.generateLink({
            type: 'invite',
            email,
            options: { redirectTo: `${redirectTo}/accept-invitation` },
        })
        if (error) return jsonResponse({ error: error.message }, 500)
        return jsonResponse({ ok: true, mode: 'resent' })
    }
    return jsonResponse({ error: 'Resend not supported by this SDK version' }, 500)
}

export default async function handler(request: Request): Promise<Response> {
    if (request.method !== 'POST') {
        return jsonResponse({ error: 'Method not allowed' }, 405)
    }

    const auth = request.headers.get('authorization') ?? ''
    if (!auth.toLowerCase().startsWith('bearer ')) {
        return jsonResponse({ error: 'Missing bearer token' }, 401)
    }
    const token = auth.slice(7).trim()

    let payload: Payload
    try {
        payload = await request.json() as Payload
    } catch {
        return jsonResponse({ error: 'Invalid JSON' }, 400)
    }
    if (!payload || typeof payload !== 'object' || !('action' in payload)) {
        return jsonResponse({ error: 'Missing action' }, 400)
    }
    if (!('workspace_id' in payload) || typeof payload.workspace_id !== 'string') {
        return jsonResponse({ error: 'Missing workspace_id' }, 400)
    }

    let admin: SupabaseClient
    try {
        admin = createClient(getRequiredEnv('VITE_SUPABASE_URL'), getRequiredEnv('SUPABASE_SECRET_KEY'), {
            auth: { persistSession: false, autoRefreshToken: false },
        })
    } catch (err) {
        return jsonResponse({ error: err instanceof Error ? err.message : 'Server misconfigured' }, 500)
    }

    try {
        await ensureCallerIsWorkspaceAdmin(token, admin, payload.workspace_id)
    } catch (err) {
        if (err instanceof HttpError) return jsonResponse({ error: err.message }, err.status)
        return jsonResponse({ error: err instanceof Error ? err.message : 'Auth check failed' }, 500)
    }

    const redirectTo = getAppPublicUrl(request)

    try {
        if (payload.action === 'invite') return await handleInvite(admin, payload, redirectTo)
        if (payload.action === 'resend') return await handleResend(admin, payload, redirectTo)
        return jsonResponse({ error: 'Unknown action' }, 400)
    } catch (err) {
        return jsonResponse({ error: err instanceof Error ? err.message : 'Unknown error' }, 500)
    }
}
