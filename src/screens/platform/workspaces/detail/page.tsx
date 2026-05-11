import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, UserPlus } from 'lucide-react'
import { Button } from '@/components/controls/button'
import { Card } from '@/components/display/card'
import { Label, Paragraph } from '@/components/display/text'
import { Avatar } from '@/components/display/avatar'
import { Badge } from '@/components/display/badge'
import { Select } from '@/components/form/select'
import { FormLabel } from '@/components/form/form-label'
import { Spinner } from '@/components/feedback/spinner'
import { useFeedback } from '@/components/feedback/feedback-provider'
import { supabase } from '@/lib/supabase'
import { fetchWorkspaceById } from '@/data/fetch-workspaces'
import { mapProfile, type ProfileRow } from '@/data/map-profile'
import { mapWorkspaceMember, type WorkspaceMemberRow } from '@/data/map-workspace-member'
import { mapWorkspaceRole, type WorkspaceRoleRow } from '@/data/map-workspace-role'
import { assignWorkspaceAdmin } from '@/data/mutate-workspaces'
import { getErrorMessage } from '@/utils/get-error-message'
import { routes } from '@/screens/app-routes'
import type { Workspace, WorkspaceMember, WorkspaceRole } from '@/types/workspaces'
import type { Profile } from '@/types/profiles'

type ResolvedWorkspaceMember = {
    membership: WorkspaceMember
    profile: Profile
    role: WorkspaceRole | null
}

type WorkspaceContext = {
    workspace: Workspace
    members: ResolvedWorkspaceMember[]
    candidates: Profile[]
}

type MemberJoin = WorkspaceMemberRow & {
    profile: ProfileRow | null
    role: WorkspaceRoleRow | null
}

async function loadContext(workspaceId: string): Promise<WorkspaceContext | null> {
    const workspace = await fetchWorkspaceById(workspaceId)
    if (!workspace) return null

    const { data: memberData, error: memberError } = await supabase
        .from('workspace_members')
        .select('*, profile:profiles!workspace_members_user_id_fkey(*), role:workspace_roles!workspace_members_workspace_role_id_fkey(*)')
        .eq('workspace_id', workspaceId)
    if (memberError) throw new Error(memberError.message)
    const memberRows = (memberData ?? []) as unknown as MemberJoin[]

    const members: ResolvedWorkspaceMember[] = memberRows
        .filter(m => m.profile !== null)
        .map(m => ({
            membership: mapWorkspaceMember(m),
            profile: mapProfile(m.profile as ProfileRow),
            role: m.role ? mapWorkspaceRole(m.role) : null,
        }))

    const memberUserIds = new Set(members.map(m => m.profile.id))
    const { data: candidateData, error: candidateError } = await supabase
        .from('profiles')
        .select('*')
        .neq('status', 'suspended')
        .order('name', { ascending: true })
    if (candidateError) throw new Error(candidateError.message)

    const candidates = (candidateData ?? [])
        .map(p => mapProfile(p as ProfileRow))
        .filter(p => !memberUserIds.has(p.id))

    return { workspace, members, candidates }
}

export function PlatformWorkspaceDetailScreen() {
    const { workspaceId } = useParams<{ workspaceId: string }>()
    const navigate = useNavigate()
    const { toast } = useFeedback()
    const [ctx, setCtx] = useState<WorkspaceContext | null>(null)
    const [loading, setLoading] = useState(true)
    const [adminCandidate, setAdminCandidate] = useState('')
    const [busy, setBusy] = useState(false)

    async function refresh() {
        if (!workspaceId) return
        const next = await loadContext(workspaceId)
        setCtx(next)
        setAdminCandidate('')
    }

    useEffect(() => {
        let active = true
        ;(async () => {
            if (!workspaceId) {
                setLoading(false)
                return
            }
            const next = await loadContext(workspaceId)
            if (!active) return
            setCtx(next)
            setLoading(false)
        })()
        return () => { active = false }
    }, [workspaceId])

    if (loading) {
        return (
            <div className="flex min-h-full items-center justify-center p-12">
                <Spinner size="lg" />
            </div>
        )
    }

    if (!ctx) {
        return (
            <div className="px-6 py-8 max-w-3xl mx-auto space-y-3">
                <Button variant="ghost" icon={<ArrowLeft />} onClick={() => navigate(`/${routes.platformWorkspaces}`)}>
                    All workspaces
                </Button>
                <p className="paragraph-md text-tertiary">Workspace not found.</p>
            </div>
        )
    }

    const admins = ctx.members.filter(m => m.role?.canManageRoles)
    const others = ctx.members.filter(m => !m.role?.canManageRoles)

    async function handleAssign(e: FormEvent) {
        e.preventDefault()
        if (!adminCandidate || !ctx) return
        setBusy(true)
        try {
            await assignWorkspaceAdmin(ctx.workspace.id, adminCandidate)
            toast({ title: 'Admin assigned', variant: 'success' })
            await refresh()
        } catch (err) {
            toast({ title: 'Assign failed', description: getErrorMessage(err, 'Could not assign admin.'), variant: 'error' })
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className="px-6 py-8 max-w-3xl mx-auto space-y-6">
            <Button variant="ghost" icon={<ArrowLeft />} onClick={() => navigate(`/${routes.platformWorkspaces}`)}>
                All workspaces
            </Button>

            <div className="space-y-1">
                <h1 className="title-h5">{ctx.workspace.name}</h1>
                <p className="paragraph-xs text-quaternary font-mono">{ctx.workspace.slug}</p>
                {ctx.workspace.description && (
                    <p className="paragraph-sm text-tertiary">{ctx.workspace.description}</p>
                )}
            </div>

            <Card.Root>
                <Card.Content>
                    <Label.md className="block pb-3">Assign an admin</Label.md>
                    <form onSubmit={handleAssign} className="space-y-3">
                        <div className="space-y-1">
                            <FormLabel label="User" />
                            <Select value={adminCandidate} onChange={e => setAdminCandidate(e.target.value)} required>
                                <option value="">— Select an existing user —</option>
                                {ctx.candidates.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {[p.name, p.surname].filter(Boolean).join(' ')} · {p.email}
                                    </option>
                                ))}
                            </Select>
                            {ctx.candidates.length === 0 && (
                                <p className="paragraph-xs text-quaternary">All known users are already members of this workspace.</p>
                            )}
                        </div>
                        <Button type="submit" icon={<UserPlus />} disabled={!adminCandidate || busy}>
                            {busy ? 'Assigning…' : 'Assign as admin'}
                        </Button>
                    </form>
                </Card.Content>
            </Card.Root>

            <section className="space-y-3">
                <h2 className="title-h6">Workspace admins ({admins.length})</h2>
                {admins.length === 0 ? (
                    <p className="paragraph-sm text-tertiary">No admins yet — assign one above.</p>
                ) : (
                    <div className="space-y-2">
                        {admins.map(m => <MemberCard key={m.membership.id} member={m} />)}
                    </div>
                )}
            </section>

            {others.length > 0 && (
                <section className="space-y-3">
                    <h2 className="title-h6">Other members ({others.length})</h2>
                    <div className="space-y-2">
                        {others.map(m => <MemberCard key={m.membership.id} member={m} />)}
                    </div>
                </section>
            )}
        </div>
    )
}

function MemberCard({ member }: { member: ResolvedWorkspaceMember }) {
    const initials = `${member.profile.name[0] ?? ''}${member.profile.surname?.[0] ?? ''}`.trim() || member.profile.name[0] || '?'
    return (
        <div className="flex items-center gap-3 rounded-lg border border-secondary bg-primary p-3">
            <Avatar.initials size="md" name={initials} />
            <div className="flex-1 min-w-0">
                <Label.md>{[member.profile.name, member.profile.surname].filter(Boolean).join(' ')}</Label.md>
                <Paragraph.xs className="text-quaternary truncate">{member.profile.email}</Paragraph.xs>
            </div>
            {member.role && <Badge label={member.role.name} color="blue" />}
            <Badge
                label={member.membership.status === 'active' ? 'Active' : member.membership.status === 'pending' ? 'Pending' : 'Suspended'}
                color={member.membership.status === 'active' ? 'green' : member.membership.status === 'pending' ? 'yellow' : 'red'}
            />
        </div>
    )
}
