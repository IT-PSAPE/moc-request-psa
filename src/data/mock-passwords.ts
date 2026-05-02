import { persistMockPasswords } from './mock-api'
import type { MockPasswords } from './mock-schema'

let passwords: MockPasswords = {}
let initialized = false
let pendingWrite: Promise<void> = Promise.resolve()

function ensureInitialized(): void {
    if (!initialized) {
        throw new Error('Mock passwords were accessed before initialization.')
    }
}

export function initializePasswords(seed: MockPasswords): void {
    passwords = { ...seed }
    initialized = true
    pendingWrite = Promise.resolve()
}

export function getPassword(userId: string): string | null {
    ensureInitialized()
    return passwords[userId] ?? null
}

export function setPassword(userId: string, password: string): void {
    ensureInitialized()
    passwords = { ...passwords, [userId]: password }
    queuePersist()
}

function queuePersist(): void {
    const snapshot = { ...passwords }
    pendingWrite = pendingWrite
        .catch(() => undefined)
        .then(() => persistMockPasswords(snapshot))

    void pendingWrite.catch(error => {
        console.error('Failed to persist mock passwords.', error)
    })
}
