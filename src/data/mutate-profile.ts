import { mockStore } from './store/mock-store'
import { getPassword, setPassword } from './mock-passwords'
import { mapProfile, type ProfileRow } from './map-profile'
import { mapWorkspaceMember, type WorkspaceMemberRow } from './map-workspace-member'
import { setCurrentUserId } from './store/current-context'
import type { Profile } from '@/types/profiles'
import type { WorkspaceMember } from '@/types/workspaces'

function newId(): string {
    return crypto.randomUUID()
}

export type SignupInput = {
    email: string
    password: string
    name: string
    surname: string | null
    workspaceId: string
}

export type SignupResult = {
    profile: Profile
    workspaceMember: WorkspaceMember
}

export async function signupUser(input: SignupInput): Promise<SignupResult> {
    const profilesStore = mockStore<ProfileRow>('profiles')
    const membersStore = mockStore<WorkspaceMemberRow>('workspace_members')

    const normalizedEmail = input.email.trim().toLowerCase()
    if (profilesStore.findOne(p => p.email.toLowerCase() === normalizedEmail)) {
        throw new Error('An account with that email already exists')
    }

    const now = new Date().toISOString()
    const profileId = newId()

    const profileRow: ProfileRow = {
        id: profileId,
        email: normalizedEmail,
        name: input.name,
        surname: input.surname,
        status: 'active',
        is_platform_admin: false,
        created_at: now,
        updated_at: now,
    }
    profilesStore.insert(profileRow)

    const memberRow: WorkspaceMemberRow = {
        id: newId(),
        workspace_id: input.workspaceId,
        user_id: profileId,
        status: 'pending',
        workspace_role_id: null,
        requested_at: now,
        approved_at: null,
        approved_by: null,
    }
    membersStore.insert(memberRow)

    setPassword(profileId, input.password)
    setCurrentUserId(profileId)

    return {
        profile: mapProfile(profileRow),
        workspaceMember: mapWorkspaceMember(memberRow),
    }
}

export type ProfilePatch = {
    name?: string
    surname?: string | null
    email?: string
}

export async function updateProfile(id: string, patch: ProfilePatch): Promise<Profile> {
    const profilesStore = mockStore<ProfileRow>('profiles')
    const current = profilesStore.find(id)
    if (!current) throw new Error('Profile not found')

    const next: Partial<ProfileRow> = { updated_at: new Date().toISOString() }

    if (patch.name !== undefined) {
        const trimmed = patch.name.trim()
        if (!trimmed) throw new Error('Name cannot be empty')
        next.name = trimmed
    }
    if (patch.surname !== undefined) {
        const trimmed = patch.surname?.trim() ?? ''
        next.surname = trimmed || null
    }
    if (patch.email !== undefined) {
        const normalizedEmail = patch.email.trim().toLowerCase()
        if (!normalizedEmail) throw new Error('Email cannot be empty')
        if (normalizedEmail !== current.email) {
            const conflict = profilesStore.findOne(p => p.id !== id && p.email.toLowerCase() === normalizedEmail)
            if (conflict) throw new Error('An account with that email already exists')
        }
        next.email = normalizedEmail
    }

    return mapProfile(profilesStore.update(id, next))
}

export async function signinUser(email: string, password: string): Promise<Profile> {
    const profilesStore = mockStore<ProfileRow>('profiles')
    const normalizedEmail = email.trim().toLowerCase()
    const row = profilesStore.findOne(p => p.email.toLowerCase() === normalizedEmail)
    if (!row) {
        throw new Error('Invalid email or password')
    }

    const stored = getPassword(row.id)
    if (stored !== password) {
        throw new Error('Invalid email or password')
    }

    if (row.status === 'suspended') {
        throw new Error('This account has been suspended. Contact your administrator.')
    }

    setCurrentUserId(row.id)
    return mapProfile(row)
}
