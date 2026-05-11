export type MemberStatus = 'pending' | 'invited' | 'active' | 'suspended' | 'rejected'

export type Profile = {
    id: string
    email: string
    name: string
    surname: string | null
    status: MemberStatus
    isPlatformAdmin: boolean
    createdAt: string
    updatedAt: string
}
