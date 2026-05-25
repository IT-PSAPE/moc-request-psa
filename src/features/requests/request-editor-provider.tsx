import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { useRequestStore } from './use-request-store'
import {
    addRequestAssignee,
    archiveRequest,
    deleteRequest,
    removeRequestAssignee,
    unarchiveRequest,
} from '@/data/mutate-requests'
import { fetchAssigneesForRequest } from '@/data/fetch-assignees'
import { usePermissions } from '@/features/auth/use-permissions'
import type { Request, ResolvedAssignee } from '@/types/requests'

type RequestEditorContextValue = {
    state: {
        draft: Request
        isDirty: boolean
        isSaving: boolean
        error: string | null
        assignees: ResolvedAssignee[]
    }
    actions: {
        updateField: <K extends keyof Request>(field: K, value: Request[K]) => void
        save: () => Promise<Request>
        discard: () => void
        archive: () => Promise<Request>
        unarchive: () => Promise<Request>
        delete: () => Promise<void>
        addAssignee: (userId: string, duty: string) => Promise<void>
        removeAssignee: (userId: string) => Promise<void>
    }
    meta: {
        initialRequest: Request
        /** Caller may change request fields, status, assignees (RLS can_update). */
        canUpdate: boolean
        /** Caller may delete the request (RLS can_delete). */
        canDelete: boolean
    }
}

const RequestEditorContext = createContext<RequestEditorContextValue | null>(null)

type RequestEditorProviderProps = {
    request: Request
    assignees: ResolvedAssignee[]
    onSync: (request: Request) => void
    onRemove: (id: string) => void
    children: ReactNode
}

export function RequestEditorProvider({ request, assignees: initialAssignees, onSync, onRemove, children }: RequestEditorProviderProps) {
    const { state, actions } = useRequestStore(request, { syncRequest: onSync })
    const [assignees, setAssignees] = useState<ResolvedAssignee[]>(initialAssignees)
    const { canUpdate, canDelete } = usePermissions()

    const refreshAssignees = useCallback(async () => {
        const next = await fetchAssigneesForRequest(state.draft.id)
        setAssignees(next)
    }, [state.draft.id])

    const archive = useCallback(async () => {
        const next = await archiveRequest(state.draft.id)
        actions.reset(next)
        onSync(next)
        return next
    }, [actions, onSync, state.draft.id])

    const unarchive = useCallback(async () => {
        const next = await unarchiveRequest(state.draft.id)
        actions.reset(next)
        onSync(next)
        return next
    }, [actions, onSync, state.draft.id])

    const remove = useCallback(async () => {
        await deleteRequest(state.draft.id)
        onRemove(state.draft.id)
    }, [onRemove, state.draft.id])

    const addAssignee = useCallback(async (userId: string, duty: string) => {
        await addRequestAssignee(state.draft.id, userId, duty)
        await refreshAssignees()
    }, [refreshAssignees, state.draft.id])

    const removeAssignee = useCallback(async (userId: string) => {
        await removeRequestAssignee(state.draft.id, userId)
        await refreshAssignees()
    }, [refreshAssignees, state.draft.id])

    const value = useMemo<RequestEditorContextValue>(() => ({
        state: {
            draft: state.draft,
            isDirty: state.isDirty,
            isSaving: state.isSaving,
            error: state.error,
            assignees,
        },
        actions: {
            updateField: actions.updateField,
            save: actions.save,
            discard: actions.discard,
            archive,
            unarchive,
            delete: remove,
            addAssignee,
            removeAssignee,
        },
        meta: {
            initialRequest: request,
            canUpdate,
            canDelete,
        },
    }), [state.draft, state.isDirty, state.isSaving, state.error, assignees, actions.updateField, actions.save, actions.discard, archive, unarchive, remove, addAssignee, removeAssignee, request, canUpdate, canDelete])

    return <RequestEditorContext value={value}>{children}</RequestEditorContext>
}

export function useRequestEditor() {
    const ctx = useContext(RequestEditorContext)
    if (!ctx) throw new Error('useRequestEditor must be used within a RequestEditorProvider')
    return ctx
}
