import { SESSION_KEY } from './storage-keys'

export type MockSession = {
    userId: string
    issuedAt: string
}

type SessionListener = (session: MockSession | null) => void

const listeners = new Set<SessionListener>()

function readFromStorage(): MockSession | null {
    if (typeof window === 'undefined') return null
    const raw = window.localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    try {
        const parsed = JSON.parse(raw) as MockSession
        return parsed.userId ? parsed : null
    } catch {
        return null
    }
}

export function getSession(): MockSession | null {
    return readFromStorage()
}

export function setSession(userId: string): MockSession {
    const session: MockSession = { userId, issuedAt: new Date().toISOString() }
    if (typeof window !== 'undefined') {
        window.localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    }
    for (const listener of listeners) listener(session)
    return session
}

export function clearSession(): void {
    if (typeof window !== 'undefined') {
        window.localStorage.removeItem(SESSION_KEY)
    }
    for (const listener of listeners) listener(null)
}

export function subscribeSession(fn: SessionListener): () => void {
    listeners.add(fn)
    return () => {
        listeners.delete(fn)
    }
}
