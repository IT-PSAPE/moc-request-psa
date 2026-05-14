import {
    answerTelegramCallbackQuery,
    isWebhookRequestAuthorized,
    jsonResponse,
    readTelegramUpdate,
    sendTelegramMessage,
} from './shared.js'

export const config = { runtime: 'edge' }

async function handleMessageCommand(updateText: string, chatId: number | string): Promise<void> {
    const command = updateText.trim().split(/\s+/, 1)[0]?.toLowerCase()

    if (command === '/start') {
        await sendTelegramMessage(
            chatId,
            'MOC Request bot webhook is online. Add your bot-specific flows in api/telegram/webhook.ts.',
        )
        return
    }

    if (command === '/help') {
        await sendTelegramMessage(
            chatId,
            'Available commands: /start, /help. Extend this handler to wire Telegram into your request workflows.',
        )
    }
}

export default async function handler(request: Request): Promise<Response> {
    try {
        if (request.method !== 'POST') {
            return jsonResponse({ error: 'Method not allowed' }, 405)
        }

        if (!isWebhookRequestAuthorized(request)) {
            return jsonResponse({ error: 'Unauthorized' }, 401)
        }

        const update = await readTelegramUpdate(request)
        if (!update) {
            return jsonResponse({ error: 'Invalid Telegram update payload' }, 400)
        }

        const message = update.message
        if (message?.text) {
            await handleMessageCommand(message.text, message.chat.id)
        }

        const callbackQuery = update.callback_query
        if (callbackQuery?.id) {
            await answerTelegramCallbackQuery(
                callbackQuery.id,
                'Callback received. Extend api/telegram/webhook.ts to handle this action.',
            )
        }

        return jsonResponse({ ok: true })
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Telegram webhook handler failed'
        return jsonResponse({ error: message }, 500)
    }
}
