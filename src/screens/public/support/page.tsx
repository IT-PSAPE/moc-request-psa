import { Link } from 'react-router-dom'
import { PublicLayout } from '@/features/public-submit/public-layout'
import { routes } from '@/screens/app-routes'

export function PublicSupportScreen() {
    return (
        <PublicLayout
            eyebrow="Help"
            title="Support"
            subtitle="Common questions, and how to reach us if you're stuck."
        >
            <div className="space-y-6 paragraph-md text-tertiary">
                <section className="space-y-2">
                    <h2 className="label-md text-primary">I want to track a request I submitted</h2>
                    <p>
                        Every submission produces an 8-character tracking ID. Open{' '}
                        <code className="font-mono paragraph-sm text-tertiary">/track/&lt;your-id&gt;</code>{' '}
                        to see the current status, priority, category, and which department the request is with. The
                        tracking page is read-only and does not show internal notes, comments, or assignees.
                    </p>
                </section>

                <section className="space-y-2">
                    <h2 className="label-md text-primary">I lost my tracking ID</h2>
                    <p>
                        We can't recover a tracking ID for you — it isn't linked to an email or account. If you provided
                        your name and email when you submitted, contact the workspace directly: their admins can look up
                        your request by name. If you're not sure who to ask, email us at{' '}
                        <a href="mailto:dev.psape@gmail.com" className="text-brand_secondary hover:underline">
                            dev.psape@gmail.com
                        </a>{' '}
                        and we'll route it.
                    </p>
                </section>

                <section className="space-y-2">
                    <h2 className="label-md text-primary">My workspace isn't in the dropdown</h2>
                    <p>
                        Only workspaces that have at least one active member and at least one active category appear in
                        the public form. If yours is missing, ask the workspace admin to:
                    </p>
                    <ul className="list-disc space-y-1 pl-5">
                        <li>Add at least one category under <strong className="text-primary">Settings → Categories</strong>.</li>
                        <li>Make sure the category is marked <strong className="text-primary">active</strong>.</li>
                        <li>Optionally pick a default department so requests route automatically.</li>
                    </ul>
                </section>

                <section className="space-y-2">
                    <h2 className="label-md text-primary">My sign-up is still pending</h2>
                    <p>
                        New workspace sign-ups land on the pending screen until an admin of that workspace approves
                        them. Reach out to a workspace admin and ask them to review you under{' '}
                        <strong className="text-primary">Settings → Members → All members</strong>.
                    </p>
                </section>

                <section className="space-y-2">
                    <h2 className="label-md text-primary">I want my submitted data deleted</h2>
                    <p>
                        Each workspace controls its own data. Contact the workspace you submitted to and ask them to
                        delete the request — admins can do this from the request detail page. If you can't reach them,
                        email us and we'll relay the request.
                    </p>
                </section>

                <section className="space-y-2">
                    <h2 className="label-md text-primary">I think I found a bug</h2>
                    <p>
                        Email us with what you were doing, what you expected, and what happened. A screenshot helps. If
                        the bug is on a tracking page, including the tracking ID lets us reproduce it.
                    </p>
                </section>

                <section className="space-y-2">
                    <h2 className="label-md text-primary">Contact</h2>
                    <p>
                        For anything not covered above, email{' '}
                        <a href="mailto:dev.psape@gmail.com" className="text-brand_secondary hover:underline">
                            dev.psape@gmail.com
                        </a>. Mention the workspace name if your question is workspace-specific.
                    </p>
                </section>

                <p className="paragraph-sm text-quaternary pt-2 border-t border-secondary">
                    See also: <Link to={`/${routes.privacy}`} className="text-brand_secondary hover:underline">Privacy policy</Link>{' '}
                    · <Link to={`/${routes.terms}`} className="text-brand_secondary hover:underline">Terms of use</Link>
                </p>
            </div>
        </PublicLayout>
    )
}
