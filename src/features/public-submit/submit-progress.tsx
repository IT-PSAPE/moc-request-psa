import { cn } from '@/utils/cn'

export type ProgressStep = {
    id: string
    label: string
}

type SubmitProgressProps = {
    steps: ProgressStep[]
    activeStep: string
}

export function SubmitProgress({ steps, activeStep }: SubmitProgressProps) {
    const activeIndex = Math.max(0, steps.findIndex(s => s.id === activeStep))
    const totalSegments = Math.max(steps.length - 1, 1)
    const progress = activeIndex / totalSegments

    return (
        <div className="w-full">
            <div className="relative h-0.5 bg-secondary rounded-full">
                <div
                    className="absolute inset-y-0 left-0 bg-brand_solid rounded-full transition-[width] duration-300"
                    style={{ width: `${progress * 100}%` }}
                    aria-hidden="true"
                />
                <div className="absolute inset-0 flex justify-between items-center">
                    {steps.map((step, index) => {
                        const reached = index <= activeIndex
                        return (
                            <span
                                key={step.id}
                                className={cn(
                                    'size-2.5 rounded-full transition-colors duration-300',
                                    reached ? 'bg-brand_solid' : 'bg-secondary'
                                )}
                                aria-hidden="true"
                            />
                        )
                    })}
                </div>
            </div>

            <div className="mt-3 grid" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
                {steps.map((step, index) => {
                    const isActive = index === activeIndex
                    const align = index === 0 ? 'text-left' : index === steps.length - 1 ? 'text-right' : 'text-center'
                    return (
                        <span
                            key={step.id}
                            className={cn(
                                'paragraph-sm transition-colors',
                                align,
                                isActive ? 'text-primary font-medium' : 'text-tertiary'
                            )}
                        >
                            {step.label}
                        </span>
                    )
                })}
            </div>
        </div>
    )
}
