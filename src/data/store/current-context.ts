// Slim ambient context for the data layer.
// RLS does the heavy lifting server-side — this module only carries the two
// values that mutations need to know synchronously (without an `await
// supabase.auth.getUser()` round-trip per call):
//   • userId             — set by AuthProvider on auth state change
//   • activeWorkspaceId  — set by WorkspaceProvider when the active workspace resolves

let currentUserId: string | null = null
let activeWorkspaceId: string | null = null

export function setCurrentUserId(userId: string | null): void {
    currentUserId = userId
}

export function setActiveWorkspaceId(workspaceId: string | null): void {
    activeWorkspaceId = workspaceId
}

export type CurrentContext = {
    userId: string | null
    activeWorkspaceId: string | null
}

export function getCurrentContext(): CurrentContext {
    return { userId: currentUserId, activeWorkspaceId }
}
