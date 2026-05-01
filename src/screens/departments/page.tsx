import { useEffect, useMemo, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { fetchDepartmentById } from '@/data/fetch-departments'
import { Spinner } from '@/components/feedback/spinner'
import { useRequests } from '@/features/requests/request-provider'
import { RequestViews } from '@/features/requests/request-views'
import { routes } from '@/screens/app-routes'
import type { Department } from '@/types/departments'

type Resolution = { kind: 'loading' } | { kind: 'found'; department: Department } | { kind: 'missing' }

export function DepartmentScreen() {
    const { departmentId } = useParams<{ departmentId: string }>()
    const [resolution, setResolution] = useState<Resolution>({ kind: 'loading' })
    const { state, actions } = useRequests()

    useEffect(() => {
        let active = true
        if (!departmentId) {
            queueMicrotask(() => { if (active) setResolution({ kind: 'missing' }) })
            return () => { active = false }
        }

        queueMicrotask(() => { if (active) setResolution({ kind: 'loading' }) })
        fetchDepartmentById(departmentId).then(result => {
            if (!active) return
            setResolution(result ? { kind: 'found', department: result } : { kind: 'missing' })
        })
        void actions.loadActiveRequests()
        return () => { active = false }
    }, [departmentId, actions])

    const requests = useMemo(
        () => state.activeRequests.filter(r => r.departmentId === departmentId),
        [state.activeRequests, departmentId],
    )

    if (resolution.kind === 'loading') {
        return (
            <div className="flex min-h-full items-center justify-center p-12">
                <Spinner size="lg" />
            </div>
        )
    }

    if (resolution.kind === 'missing') {
        return <Navigate to={`/${routes.dashboard}`} replace />
    }

    return (
        <div className="px-6 py-8 max-w-7xl mx-auto space-y-6">
            <div className="space-y-1 px-4">
                <h1 className="title-h5">{resolution.department.name}</h1>
                {resolution.department.description && (
                    <p className="paragraph-sm text-tertiary">{resolution.department.description}</p>
                )}
            </div>
            <RequestViews requests={requests} />
        </div>
    )
}
