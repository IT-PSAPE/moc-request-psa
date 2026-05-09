import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { PublicLayout } from '@/features/public-submit/public-layout'
import { SubmissionSuccess } from '@/features/public-submit/submission-success'
import { routes } from '@/screens/app-routes'

type SuccessState = {
    trackingId: string
    workspaceName: string
    workspaceSlug: string
}

export function PublicSubmitSuccessScreen() {
    const navigate = useNavigate()
    const location = useLocation()
    const state = location.state as SuccessState | null

    if (!state?.trackingId || !state?.workspaceSlug) {
        return <Navigate to={`/${routes.login}`} replace />
    }

    function handleSubmitAnother() {
        navigate(`/submit/${state!.workspaceSlug}`, { replace: true })
    }

    return (
        <PublicLayout title="Thanks for your submission">
            <SubmissionSuccess
                trackingId={state.trackingId}
                workspaceName={state.workspaceName}
                onSubmitAnother={handleSubmitAnother}
            />
        </PublicLayout>
    )
}
