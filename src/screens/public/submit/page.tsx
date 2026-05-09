import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/controls/button'
import { Select } from '@/components/form/select'
import { FormLabel } from '@/components/form/form-label'
import { Spinner } from '@/components/feedback/spinner'
import { fetchWorkspaceBySlug } from '@/data/fetch-workspaces'
import { fetchPublicCategories } from '@/data/fetch-categories'
import { submitPublicRequest } from '@/data/submit-public-request'
import { getErrorMessage } from '@/utils/get-error-message'
import { PublicLayout } from '@/features/public-submit/public-layout'
import { SubmissionForm, initialFormState, type SubmissionFormState } from '@/features/public-submit/submission-form'
import type { Category } from '@/types/categories'

type Step = 'select' | 'form'

type ResolvedWorkspace = { id: string; name: string; slug: string; description: string | null }

export function PublicSubmitScreen() {
    const navigate = useNavigate()
    const { workspaceSlug } = useParams<{ workspaceSlug: string }>()
    const [resolving, setResolving] = useState<boolean>(() => Boolean(workspaceSlug))
    const [workspace, setWorkspace] = useState<ResolvedWorkspace | null>(null)
    const [step, setStep] = useState<Step>('select')
    const [categories, setCategories] = useState<Category[]>([])
    const [categoriesLoading, setCategoriesLoading] = useState(false)
    const [categoryId, setCategoryId] = useState('')
    const [form, setForm] = useState<SubmissionFormState>(initialFormState)
    const [error, setError] = useState('')
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        if (!workspaceSlug) return
        let active = true
        fetchWorkspaceBySlug(workspaceSlug).then(ws => {
            if (!active) return
            setWorkspace(ws)
            setResolving(false)
        })
        return () => { active = false }
    }, [workspaceSlug])

    useEffect(() => {
        if (!workspace) return
        let active = true
        setCategoriesLoading(true)
        setCategoryId('')
        fetchPublicCategories(workspace.id).then(list => {
            if (!active) return
            setCategories(list)
            setCategoriesLoading(false)
        })
        return () => { active = false }
    }, [workspace])

    function handleStateChange<K extends keyof SubmissionFormState>(field: K, value: SubmissionFormState[K]) {
        setForm(prev => ({ ...prev, [field]: value }))
    }

    function handleSelectContinue(e: FormEvent) {
        e.preventDefault()
        if (!categoryId) return
        setStep('form')
    }

    async function handleSubmit(e: FormEvent) {
        e.preventDefault()
        setError('')
        if (!workspace) return

        if (!form.title.trim()) return setError('Please give your request a title.')
        if (!form.requestedByName.trim()) return setError('Please tell us your name.')
        if (!form.what.trim()) return setError('Please describe what you need (the "What").')

        setSubmitting(true)
        try {
            const submission = await submitPublicRequest({
                workspaceId: workspace.id,
                categoryId,
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
        } finally {
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

    if (step === 'select') {
        const canContinue = Boolean(categoryId && !categoriesLoading)
        return (
            <PublicLayout
                eyebrow={`Submitting to ${workspace.name}`}
                title="What's this request about?"
                subtitle="Pick the category that best fits your request."
            >
                <form onSubmit={handleSelectContinue} className="space-y-5">
                    <div className="space-y-1.5">
                        <FormLabel label="Category" required />
                        <Select
                            value={categoryId}
                            onChange={e => setCategoryId(e.target.value)}
                            disabled={categoriesLoading || categories.length === 0}
                        >
                            <option value="">
                                {categoriesLoading
                                    ? 'Loading categories…'
                                    : categories.length === 0
                                        ? 'No categories available'
                                        : 'Select a category…'}
                            </option>
                            {categories.map(c => (
                                <option key={c.id} value={c.id}>{c.label}</option>
                            ))}
                        </Select>
                    </div>

                    <div className="flex justify-end">
                        <Button type="submit" icon={<ArrowRight />} iconPosition="trailing" disabled={!canContinue}>
                            Continue
                        </Button>
                    </div>
                </form>
            </PublicLayout>
        )
    }

    return (
        <PublicLayout
            eyebrow={`Submitting to ${workspace.name}`}
            title="Tell us about it"
            subtitle="The more detail, the better."
        >
            {error && (
                <div className="rounded-lg border border-error bg-error_subtle p-3">
                    <p className="paragraph-sm text-error">{error}</p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <SubmissionForm state={form} onChange={handleStateChange} />
                <div className="flex items-center justify-between gap-2 pt-2">
                    <Button type="button" variant="ghost" icon={<ArrowLeft />} onClick={() => setStep('select')} disabled={submitting}>
                        Back
                    </Button>
                    <Button type="submit" disabled={submitting}>
                        {submitting ? 'Submitting…' : 'Submit request'}
                    </Button>
                </div>
            </form>
        </PublicLayout>
    )
}
