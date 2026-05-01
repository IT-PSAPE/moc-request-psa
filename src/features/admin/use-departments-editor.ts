import { useCallback, useEffect, useMemo, useReducer } from 'react'
import { createDepartment, updateDepartment } from '@/data/mutate-departments'
import type { Department } from '@/types/departments'

export type DepartmentDraft = {
    id: string
    name: string
    description: string
    colorKey: string
    sortOrder: number
    isNew: boolean
}

type EditorState = {
    original: Department[]
    draft: DepartmentDraft[]
    isSaving: boolean
    error: string | null
}

type Action =
    | { type: 'RESET'; departments: Department[] }
    | { type: 'UPDATE_FIELD'; id: string; field: keyof DepartmentDraft; value: string }
    | { type: 'ADD_ROW'; row: DepartmentDraft }
    | { type: 'SAVE_START' }
    | { type: 'SAVE_SUCCESS'; departments: Department[] }
    | { type: 'SAVE_ERROR'; error: string }

function toDraft(d: Department): DepartmentDraft {
    return {
        id: d.id,
        name: d.name,
        description: d.description ?? '',
        colorKey: d.colorKey,
        sortOrder: d.sortOrder,
        isNew: false,
    }
}

function reducer(state: EditorState, action: Action): EditorState {
    switch (action.type) {
        case 'RESET':
            return {
                original: action.departments,
                draft: action.departments.map(toDraft),
                isSaving: false,
                error: null,
            }
        case 'UPDATE_FIELD':
            return {
                ...state,
                draft: state.draft.map(row =>
                    row.id === action.id ? { ...row, [action.field]: action.value } : row,
                ),
            }
        case 'ADD_ROW':
            return { ...state, draft: [...state.draft, action.row] }
        case 'SAVE_START':
            return { ...state, isSaving: true, error: null }
        case 'SAVE_SUCCESS':
            return {
                original: action.departments,
                draft: action.departments.map(toDraft),
                isSaving: false,
                error: null,
            }
        case 'SAVE_ERROR':
            return { ...state, isSaving: false, error: action.error }
    }
}

export function useDepartmentsEditor(departments: Department[]) {
    const [state, dispatch] = useReducer(reducer, {
        original: departments,
        draft: departments.map(toDraft),
        isSaving: false,
        error: null,
    })

    useEffect(() => {
        dispatch({ type: 'RESET', departments })
    }, [departments])

    const isDirty = useMemo(() => {
        if (state.draft.length !== state.original.length) return true
        for (const row of state.draft) {
            if (row.isNew) return true
            const orig = state.original.find(d => d.id === row.id)
            if (!orig) return true
            if (orig.name !== row.name.trim()) return true
            if ((orig.description ?? '') !== row.description.trim()) return true
            if (orig.colorKey !== row.colorKey) return true
        }
        return false
    }, [state.draft, state.original])

    const updateField = useCallback((id: string, field: keyof DepartmentDraft, value: string) => {
        dispatch({ type: 'UPDATE_FIELD', id, field, value })
    }, [])

    const addRow = useCallback(() => {
        dispatch({
            type: 'ADD_ROW',
            row: {
                id: crypto.randomUUID(),
                name: '',
                description: '',
                colorKey: 'blue',
                sortOrder: state.draft.length,
                isNew: true,
            },
        })
    }, [state.draft.length])

    const save = useCallback(async (refresh: () => Promise<void>) => {
        dispatch({ type: 'SAVE_START' })
        try {
            for (const row of state.draft) {
                const trimmedName = row.name.trim()
                if (!trimmedName) {
                    throw new Error('Every department needs a name')
                }
                if (row.isNew) {
                    await createDepartment({
                        name: trimmedName,
                        description: row.description.trim() || null,
                        colorKey: row.colorKey,
                    })
                } else {
                    const orig = state.original.find(d => d.id === row.id)
                    if (!orig) continue
                    const changed =
                        orig.name !== trimmedName ||
                        (orig.description ?? '') !== row.description.trim() ||
                        orig.colorKey !== row.colorKey
                    if (changed) {
                        await updateDepartment(row.id, {
                            name: trimmedName,
                            description: row.description.trim() || null,
                            colorKey: row.colorKey,
                        })
                    }
                }
            }
            await refresh()
        } catch (err) {
            dispatch({ type: 'SAVE_ERROR', error: err instanceof Error ? err.message : 'Save failed' })
            throw err
        }
    }, [state.draft, state.original])

    const reset = useCallback(() => {
        dispatch({ type: 'RESET', departments: state.original })
    }, [state.original])

    return {
        state: {
            draft: state.draft,
            isDirty,
            isSaving: state.isSaving,
            error: state.error,
        },
        actions: { updateField, addRow, save, reset },
    }
}
