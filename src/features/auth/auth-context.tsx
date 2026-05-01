import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { ensureSeeded } from '@/data/store/reset'
import { clearSession, getSession, subscribeSession, type MockSession } from '@/data/store/session'
import { fetchProfileById, fetchProfileByEmail } from '@/data/fetch-profile'
import { fetchWorkspaceMembershipsForUser } from '@/data/fetch-workspaces'
import { signinUser, signupUser, type SignupInput } from '@/data/mutate-profile'
import type { Profile } from '@/types/profiles'
import type { WorkspaceMember } from '@/types/workspaces'

type SignInResult = { error: Error | null }
type SignUpResult = { error: Error | null }

type AuthState = {
    session: MockSession | null
    profile: Profile | null
    memberships: WorkspaceMember[]
    activeMembership: WorkspaceMember | null
    loading: boolean
    signIn: (email: string, password: string) => Promise<SignInResult>
    signUp: (input: SignupInput) => Promise<SignUpResult>
    signOut: () => Promise<{ error: Error | null }>
    refresh: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

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
    const [session, setSessionState] = useState<MockSession | null>(null)
    const [profile, setProfile] = useState<Profile | null>(null)
    const [memberships, setMemberships] = useState<WorkspaceMember[]>([])
    const [loading, setLoading] = useState(true)

    const refresh = useCallback(async () => {
        const current = getSession()
        setSessionState(current)
        if (!current) {
            setProfile(null)
            setMemberships([])
            return
        }
        const result = await loadProfileAndMemberships(current.userId)
        setProfile(result.profile)
        setMemberships(result.memberships)
    }, [])

    useEffect(() => {
        let active = true

        async function init() {
            ensureSeeded()
            await refresh()
            if (active) setLoading(false)
        }

        init()

        const unsub = subscribeSession(async (next) => {
            if (!active) return
            setSessionState(next)
            if (!next) {
                setProfile(null)
                setMemberships([])
                return
            }
            const result = await loadProfileAndMemberships(next.userId)
            if (!active) return
            setProfile(result.profile)
            setMemberships(result.memberships)
        })

        return () => {
            active = false
            unsub()
        }
    }, [refresh])

    const signIn = useCallback(async (email: string, password: string): Promise<SignInResult> => {
        try {
            const next = await signinUser(email, password)
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
            setProfile(result.profile)
            setMemberships([result.workspaceMember])
            return { error: null }
        } catch (err) {
            return { error: err instanceof Error ? err : new Error('Sign-up failed') }
        }
    }, [])

    const signOut = useCallback(async () => {
        clearSession()
        setProfile(null)
        setMemberships([])
        return { error: null }
    }, [])

    const activeMembership = useMemo<WorkspaceMember | null>(() => {
        return memberships.find(m => m.status === 'active') ?? memberships[0] ?? null
    }, [memberships])

    const value = useMemo<AuthState>(() => ({
        session,
        profile,
        memberships,
        activeMembership,
        loading,
        signIn,
        signUp,
        signOut,
        refresh,
    }), [session, profile, memberships, activeMembership, loading, signIn, signUp, signOut, refresh])

    return <AuthContext value={value}>{children}</AuthContext>
}

export function useAuth(): AuthState {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
    return ctx
}
