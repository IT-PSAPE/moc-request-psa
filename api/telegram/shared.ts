const TELEGRAM_API_BASE = 'https://api.telegram.org'
const REGISTER_SECRET_HEADER = 'x-telegram-register-secret'
const TELEGRAM_SECRET_HEADER = 'x-telegram-bot-api-secret-token'

export type TelegramChatId = number | string

export type TelegramMessage = {
    chat: {
        id: TelegramChatId
    }
    text?: string
}

export type TelegramCallbackQuery = {
    id: string
    data?: string
    message?: {
        chat: {
            id: TelegramChatId
        }
    }
}

export type TelegramUpdate = {
    update_id: number
    message?: TelegramMessage
    callback_query?: TelegramCallbackQuery
}

type TelegramEnvelope<T> = {
    ok: boolean
    result?: T
    description?: string
    error_code?: number
}

export type TelegramWebhookInfo = {
    url: string
    has_custom_certificate: boolean
    pending_update_count: number
    ip_address?: string
    last_error_date?: number
    last_error_message?: string
    last_synchronization_error_date?: number
    max_connections?: number
    allowed_updates?: string[]
}

type RegisterBody = {
    allowedUpdates?: string[]
    dropPendingUpdates?: boolean
}

function getRequiredEnv(name: string): string {
    const value = process.env[name]?.trim()
    if (!value) {
        throw new Error(`Missing ${name}`)
    }
    return value
}

export function getTelegramBotToken(): string {
    return getRequiredEnv('TELEGRAM_BOT_TOKEN')
}

export function getTelegramWebhookSecret(): string {
    return getRequiredEnv('TELEGRAM_WEBHOOK_SECRET')
}

function getTelegramRegisterSecret(): string {
    return getRequiredEnv('TELEGRAM_WEBHOOK_REGISTER_SECRET')
}

function getConfiguredAllowedUpdates(): string[] | undefined {
    const raw = process.env.TELEGRAM_ALLOWED_UPDATES?.trim()
    if (!raw) return undefined
    const values = raw.split(',').map(value => value.trim()).filter(Boolean)
    return values.length > 0 ? values : undefined
}

export function resolveWebhookUrl(request: Request): string {
    const configured = process.env.TELEGRAM_WEBHOOK_URL?.trim()
    if (configured) {
        return configured
    }

    return new URL('/api/telegram/webhook', request.url).toString()
}

export function isRegisterRequestAuthorized(request: Request): boolean {
    const expected = getTelegramRegisterSecret()
    const headerSecret = request.headers.get(REGISTER_SECRET_HEADER)
    if (headerSecret === expected) {
        return true
    }

    const authorization = request.headers.get('authorization')
    if (!authorization?.startsWith('Bearer ')) {
        return false
    }

    return authorization.slice('Bearer '.length).trim() === expected
}

export function isWebhookRequestAuthorized(request: Request): boolean {
    return request.headers.get(TELEGRAM_SECRET_HEADER) === getTelegramWebhookSecret()
}

export function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            'content-type': 'application/json; charset=utf-8',
            'cache-control': 'no-store',
        },
    })
}

export async function readRegisterBody(request: Request): Promise<RegisterBody> {
    if (request.method !== 'POST') {
        return {}
    }

    if (!request.headers.get('content-type')?.includes('application/json')) {
        return {}
    }

    const body = await request.json() as unknown
    if (!body || typeof body !== 'object') {
        return {}
    }

    const record = body as Record<string, unknown>
    const allowedUpdates = Array.isArray(record.allowedUpdates)
        ? record.allowedUpdates.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
        : undefined
    const dropPendingUpdates = typeof record.dropPendingUpdates === 'boolean'
        ? record.dropPendingUpdates
        : undefined

    return { allowedUpdates, dropPendingUpdates }
}

export async function telegramApiRequest<TResult>(method: string, body: Record<string, unknown>): Promise<TResult> {
    const token = getTelegramBotToken()
    const response = await fetch(`${TELEGRAM_API_BASE}/bot${token}/${method}`, {
        method: 'POST',
        headers: {
            'content-type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify(body),
    })

    const payload = await response.json() as TelegramEnvelope<TResult>
    if (!response.ok || !payload.ok || payload.result === undefined) {
        throw new Error(payload.description ?? `Telegram ${method} failed`)
    }

    return payload.result
}

export async function registerTelegramWebhook(request: Request): Promise<TelegramWebhookInfo> {
    const body = await readRegisterBody(request)
    const webhookUrl = resolveWebhookUrl(request)
    const allowedUpdates = body.allowedUpdates ?? getConfiguredAllowedUpdates()

    await telegramApiRequest<boolean>('setWebhook', {
        url: webhookUrl,
        secret_token: getTelegramWebhookSecret(),
        allowed_updates: allowedUpdates,
        drop_pending_updates: body.dropPendingUpdates ?? false,
    })

    return telegramApiRequest<TelegramWebhookInfo>('getWebhookInfo', {})
}

export async function fetchTelegramWebhookInfo(): Promise<TelegramWebhookInfo> {
    return telegramApiRequest<TelegramWebhookInfo>('getWebhookInfo', {})
}

export async function sendTelegramMessage(chatId: TelegramChatId, text: string): Promise<void> {
    await telegramApiRequest('sendMessage', {
        chat_id: chatId,
        text,
    })
}

export async function answerTelegramCallbackQuery(callbackQueryId: string, text: string): Promise<void> {
    await telegramApiRequest('answerCallbackQuery', {
        callback_query_id: callbackQueryId,
        text,
    })
}

export async function readTelegramUpdate(request: Request): Promise<TelegramUpdate | null> {
    if (!request.headers.get('content-type')?.includes('application/json')) {
        return null
    }

    const body = await request.json() as unknown
    if (!body || typeof body !== 'object') {
        return null
    }

    const record = body as Record<string, unknown>
    if (typeof record.update_id !== 'number') {
        return null
    }

    return record as TelegramUpdate
}
