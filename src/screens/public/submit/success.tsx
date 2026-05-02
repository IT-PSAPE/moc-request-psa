import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { PublicLayout } from '@/features/public-submit/public-layout'
import { SubmissionSuccess } from '@/features/public-submit/submission-success'
import { routes } from '@/screens/app-routes'

type SuccessState = {
    trackingId: string
    workspaceName: string
}

export function PublicSubmitSuccessScreen() {
    const navigate = useNavigate()
    const location = useLocation()
    const state = location.state as SuccessState | null

    if (!state?.trackingId) {
        return <Navigate to={`/${routes.submit}`} replace />
    }

    function handleSubmitAnother() {
        navigate(`/${routes.submit}`, { replace: true })
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
