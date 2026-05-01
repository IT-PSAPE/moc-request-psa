import type { MemberStatus, Profile } from '@/types/profiles'

export type ProfileRow = {
    id: string
    email: string
    name: string
    surname: string | null
    status: MemberStatus
    is_platform_admin: boolean
    created_at: string
    updated_at: string
}

export function mapProfile(row: ProfileRow): Profile {
    return {
        id: row.id,
        email: row.email,
        name: row.name,
        surname: row.surname,
        status: row.status,
        isPlatformAdmin: row.is_platform_admin,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    }
}

export function profileToRow(profile: Profile): ProfileRow {
    return {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        surname: profile.surname,
        status: profile.status,
        is_platform_admin: profile.isPlatformAdmin,
        created_at: profile.createdAt,
        updated_at: profile.updatedAt,
    }
}
