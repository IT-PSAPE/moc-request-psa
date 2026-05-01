import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/controls/button'
import { Select } from '@/components/form/select'
import { FormLabel } from '@/components/form/form-label'
import { Spinner } from '@/components/feedback/spinner'
import { ensureSeeded } from '@/data/store/reset'
import { fetchPublicWorkspaces } from '@/data/fetch-workspaces'
import { fetchPublicCategories } from '@/data/fetch-categories'
import { submitPublicRequest } from '@/data/submit-public-request'
import { getErrorMessage } from '@/utils/get-error-message'
import { PublicLayout } from '@/features/public-submit/public-layout'
import { SubmissionForm, initialFormState, type SubmissionFormState } from '@/features/public-submit/submission-form'
import { SubmissionSuccess } from '@/features/public-submit/submission-success'
import type { Workspace } from '@/types/workspaces'
import type { Category } from '@/types/categories'

type Step = 'workspace' | 'category' | 'form' | 'success'

type WorkspaceOption = Pick<Workspace, 'id' | 'name' | 'slug'>

export function PublicSubmitScreen() {
    const [step, setStep] = useState<Step>('workspace')
    const [workspaces, setWorkspaces] = useState<WorkspaceOption[]>([])
    const [workspaceId, setWorkspaceId] = useState('')
    const [categories, setCategories] = useState<Category[]>([])
    const [categoryId, setCategoryId] = useState('')
    const [form, setForm] = useState<SubmissionFormState>(initialFormState)
    const [error, setError] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [result, setResult] = useState<{ trackingId: string; workspaceName: string } | null>(null)

    useEffect(() => {
        ensureSeeded()
        let active = true
        fetchPublicWorkspaces().then(list => {
            if (!active) return
            setWorkspaces(list)
            setWorkspaceId(prev => prev || list[0]?.id || '')
        })
        return () => { active = false }
    }, [])

    useEffect(() => {
        if (!workspaceId) return
        let active = true
        fetchPublicCategories(workspaceId).then(list => {
            if (!active) return
            setCategories(list)
            setCategoryId(list[0]?.id ?? '')
        })
        return () => { active = false }
    }, [workspaceId])

    function handleStateChange<K extends keyof SubmissionFormState>(field: K, value: SubmissionFormState[K]) {
        setForm(prev => ({ ...prev, [field]: value }))
    }

    function handleWorkspaceContinue(e: FormEvent) {
        e.preventDefault()
        if (!workspaceId) return
        setStep('category')
    }

    function handleCategoryContinue(e: FormEvent) {
        e.preventDefault()
        if (!categoryId) return
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
            setResult({ trackingId: submission.trackingId, workspaceName: ws?.name ?? 'the team' })
            setStep('success')
        } catch (err) {
            setError(getErrorMessage(err, 'Submission failed.'))
        } finally {
            setSubmitting(false)
        }
    }

    function handleSubmitAnother() {
        setForm(initialFormState)
        setError('')
        setResult(null)
        setStep('workspace')
    }

    if (step === 'success' && result) {
        return (
            <PublicLayout title="MOC Request" subtitle="Thanks for your submission">
                <SubmissionSuccess
                    trackingId={result.trackingId}
                    workspaceName={result.workspaceName}
                    onSubmitAnother={handleSubmitAnother}
                />
            </PublicLayout>
        )
    }

    if (workspaces.length === 0) {
        return (
            <PublicLayout title="MOC Request">
                <div className="flex justify-center py-8"><Spinner size="lg" /></div>
            </PublicLayout>
        )
    }

    const stepEyebrow = step === 'workspace' ? 'Step 1 of 3' : step === 'category' ? 'Step 2 of 3' : 'Step 3 of 3'
    const stepTitle = step === 'workspace' ? 'Submit a request' : step === 'category' ? 'Pick a category' : 'Tell us about it'
    const stepSub = step === 'workspace'
        ? 'Choose the team you want to send this to.'
        : step === 'category'
            ? 'We\'ll route your request to the right department.'
            : 'The more detail, the better.'

    return (
        <PublicLayout eyebrow={stepEyebrow} title={stepTitle} subtitle={stepSub}>
            {error && (
                <div className="mb-4 rounded-lg border border-error bg-error_subtle p-3">
                    <p className="paragraph-sm text-error">{error}</p>
                </div>
            )}

            {step === 'workspace' && (
                <form onSubmit={handleWorkspaceContinue} className="space-y-4">
                    <div className="space-y-1">
                        <FormLabel label="Workspace" required />
                        <Select value={workspaceId} onChange={e => setWorkspaceId(e.target.value)}>
                            {workspaces.map(w => (
                                <option key={w.id} value={w.id}>{w.name}</option>
                            ))}
                        </Select>
                    </div>
                    <Button type="submit" className="w-full">Continue</Button>
                </form>
            )}

            {step === 'category' && (
                <form onSubmit={handleCategoryContinue} className="space-y-4">
                    <div className="space-y-1">
                        <FormLabel label="What's this about?" required />
                        <Select value={categoryId} onChange={e => setCategoryId(e.target.value)} required>
                            {categories.length === 0 && <option value="">No categories available</option>}
                            {categories.map(c => (
                                <option key={c.id} value={c.id}>{c.label}</option>
                            ))}
                        </Select>
                    </div>
                    <div className="flex gap-2">
                        <Button type="button" variant="ghost" icon={<ArrowLeft />} onClick={() => setStep('workspace')}>
                            Back
                        </Button>
                        <Button type="submit" className="flex-1" disabled={categories.length === 0}>
                            Continue
                        </Button>
                    </div>
                </form>
            )}

            {step === 'form' && (
                <form onSubmit={handleSubmit} className="space-y-4">
                    <SubmissionForm state={form} onChange={handleStateChange} />
                    <div className="flex gap-2 pt-2">
                        <Button type="button" variant="ghost" icon={<ArrowLeft />} onClick={() => setStep('category')} disabled={submitting}>
                            Back
                        </Button>
                        <Button type="submit" className="flex-1" disabled={submitting}>
                            {submitting ? 'Submitting…' : 'Submit request'}
                        </Button>
                    </div>
                </form>
            )}
        </PublicLayout>
    )
}
