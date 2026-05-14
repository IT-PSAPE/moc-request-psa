import { fetchTelegramWebhookInfo, isRegisterRequestAuthorized, jsonResponse, registerTelegramWebhook } from './shared.js'

export const config = { runtime: 'edge' }

export default async function handler(request: Request): Promise<Response> {
    try {
        if (!isRegisterRequestAuthorized(request)) {
            return jsonResponse({ error: 'Unauthorized' }, 401)
        }

        if (request.method === 'GET') {
            const info = await fetchTelegramWebhookInfo()
            return jsonResponse({ ok: true, info })
        }

        if (request.method === 'POST') {
            const info = await registerTelegramWebhook(request)
            return jsonResponse({ ok: true, info })
        }

        return jsonResponse({ error: 'Method not allowed' }, 405)
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Telegram webhook registration failed'
        return jsonResponse({ error: message }, 500)
    }
}
