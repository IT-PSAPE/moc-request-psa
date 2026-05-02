export type BugReportContext = {
    url: string
    userAgent: string
    platform: string | null
    language: string | null
    timezone: string | null
    viewportWidth: number
    viewportHeight: number
    screenWidth: number
    screenHeight: number
    devicePixelRatio: number
}

export type BugReport = {
    id: string
    reporterId: string | null
    reporterName: string | null
    reporterEmail: string | null
    workspaceId: string | null
    description: string
    context: BugReportContext
    status: 'new' | 'reviewing' | 'resolved' | 'wont_fix'
    createdAt: string
}

export const BUG_REPORT_DESCRIPTION_MAX = 2000
