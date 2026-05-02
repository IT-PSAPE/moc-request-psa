import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/controls/button'
import { Select } from '@/components/form/select'
import { FormLabel } from '@/components/form/form-label'
import { Spinner } from '@/components/feedback/spinner'
import { fetchPublicWorkspaces } from '@/data/fetch-workspaces'
import { fetchPublicCategories } from '@/data/fetch-categories'
import { submitPublicRequest } from '@/data/submit-public-request'
import { getErrorMessage } from '@/utils/get-error-message'
import { PublicLayout } from '@/features/public-submit/public-layout'
import { SubmissionForm, initialFormState, type SubmissionFormState } from '@/features/public-submit/submission-form'
import { routes } from '@/screens/app-routes'
import type { Workspace } from '@/types/workspaces'
import type { Category } from '@/types/categories'

type Step = 'select' | 'form'

type WorkspaceOption = Pick<Workspace, 'id' | 'name' | 'slug'>

export function PublicSubmitScreen() {
    const navigate = useNavigate()
    const [step, setStep] = useState<Step>('select')
    const [workspaces, setWorkspaces] = useState<WorkspaceOption[]>([])
    const [workspaceId, setWorkspaceId] = useState('')
    const [categories, setCategories] = useState<Category[]>([])
    const [categoriesLoading, setCategoriesLoading] = useState(false)
    const [categoryId, setCategoryId] = useState('')
    const [form, setForm] = useState<SubmissionFormState>(initialFormState)
    const [error, setError] = useState('')
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        let active = true
        fetchPublicWorkspaces().then(list => {
            if (!active) return
            setWorkspaces(list)
            setWorkspaceId(prev => prev || list[0]?.id || '')
        })
        return () => { active = false }
    }, [])

    useEffect(() => {
        if (!workspaceId) {
            setCategories([])
            setCategoryId('')
            return
        }
        let active = true
        setCategoriesLoading(true)
        setCategoryId('')
        fetchPublicCategories(workspaceId).then(list => {
            if (!active) return
            setCategories(list)
            setCategoriesLoading(false)
        })
        return () => { active = false }
    }, [workspaceId])

    function handleStateChange<K extends keyof SubmissionFormState>(field: K, value: SubmissionFormState[K]) {
        setForm(prev => ({ ...prev, [field]: value }))
    }

    function handleSelectContinue(e: FormEvent) {
        e.preventDefault()
        if (!workspaceId || !categoryId) return
        setStep('form')
    }

    async function handleSubmit(e: FormEvent) {
        e.preventDefault()
        setError('')

        if (!form.title.trim()) return setError('Please give your request a title.')
        if (!form.requestedByName.trim()) return setError('Please tell us your name.')
        if (!form.what.trim()) return setError('Please describe what you need (the "What").')

        setSubmitting(true)
        try {
            const ws = workspaces.find(w => w.id === workspaceId)
            const submission = await submitPublicRequest({
                workspaceId,
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
            navigate(`/${routes.submitSuccess}`, {
                replace: true,
                state: { trackingId: submission.trackingId, workspaceName: ws?.name ?? 'the team' },
            })
        } catch (err) {
            setError(getErrorMessage(err, 'Submission failed.'))
        } finally {
            setSubmitting(false)
        }
    }

    if (workspaces.length === 0) {
        return (
            <PublicLayout title="Submit a request">
                <div className="flex justify-center py-8"><Spinner size="lg" /></div>
            </PublicLayout>
        )
    }

    if (step === 'select') {
        const canContinue = Boolean(workspaceId && categoryId && !categoriesLoading)
        return (
            <PublicLayout
                eyebrow="Step 1 of 2"
                title="Submit a request"
                subtitle="Pick the team this is for, and what it's about."
            >
                <form onSubmit={handleSelectContinue} className="space-y-5">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-1.5">
                            <FormLabel label="Workspace" required />
                            <Select value={workspaceId} onChange={e => setWorkspaceId(e.target.value)}>
                                {workspaces.map(w => (
                                    <option key={w.id} value={w.id}>{w.name}</option>
                                ))}
                            </Select>
                        </div>
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
            eyebrow="Step 2 of 2"
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
