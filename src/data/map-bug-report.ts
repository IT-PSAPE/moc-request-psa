import type { BugReport, BugReportContext } from '@/types/bug-reports'

export type BugReportRow = {
    id: string
    reporter_id: string | null
    reporter_name: string | null
    reporter_email: string | null
    workspace_id: string | null
    description: string
    url: string
    user_agent: string
    platform: string | null
    language: string | null
    timezone: string | null
    viewport_width: number
    viewport_height: number
    screen_width: number
    screen_height: number
    device_pixel_ratio: number
    status: BugReport['status']
    created_at: string
}

export function mapBugReport(row: BugReportRow): BugReport {
    const context: BugReportContext = {
        url: row.url,
        userAgent: row.user_agent,
        platform: row.platform,
        language: row.language,
        timezone: row.timezone,
        viewportWidth: row.viewport_width,
        viewportHeight: row.viewport_height,
        screenWidth: row.screen_width,
        screenHeight: row.screen_height,
        devicePixelRatio: row.device_pixel_ratio,
    }

    return {
        id: row.id,
        reporterId: row.reporter_id,
        reporterName: row.reporter_name,
        reporterEmail: row.reporter_email,
        workspaceId: row.workspace_id,
        description: row.description,
        context,
        status: row.status,
        createdAt: row.created_at,
    }
}
