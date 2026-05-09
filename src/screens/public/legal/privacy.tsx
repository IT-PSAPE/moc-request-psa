import { PublicLayout } from '@/features/public-submit/public-layout'

export function PublicPrivacyScreen() {
    return (
        <PublicLayout
            eyebrow="Legal"
            title="Privacy policy"
            subtitle="What we collect when you submit a request, who can see it, and how long it sticks around."
        >
            <div className="space-y-6 paragraph-md text-tertiary">
                <p className="paragraph-sm text-quaternary">Last updated: 3 May 2026</p>

                <section className="space-y-2">
                    <h2 className="label-md text-primary">What MOC Request is</h2>
                    <p>
                        MOC Request is a request-intake platform. External requesters submit work to a workspace (a team
                        running the platform), and that workspace's staff review, route, and resolve it. Each workspace
                        is a separate tenant — they don't see each other's data.
                    </p>
                </section>

                <section className="space-y-2">
                    <h2 className="label-md text-primary">What we collect when you submit a request</h2>
                    <ul className="list-disc space-y-1 pl-5">
                        <li><strong className="text-primary">Required:</strong> the workspace and category you picked, a title, your name, and the "What" of your request.</li>
                        <li><strong className="text-primary">Optional:</strong> your email, priority, preferred due date, and the rest of the 5 Ws and 1 H (Who, When, Where, Why, How).</li>
                        <li>An 8-character tracking ID we generate so you can look the request up later.</li>
                    </ul>
                    <p>
                        We do not require you to create an account to submit a request. You only need an account if you
                        work inside a workspace.
                    </p>
                </section>

                <section className="space-y-2">
                    <h2 className="label-md text-primary">What we do not collect</h2>
                    <p>
                        No analytics, no advertising trackers, no third-party cookies. The app stores only the data you
                        enter on the form, plus the account details needed to sign in if you're a workspace member, plus
                        the bug-report context described below.
                    </p>
                </section>

                <section className="space-y-2">
                    <h2 className="label-md text-primary">When you report a bug</h2>
                    <p>
                        Workspace members can submit a bug report from the account menu. To save you typing, the report
                        automatically attaches:
                    </p>
                    <ul className="list-disc space-y-1 pl-5">
                        <li>Your name, email, and workspace (so we can write back if we have a question).</li>
                        <li>The URL you were on when you opened the report.</li>
                        <li>Your browser's user-agent string, language, time zone, and reported platform.</li>
                        <li>Window and screen dimensions and the device pixel ratio (to reproduce layout bugs).</li>
                    </ul>
                    <p>
                        We do <strong className="text-primary">not</strong> capture screenshots, request bodies, form
                        contents, keystrokes, mouse movement, or any data from the page you were on. The only free-text
                        field is the description you write yourself.
                    </p>
                    <p>
                        Bug reports are visible to the platform team only — they are not exposed to your workspace's
                        admins. We keep them until they are resolved, then for a reasonable period afterwards while we
                        confirm the fix shipped.
                    </p>
                </section>

                <section className="space-y-2">
                    <h2 className="label-md text-primary">Who can see your request</h2>
                    <ul className="list-disc space-y-1 pl-5">
                        <li>Admins of the workspace you submitted to.</li>
                        <li>Members of the department the request is routed to (if the category has a default department).</li>
                        <li>Anyone with your tracking ID can see a stripped-down status page at{' '}
                            <code className="font-mono paragraph-sm text-tertiary">/track/&lt;tracking-id&gt;</code>{' '}
                            — title, status, priority, category, department, your name, and timestamps. Internal notes,
                            comments, and assignees are not exposed there.
                        </li>
                    </ul>
                    <p>
                        Treat the tracking link like a key. Anyone you share it with can see that scrubbed status page.
                    </p>
                </section>

                <section className="space-y-2">
                    <h2 className="label-md text-primary">Where your data lives</h2>
                    <p>
                        Requests are stored in a Supabase Postgres database with row-level access rules so each
                        workspace sees only its own data.
                    </p>
                </section>

                <section className="space-y-2">
                    <h2 className="label-md text-primary">How long we keep it</h2>
                    <p>
                        Each workspace controls retention for its own requests. Admins can archive a request (it stays
                        in the workspace, hidden from active views) or delete it (cascades through comments, assignees,
                        and the activity timeline). If you want a request you submitted to be deleted, contact the
                        workspace directly — or email us and we'll route the request.
                    </p>
                </section>

                <section className="space-y-2">
                    <h2 className="label-md text-primary">Email notifications</h2>
                    <p>
                        Email notifications are not yet implemented. We do not currently send confirmation, status, or
                        marketing emails. If you provide an email when submitting, the workspace's admins may use it to
                        follow up directly.
                    </p>
                </section>

                <section className="space-y-2">
                    <h2 className="label-md text-primary">Contact</h2>
                    <p>
                        Questions about this policy or about a request you submitted: email{' '}
                        <a href="mailto:dev.psape@gmail.com" className="text-brand_secondary hover:underline">
                            dev.psape@gmail.com
                        </a>.
                    </p>
                </section>
            </div>
        </PublicLayout>
    )
}
