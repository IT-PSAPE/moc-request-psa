import { supabase } from '@/lib/supabase'
import { type ActivityLogRow } from './mutate-activity'
import { type ProfileRow } from './map-profile'
import type { ResolvedActivityEntry } from '@/types/activity'

type ActivityJoinRow = ActivityLogRow & { actor: ProfileRow | null }

function initialsOf(profile: ProfileRow): string {
    const a = profile.name[0] ?? ''
    const b = profile.surname?.[0] ?? ''
    return `${a}${b}`.trim() || a || '?'
}

export async function fetchActivityForRequest(requestId: string): Promise<ResolvedActivityEntry[]> {
    const { data, error } = await supabase
        .from('activity_logs')
        .select('*, actor:profiles(*)')
        .eq('request_id', requestId)
        .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)

    const rows = (data ?? []) as unknown as ActivityJoinRow[]
    return rows.map(row => ({
        id: row.id,
        requestId: row.request_id,
        actorId: row.actor_id,
        action: row.action,
        payload: row.payload,
        createdAt: row.created_at,
        actorName: row.actor ? [row.actor.name, row.actor.surname].filter(Boolean).join(' ') : null,
        actorInitials: row.actor ? initialsOf(row.actor) : null,
    }))
}
