import { useCallback, useEffect, useMemo, useReducer } from 'react'
import { updateCategory } from '@/data/mutate-categories'
import type { Category } from '@/types/categories'

export type CategoryDraft = {
    id: string
    label: string
    colorKey: string
    defaultDepartmentId: string | null
    isActive: boolean
    sortOrder: number
}

type EditorState = {
    original: Category[]
    draft: CategoryDraft[]
    isSaving: boolean
    error: string | null
}

type Action =
    | { type: 'RESET'; categories: Category[] }
    | { type: 'UPDATE_FIELD'; id: string; patch: Partial<CategoryDraft> }
    | { type: 'SAVE_START' }
    | { type: 'SAVE_ERROR'; error: string }

function toDraft(c: Category): CategoryDraft {
    return {
        id: c.id,
        label: c.label,
        colorKey: c.colorKey,
        defaultDepartmentId: c.defaultDepartmentId,
        isActive: c.isActive,
        sortOrder: c.sortOrder,
    }
}

function reducer(state: EditorState, action: Action): EditorState {
    switch (action.type) {
        case 'RESET':
            return {
                original: action.categories,
                draft: action.categories.map(toDraft),
                isSaving: false,
                error: null,
            }
        case 'UPDATE_FIELD':
            return {
                ...state,
                draft: state.draft.map(row => (row.id === action.id ? { ...row, ...action.patch } : row)),
            }
        case 'SAVE_START':
            return { ...state, isSaving: true, error: null }
        case 'SAVE_ERROR':
            return { ...state, isSaving: false, error: action.error }
    }
}

export function useCategoriesEditor(categories: Category[]) {
    const [state, dispatch] = useReducer(reducer, {
        original: categories,
        draft: categories.map(toDraft),
        isSaving: false,
        error: null,
    })

    useEffect(() => {
        dispatch({ type: 'RESET', categories })
    }, [categories])

    const isDirty = useMemo(() => {
        for (const row of state.draft) {
            const orig = state.original.find(c => c.id === row.id)
            if (!orig) continue
            if (orig.label !== row.label.trim()) return true
            if (orig.colorKey !== row.colorKey) return true
            if (orig.defaultDepartmentId !== row.defaultDepartmentId) return true
            if (orig.isActive !== row.isActive) return true
        }
        return false
    }, [state.draft, state.original])

    const updateField = useCallback((id: string, patch: Partial<CategoryDraft>) => {
        dispatch({ type: 'UPDATE_FIELD', id, patch })
    }, [])

    const save = useCallback(async (refresh: () => Promise<void>) => {
        dispatch({ type: 'SAVE_START' })
        try {
            for (const row of state.draft) {
                const trimmed = row.label.trim()
                if (!trimmed) {
                    throw new Error('Every category needs a label')
                }
                if (!row.defaultDepartmentId) {
                    throw new Error(`Category "${trimmed}" needs a routing department`)
                }
                const orig = state.original.find(c => c.id === row.id)
                if (!orig) continue
                const changed =
                    orig.label !== trimmed ||
                    orig.colorKey !== row.colorKey ||
                    orig.defaultDepartmentId !== row.defaultDepartmentId ||
                    orig.isActive !== row.isActive
                if (changed) {
                    await updateCategory(row.id, {
                        label: trimmed,
                        colorKey: row.colorKey,
                        defaultDepartmentId: row.defaultDepartmentId,
                        isActive: row.isActive,
                    })
                }
            }
            await refresh()
        } catch (err) {
            dispatch({ type: 'SAVE_ERROR', error: err instanceof Error ? err.message : 'Save failed' })
            throw err
        }
    }, [state.draft, state.original])

    const reset = useCallback(() => {
        dispatch({ type: 'RESET', categories: state.original })
    }, [state.original])

    return {
        state: {
            draft: state.draft,
            isDirty,
            isSaving: state.isSaving,
            error: state.error,
        },
        actions: { updateField, save, reset },
    }
}
