import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { fetchProfileById } from '@/data/fetch-profile'
import { fetchWorkspaceMembershipsForUser } from '@/data/fetch-workspaces'
import { signupUser, type SignupInput } from '@/data/mutate-profile'
import { setCurrentUserId } from '@/data/store/current-context'
import type { Profile } from '@/types/profiles'
import type { WorkspaceMember } from '@/types/workspaces'

type SignInResult = { error: Error | null }
type SignUpResult = { error: Error | null; needsEmailConfirmation: boolean }

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
    const [loading, setLoading] = useState(true)
    const cancelLoadRef = useRef(0)

    const applyForUser = useCallback(async (nextUserId: string | null) => {
        const token = ++cancelLoadRef.current
        setCurrentUserId(nextUserId)
        if (!nextUserId) {
            setUserId(null)
            setProfile(null)
            setMemberships([])
            setLoading(false)
            return
        }
        setUserId(nextUserId)
        setLoading(true)
        const result = await loadProfileAndMemberships(nextUserId)
        if (token !== cancelLoadRef.current) return
        setProfile(result.profile)
        setMemberships(result.memberships)
        setLoading(false)
    }, [])

    useEffect(() => {
        // Hydrate from any existing session, then subscribe to changes.
        let active = true
        supabase.auth.getSession().then(({ data }) => {
            if (!active) return
            void applyForUser(data.session?.user.id ?? null)
        })

        const { data } = supabase.auth.onAuthStateChange((_event, session) => {
            void applyForUser(session?.user.id ?? null)
        })

        return () => {
            active = false
            data.subscription.unsubscribe()
        }
    }, [applyForUser])

    const refresh = useCallback(async () => {
        if (!userId) return
        const result = await loadProfileAndMemberships(userId)
        setProfile(result.profile)
        setMemberships(result.memberships)
    }, [userId])

    const signIn = useCallback(async (email: string, password: string): Promise<SignInResult> => {
        const { error } = await supabase.auth.signInWithPassword({
            email: email.trim().toLowerCase(),
            password,
        })
        // onAuthStateChange will fire and applyForUser hydrates the rest.
        return { error: error ? new Error(error.message) : null }
    }, [])

    const signUp = useCallback(async (input: SignupInput): Promise<SignUpResult> => {
        try {
            const { sessionReady } = await signupUser(input)
            // If a session was returned, onAuthStateChange will fire and
            // hydrate profile + memberships. Otherwise email confirmation is
            // on and the caller should show a "check your email" screen.
            return { error: null, needsEmailConfirmation: !sessionReady }
        } catch (err) {
            return {
                error: err instanceof Error ? err : new Error('Sign-up failed'),
                needsEmailConfirmation: false,
            }
        }
    }, [])

    const signOut = useCallback(async () => {
        const { error } = await supabase.auth.signOut()
        return { error: error ? new Error(error.message) : null }
    }, [])

    const activeMembership = useMemo<WorkspaceMember | null>(() => {
        return memberships.find(m => m.status === 'active') ?? memberships[0] ?? null
    }, [memberships])

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
