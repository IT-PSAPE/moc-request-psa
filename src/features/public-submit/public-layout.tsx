import type { ReactNode } from 'react'

type PublicLayoutProps = {
    children: ReactNode
    eyebrow?: string
    title: string
    subtitle?: string
}

export function PublicLayout({ children, eyebrow, title, subtitle }: PublicLayoutProps) {
    return (
        <div className="min-h-dvh bg-secondary px-4 py-12">
            <div className="mx-auto w-full max-w-xl space-y-6">
                <div className="text-center space-y-1">
                    {eyebrow && <p className="paragraph-xs text-quaternary tracking-wide uppercase">{eyebrow}</p>}
                    <h1 className="title-h5">{title}</h1>
                    {subtitle && <p className="paragraph-sm text-tertiary">{subtitle}</p>}
                </div>
                <div className="rounded-xl border border-secondary bg-primary p-6 shadow-xs">
                    {children}
                </div>
                <p className="text-center paragraph-xs text-quaternary">
                    Already have an account? <a href="/login" className="text-brand_secondary hover:underline">Sign in</a>
                </p>
            </div>
        </div>
    )
}
