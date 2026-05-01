import { mockStore } from './store/mock-store'
import { mapProfile, type ProfileRow } from './map-profile'
import type { Profile } from '@/types/profiles'

export async function fetchProfileById(id: string): Promise<Profile | null> {
    const row = mockStore<ProfileRow>('profiles').find(id)
    return row ? mapProfile(row) : null
}

export async function fetchProfileByEmail(email: string): Promise<Profile | null> {
    const normalized = email.trim().toLowerCase()
    const row = mockStore<ProfileRow>('profiles').findOne(p => p.email.toLowerCase() === normalized)
    return row ? mapProfile(row) : null
}
