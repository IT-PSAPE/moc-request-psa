import { supabase } from '@/lib/supabase'
import { mapProfile, type ProfileRow } from './map-profile'
import type { Profile } from '@/types/profiles'

export async function fetchProfileById(id: string): Promise<Profile | null> {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .maybeSingle<ProfileRow>()
    if (error) throw new Error(error.message)
    return data ? mapProfile(data) : null
}

export async function fetchProfileByEmail(email: string): Promise<Profile | null> {
    const normalized = email.trim().toLowerCase()
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', normalized)
        .maybeSingle<ProfileRow>()
    if (error) throw new Error(error.message)
    return data ? mapProfile(data) : null
}
