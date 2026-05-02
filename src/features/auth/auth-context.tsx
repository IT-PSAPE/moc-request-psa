import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { fetchProfileById, fetchProfileByEmail } from '@/data/fetch-profile'
import { fetchWorkspaceMembershipsForUser } from '@/data/fetch-workspaces'
import { signinUser, signupUser, type SignupInput } from '@/data/mutate-profile'
import { setCurrentUserId } from '@/data/store/current-context'
import type { Profile } from '@/types/profiles'
import type { WorkspaceMember } from '@/types/workspaces'

type SignInResult = { error: Error | null }
type SignUpResult = { error: Error | null }

type AuthContextValue = {
    state: {
        userId: string | null
        profile: Profile | null
        memberships: WorkspaceMember[]
        activeMembership: WorkspaceMember | null
        loading: boolean
    }
    actions: {
        signIn: (email: string, password: string) => Promise<SignInResult>
        signUp: (input: SignupInput) => Promise<SignUpResult>
        signOut: () => Promise<{ error: Error | null }>
        refresh: () => Promise<void>
    }
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function loadProfileAndMemberships(userId: string): Promise<{
    profile: Profile | null
    memberships: WorkspaceMember[]
}> {
    const [profile, memberships] = await Promise.all([
        fetchProfileById(userId),
        fetchWorkspaceMembershipsForUser(userId),
    ])
    return { profile, memberships }
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [userId, setUserId] = useState<string | null>(null)
    const [profile, setProfile] = useState<Profile | null>(null)
    const [memberships, setMemberships] = useState<WorkspaceMember[]>([])

    const refresh = useCallback(async () => {
        if (!userId) {
            setProfile(null)
            setMemberships([])
            return
        }
        const result = await loadProfileAndMemberships(userId)
        setProfile(result.profile)
        setMemberships(result.memberships)
    }, [userId])

    const signIn = useCallback(async (email: string, password: string): Promise<SignInResult> => {
        try {
            const next = await signinUser(email, password)
            setCurrentUserId(next.id)
            setUserId(next.id)
            setProfile(next)
            const ms = await fetchWorkspaceMembershipsForUser(next.id)
            setMemberships(ms)
            return { error: null }
        } catch (err) {
            return { error: err instanceof Error ? err : new Error('Sign-in failed') }
        }
    }, [])

    const signUp = useCallback(async (input: SignupInput): Promise<SignUpResult> => {
        try {
            const existing = await fetchProfileByEmail(input.email)
            if (existing) return { error: new Error('An account with that email already exists') }
            const result = await signupUser(input)
            setCurrentUserId(result.profile.id)
            setUserId(result.profile.id)
            setProfile(result.profile)
            setMemberships([result.workspaceMember])
            return { error: null }
        } catch (err) {
            return { error: err instanceof Error ? err : new Error('Sign-up failed') }
        }
    }, [])

    const signOut = useCallback(async () => {
        setCurrentUserId(null)
        setUserId(null)
        setProfile(null)
        setMemberships([])
        return { error: null }
    }, [])

    const activeMembership = useMemo<WorkspaceMember | null>(() => {
        return memberships.find(m => m.status === 'active') ?? memberships[0] ?? null
    }, [memberships])
    const loading = false

    const value = useMemo<AuthContextValue>(() => ({
        state: { userId, profile, memberships, activeMembership, loading },
        actions: { signIn, signUp, signOut, refresh },
    }), [userId, profile, memberships, activeMembership, loading, signIn, signUp, signOut, refresh])

    return <AuthContext value={value}>{children}</AuthContext>
}

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
    return ctx
}
