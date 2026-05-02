import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { routes } from '@/screens/app-routes'

type PublicLayoutProps = {
    children: ReactNode
    eyebrow?: string
    title?: string
    subtitle?: string
}

export function PublicLayout({ children, eyebrow, title, subtitle }: PublicLayoutProps) {
    return (
        <div className="flex min-h-dvh flex-col bg-secondary">
            <PublicHeader />
            <main className="flex-1 px-4 py-10 md:py-14">
                <div className="mx-auto w-full max-w-3xl space-y-8">
                    {(eyebrow || title || subtitle) && (
                        <header className="space-y-2">
                            {eyebrow && (
                                <p className="paragraph-xs text-quaternary tracking-wide uppercase">{eyebrow}</p>
                            )}
                            {title && <h1 className="title-h4">{title}</h1>}
                            {subtitle && <p className="paragraph-md text-tertiary">{subtitle}</p>}
                        </header>
                    )}
                    {children}
                </div>
            </main>
            <PublicFooter />
        </div>
    )
}

function PublicHeader() {
    return (
        <header className="border-b border-secondary bg-primary">
            <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-3">
                <Link to={`/${routes.submit}`} className="flex items-center gap-2">
                    <div className="size-7 rounded-lg bg-brand_solid grid place-items-center text-primary_on-brand">
                        <span className="label-sm">M</span>
                    </div>
                    <span className="label-md">MOC Request</span>
                </Link>
                <Link to={`/${routes.login}`} className="paragraph-sm text-brand_secondary hover:underline">
                    Sign in
                </Link>
            </div>
        </header>
    )
}

function PublicFooter() {
    return (
        <footer className="border-t border-secondary bg-primary">
            <div className="mx-auto flex w-full max-w-3xl flex-col items-center justify-between gap-2 px-4 py-4 text-center md:flex-row md:text-left">
                <p className="paragraph-xs text-quaternary">© MOC Request</p>
                <nav className="flex items-center gap-4 paragraph-xs text-quaternary">
                    <Link to={`/${routes.privacy}`} className="hover:text-tertiary">Privacy</Link>
                    <Link to={`/${routes.terms}`} className="hover:text-tertiary">Terms</Link>
                    <Link to={`/${routes.support}`} className="hover:text-tertiary">Support</Link>
                </nav>
            </div>
        </footer>
    )
}
