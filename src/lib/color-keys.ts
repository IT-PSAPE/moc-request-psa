export type BadgeColor = 'yellow' | 'green' | 'blue' | 'gray' | 'purple' | 'red'

const FALLBACK: BadgeColor = 'gray'

const COLOR_MAP: Record<string, BadgeColor> = {
    yellow: 'yellow',
    green: 'green',
    blue: 'blue',
    gray: 'gray',
    purple: 'purple',
    red: 'red',
    orange: 'yellow',
    teal: 'blue',
    sky: 'blue',
    indigo: 'blue',
    pink: 'purple',
    violet: 'purple',
    rose: 'red',
}

export function badgeColor(key: string | null | undefined): BadgeColor {
    if (!key) return FALLBACK
    return COLOR_MAP[key] ?? FALLBACK
}
