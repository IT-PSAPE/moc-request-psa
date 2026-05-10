import { supabase } from '@/lib/supabase'
import { mapProfile, type ProfileRow } from './map-profile'
import type { Profile } from '@/types/profiles'

export type SignupInput = {
    email: string
    password: string
    name: string
    surname: string | null
    workspaceId: string
}

export type SignupResult = {
    /** True when a session is established (email confirmation off in Supabase). */
    sessionReady: boolean
}

export async function signupUser(input: SignupInput): Promise<SignupResult> {
    const email = input.email.trim().toLowerCase()
    // The handle_new_user trigger (phase-04) creates the matching public.profiles
    // row AND, if pending_workspace_id is supplied, inserts a pending
    // workspace_members row — all server-side under SECURITY DEFINER. The
    // client doesn't perform either insert, which is what makes signup work
    // even when email confirmation is enabled (no session returned).
    const { data, error } = await supabase.auth.signUp({
        email,
        password: input.password,
        options: {
            data: {
                name: input.name,
                surname: input.surname,
                pending_workspace_id: input.workspaceId,
            },
        },
    })
    if (error) throw new Error(error.message)
    if (!data.user) throw new Error('Sign-up did not return a user')

    return { sessionReady: Boolean(data.session) }
}

export type ProfilePatch = {
    name?: string
    surname?: string | null
    email?: string
}

export async function updateProfile(id: string, patch: ProfilePatch): Promise<Profile> {
    const dbPatch: Partial<ProfileRow> = {}
    if (patch.name !== undefined) {
        const trimmed = patch.name.trim()
        if (!trimmed) throw new Error('Name cannot be empty')
        dbPatch.name = trimmed
    }
    if (patch.surname !== undefined) {
        const trimmed = patch.surname?.trim() ?? ''
        dbPatch.surname = trimmed || null
    }
    if (patch.email !== undefined) {
        const normalized = patch.email.trim().toLowerCase()
        if (!normalized) throw new Error('Email cannot be empty')
        const { error } = await supabase.auth.updateUser({ email: normalized })
        if (error) throw new Error(error.message)
        dbPatch.email = normalized
    }

    const { data, error } = await supabase
        .from('profiles')
        .update(dbPatch)
        .eq('id', id)
        .select('*')
        .single<ProfileRow>()
    if (error || !data) throw new Error(error?.message ?? 'Profile update failed')
    return mapProfile(data)
}
