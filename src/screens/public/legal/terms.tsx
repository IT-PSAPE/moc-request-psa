import { PublicLayout } from '@/features/public-submit/public-layout'

export function PublicTermsScreen() {
    return (
        <PublicLayout
            eyebrow="Legal"
            title="Terms of use"
            subtitle="The ground rules for using MOC Request as a requester or as a workspace member."
        >
            <div className="space-y-6 paragraph-md text-tertiary">
                <p className="paragraph-sm text-quaternary">Last updated: 3 May 2026</p>

                <section className="space-y-2">
                    <h2 className="label-md text-primary">Who's responsible for what</h2>
                    <p>
                        MOC Request is a request-intake platform. We provide the routing, storage, and tracking
                        plumbing. The workspace you submit a request to is responsible for triaging and resolving it.
                        We don't review request contents and we don't act on requests on a workspace's behalf.
                    </p>
                </section>

                <section className="space-y-2">
                    <h2 className="label-md text-primary">If you submit a request</h2>
                    <ul className="list-disc space-y-1 pl-5">
                        <li>The information you enter must be accurate. Don't impersonate someone else and don't submit
                            content you don't have the right to share.</li>
                        <li>Don't submit anything illegal, harassing, or designed to flood the system.</li>
                        <li>The workspace you selected may use the name and email you provide to follow up directly. If
                            you don't want a reply, leave the email blank.</li>
                        <li>There is no service-level guarantee. Whether and when your request is resolved is up to the
                            workspace's own process.</li>
                        <li>Tracking IDs are unguessable but they are not authentication. Whoever has the link to{' '}
                            <code className="font-mono paragraph-sm text-tertiary">/track/&lt;tracking-id&gt;</code> can see
                            the scrubbed status page. Treat the link like a password.</li>
                    </ul>
                </section>

                <section className="space-y-2">
                    <h2 className="label-md text-primary">If you use a workspace</h2>
                    <ul className="list-disc space-y-1 pl-5">
                        <li>Sign-up creates a pending account. A workspace admin must approve you before you can see
                            anything; you'll be parked on the pending screen until they do.</li>
                        <li>Admins are responsible for the data their workspace holds, including responding to deletion
                            requests from people who submitted to them.</li>
                        <li>Don't share request data outside your workspace unless the requester has given permission.</li>
                    </ul>
                </section>

                <section className="space-y-2">
                    <h2 className="label-md text-primary">Bug reports</h2>
                    <p>
                        The "Report a bug" option in the account menu sends a short description plus your browser and
                        device context (URL, user-agent, language, time zone, viewport, and screen size) to the platform
                        team. By using it you agree we can store that information, contact you about the report, and
                        keep it long enough to verify the fix. Don't paste secrets, passwords, or other people's
                        personal data into the description — the platform team will see it verbatim.
                    </p>
                </section>

                <section className="space-y-2">
                    <h2 className="label-md text-primary">Acceptable use</h2>
                    <p>
                        Don't probe the platform for vulnerabilities you don't intend to disclose. Don't try to access
                        another workspace's data. Don't run automated traffic against the public form beyond the
                        ordinary rate of one human filling it in.
                    </p>
                </section>

                <section className="space-y-2">
                    <h2 className="label-md text-primary">Availability</h2>
                    <p>
                        The platform is currently in early development. We don't guarantee uptime, and the public
                        form may be unavailable during deployments.
                    </p>
                </section>

                <section className="space-y-2">
                    <h2 className="label-md text-primary">Liability</h2>
                    <p>
                        MOC Request is provided as-is. We're not liable for losses caused by a workspace failing to act
                        on a request, by data loss, or by the platform being unavailable. Use it for production work at
                        your own discretion.
                    </p>
                </section>

                <section className="space-y-2">
                    <h2 className="label-md text-primary">Changes</h2>
                    <p>
                        We can update these terms. The "Last updated" date at the top reflects the most recent change.
                        Material changes will be flagged in the release notes for a workspace admin to review.
                    </p>
                </section>

                <section className="space-y-2">
                    <h2 className="label-md text-primary">Contact</h2>
                    <p>
                        Questions about these terms: email{' '}
                        <a href="mailto:dev.psape@gmail.com" className="text-brand_secondary hover:underline">
                            dev.psape@gmail.com
                        </a>.
                    </p>
                </section>
            </div>
        </PublicLayout>
    )
}
