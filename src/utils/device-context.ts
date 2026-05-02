import type { BugReportContext } from '@/types/bug-reports'

export function captureDeviceContext(): BugReportContext {
    let timezone: string | null = null
    try {
        timezone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? null
    } catch {
        timezone = null
    }

    const nav = typeof navigator !== 'undefined' ? navigator : null

    return {
        url: typeof window !== 'undefined' ? window.location.href : '',
        userAgent: nav?.userAgent ?? '',
        platform: nav?.platform ?? null,
        language: nav?.language ?? null,
        timezone,
        viewportWidth: typeof window !== 'undefined' ? window.innerWidth : 0,
        viewportHeight: typeof window !== 'undefined' ? window.innerHeight : 0,
        screenWidth: typeof window !== 'undefined' ? window.screen?.width ?? 0 : 0,
        screenHeight: typeof window !== 'undefined' ? window.screen?.height ?? 0 : 0,
        devicePixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio ?? 1 : 1,
    }
}
