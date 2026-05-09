import { supabase } from '@/lib/supabase'
import { mapBugReport, type BugReportRow } from './map-bug-report'
import { BUG_REPORT_DESCRIPTION_MAX, type BugReport, type BugReportContext } from '@/types/bug-reports'

type SubmitBugReportInput = {
    description: string
    reporterId: string | null
    reporterName: string | null
    reporterEmail: string | null
    workspaceId: string | null
    context: BugReportContext
}

export async function submitBugReport(input: SubmitBugReportInput): Promise<BugReport> {
    const trimmed = input.description.trim()
    if (!trimmed) throw new Error('Please describe what happened')
    if (trimmed.length > BUG_REPORT_DESCRIPTION_MAX) {
        throw new Error(`Description must be ${BUG_REPORT_DESCRIPTION_MAX} characters or fewer`)
    }

    const { data, error } = await supabase
        .from('bug_reports')
        .insert({
            reporter_id: input.reporterId,
            reporter_name: input.reporterName,
            reporter_email: input.reporterEmail,
            workspace_id: input.workspaceId,
            description: trimmed,
            url: input.context.url,
            user_agent: input.context.userAgent,
            platform: input.context.platform,
            language: input.context.language,
            timezone: input.context.timezone,
            viewport_width: input.context.viewportWidth,
            viewport_height: input.context.viewportHeight,
            screen_width: input.context.screenWidth,
            screen_height: input.context.screenHeight,
            device_pixel_ratio: input.context.devicePixelRatio,
        })
        .select('*')
        .single<BugReportRow>()
    if (error || !data) throw new Error(error?.message ?? 'Bug report insert failed')
    return mapBugReport(data)
}
