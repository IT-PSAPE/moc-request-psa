import { useMemo } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useCurrentWorkspace } from '@/features/workspace/workspace-provider'

/**
 * The current user's effective capabilities in the active workspace.
 *
 * This mirrors the database RLS policies (docs/phases/phase-05) so the UI can
 * hide or disable what a save would be rejected for:
 *   • A workspace admin (workspace_role.can_manage_roles) can do everything.
 *   • Otherwise the workspace_role's can_create / can_update / can_delete
 *     flags decide — this is what makes the Editor / Viewer roles real.
 *
 * Platform admins are deliberately NOT granted write capability here: the
 * requests RLS write policies do not include is_platform_admin(), so a
 * platform admin who isn't also a workspace admin gets a read-only editor,
 * matching what the database would allow.
 */
export type Permissions = {
    isPlatformAdmin: boolean
    isWorkspaceAdmin: boolean
    canCreate: boolean
    canUpdate: boolean
    canDelete: boolean
}

export function usePermissions(): Permissions {
    const { state: { profile } } = useAuth()
    const { state: { role } } = useCurrentWorkspace()

    return useMemo<Permissions>(() => {
        const isPlatformAdmin = Boolean(profile?.isPlatformAdmin)
        const isWorkspaceAdmin = Boolean(role?.canManageRoles)

        return {
            isPlatformAdmin,
            isWorkspaceAdmin,
            canCreate: isWorkspaceAdmin || Boolean(role?.canCreate),
            canUpdate: isWorkspaceAdmin || Boolean(role?.canUpdate),
            canDelete: isWorkspaceAdmin || Boolean(role?.canDelete),
        }
    }, [profile, role])
}
