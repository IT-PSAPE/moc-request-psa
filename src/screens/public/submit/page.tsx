import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowLeft, ArrowRight, Send } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/controls/button'
import { Spinner } from '@/components/feedback/spinner'
import { fetchWorkspaceBySlug } from '@/data/fetch-workspaces'
import { fetchPublicCategories } from '@/data/fetch-categories'
import { submitPublicRequest } from '@/data/submit-public-request'
import { getErrorMessage } from '@/utils/get-error-message'
import { PublicLayout } from '@/features/public-submit/public-layout'
import { SubmitProgress, type ProgressStep } from '@/features/public-submit/submit-progress'
import { BasicInfoStep, DetailsStep, initialFormState, type SubmissionFormState } from '@/features/public-submit/submission-form'
import { SubmissionReview } from '@/features/public-submit/submission-review'
import type { Category } from '@/types/categories'

type StepId = 'basic' | 'details' | 'review'

const STEPS: ProgressStep[] = [
    { id: 'basic', label: 'Basic Info' },
    { id: 'details', label: 'Details' },
    { id: 'review', label: 'Review' },
]

type ResolvedWorkspace = { id: string; name: string; slug: string; description: string | null }

export function PublicSubmitScreen() {
    const navigate = useNavigate()
    const { workspaceSlug } = useParams<{ workspaceSlug: string }>()
    const [resolving, setResolving] = useState<boolean>(() => Boolean(workspaceSlug))
    const [workspace, setWorkspace] = useState<ResolvedWorkspace | null>(null)
    const [categories, setCategories] = useState<Category[]>([])
    const [categoriesLoading, setCategoriesLoading] = useState(false)
    const [step, setStep] = useState<StepId>('basic')
    const [form, setForm] = useState<SubmissionFormState>(initialFormState)
    const [error, setError] = useState('')
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        if (!workspaceSlug) return
        let active = true
        fetchWorkspaceBySlug(workspaceSlug)
            .then(ws => {
                if (!active) return
                setWorkspace(ws)
                setResolving(false)
            })
            .catch(() => {
                if (!active) return
                setWorkspace(null)
                setResolving(false)
            })
        return () => { active = false }
    }, [workspaceSlug])

    useEffect(() => {
        if (!workspace) return
        let active = true
        queueMicrotask(() => {
            if (!active) return
            setCategoriesLoading(true)
        })
        fetchPublicCategories(workspace.id)
            .then(list => {
                if (!active) return
                setCategories(list)
                setCategoriesLoading(false)
            })
            .catch(err => {
                if (!active) return
                setCategories([])
                setCategoriesLoading(false)
                setError(getErrorMessage(err, 'Could not load categories.'))
            })
        return () => { active = false }
    }, [workspace])

    function handleStateChange<K extends keyof SubmissionFormState>(field: K, value: SubmissionFormState[K]) {
        setForm(prev => ({ ...prev, [field]: value }))
    }

    const basicInfoComplete = useMemo(() => (
        form.title.trim() !== ''
        && form.requestedByName.trim() !== ''
        && form.categoryId !== ''
        && form.dueDate !== null
    ), [form])

    const detailsComplete = useMemo(() => (
        form.who.trim() !== ''
        && form.what.trim() !== ''
        && form.when.trim() !== ''
        && form.where.trim() !== ''
        && form.why.trim() !== ''
        && form.how.trim() !== ''
    ), [form])

    function handleNext(e: FormEvent) {
        e.preventDefault()
        setError('')
        if (step === 'basic') {
            if (!basicInfoComplete) {
                setError('Fill in every required field to continue.')
                return
            }
            setStep('details')
        } else if (step === 'details') {
            if (!detailsComplete) {
                setError('Tell us about every "W" and the "How" to continue.')
                return
            }
            setStep('review')
        }
    }

    function handleBack() {
        setError('')
        if (step === 'details') setStep('basic')
        else if (step === 'review') setStep('details')
    }

    async function handleSubmit() {
        if (!workspace) return
        setError('')
        setSubmitting(true)
        try {
            const submission = await submitPublicRequest({
                workspaceId: workspace.id,
                categoryId: form.categoryId,
                title: form.title,
                requestedByName: form.requestedByName,
                requestedByEmail: form.requestedByEmail || null,
                priority: form.priority,
                dueDate: form.dueDate,
                who: form.who,
                what: form.what,
                when: form.when,
                where: form.where,
                why: form.why,
                how: form.how,
                notes: form.notes,
            })
            navigate('/submit/success', {
                replace: true,
                state: {
                    trackingId: submission.trackingId,
                    workspaceName: workspace.name,
                    workspaceSlug: workspace.slug,
                },
            })
        } catch (err) {
            setError(getErrorMessage(err, 'Submission failed.'))
            setSubmitting(false)
        }
    }

    if (resolving) {
        return (
            <PublicLayout title="Submit a request">
                <div className="flex justify-center py-8"><Spinner size="lg" /></div>
            </PublicLayout>
        )
    }

    if (!workspace) {
        return (
            <PublicLayout
                title="Workspace not found"
                subtitle="The submission link you followed doesn't match a known workspace."
            >
                <p className="paragraph-sm text-tertiary">
                    Double-check the link your team shared with you, or get in touch with them for the correct URL.
                </p>
            </PublicLayout>
        )
    }

    return (
        <PublicLayout
            eyebrow={`Submitting to ${workspace.name}`}
            title="New request"
            subtitle="Fill in the details for your production request."
        >
            <div className="space-y-8">
                <SubmitProgress steps={STEPS} activeStep={step} />

                {error && (
                    <div className="rounded-lg border border-error bg-error_subtle p-3">
                        <p className="paragraph-sm text-error">{error}</p>
                    </div>
                )}

                {step === 'basic' && (
                    <form onSubmit={handleNext} className="space-y-6">
                        <BasicInfoStep
                            state={form}
                            onChange={handleStateChange}
                            categories={categories}
                            categoriesLoading={categoriesLoading}
                        />
                        <Button
                            type="submit"
                            icon={<ArrowRight />}
                            iconPosition="trailing"
                            disabled={!basicInfoComplete}
                            className="w-full"
                        >
                            Next
                        </Button>
                    </form>
                )}

                {step === 'details' && (
                    <form onSubmit={handleNext} className="space-y-6">
                        <DetailsStep state={form} onChange={handleStateChange} />
                        <div className="grid grid-cols-2 gap-3">
                            <Button type="button" variant="secondary" icon={<ArrowLeft />} onClick={handleBack} className="w-full">
                                Back
                            </Button>
                            <Button
                                type="submit"
                                icon={<ArrowRight />}
                                iconPosition="trailing"
                                disabled={!detailsComplete}
                                className="w-full"
                            >
                                Next
                            </Button>
                        </div>
                    </form>
                )}

                {step === 'review' && (
                    <div className="space-y-6">
                        <SubmissionReview state={form} categories={categories} />
                        <div className="grid grid-cols-2 gap-3">
                            <Button type="button" variant="secondary" icon={<ArrowLeft />} onClick={handleBack} disabled={submitting} className="w-full">
                                Back
                            </Button>
                            <Button
                                type="button"
                                icon={<Send />}
                                onClick={handleSubmit}
                                disabled={submitting}
                                className="w-full"
                            >
                                {submitting ? 'Submitting…' : 'Submit'}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </PublicLayout>
    )
}
