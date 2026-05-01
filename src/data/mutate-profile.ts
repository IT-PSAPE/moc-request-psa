import { mockStore } from './store/mock-store'
import { mapProfile, type ProfileRow } from './map-profile'
import { mapWorkspaceMember, type WorkspaceMemberRow } from './map-workspace-member'
import { passwordKey } from './store/storage-keys'
import { setSession } from './store/session'
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

    if (typeof window !== 'undefined') {
        window.localStorage.setItem(passwordKey(profileId), input.password)
    }

    setSession(profileId)

    return {
        profile: mapProfile(profileRow),
        workspaceMember: mapWorkspaceMember(memberRow),
    }
}

export async function signinUser(email: string, password: string): Promise<Profile> {
    const profilesStore = mockStore<ProfileRow>('profiles')
    const normalizedEmail = email.trim().toLowerCase()
    const row = profilesStore.findOne(p => p.email.toLowerCase() === normalizedEmail)
    if (!row) {
        throw new Error('Invalid email or password')
    }

    if (typeof window === 'undefined') {
        throw new Error('Cannot sign in outside the browser')
    }

    const stored = window.localStorage.getItem(passwordKey(row.id))
    if (stored !== password) {
        throw new Error('Invalid email or password')
    }

    if (row.status === 'suspended') {
        throw new Error('This account has been suspended. Contact your administrator.')
    }

    setSession(row.id)
    return mapProfile(row)
}
