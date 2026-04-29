import { NextRequest, NextResponse } from 'next/server'
import { JiraService } from '@/services/jira.service'

export async function POST(req: NextRequest) {
  try {
    // В идеале здесь должна быть проверка подписи вебхука или токена,
    // чтобы убедиться, что запрос действительно от Jira.
    // Jira отправляет заголовок x-hub-signature, если настроен секрет.

    const body = await req.json()

    // Проверка, что это событие обновления issue
    if (body.webhookEvent !== 'jira:issue_updated') {
      return NextResponse.json({ message: 'Ignored: not an issue_updated event' })
    }

    const result = await JiraService.processWebhook(body)

    return NextResponse.json({ success: true, result })
  } catch (error: any) {
    console.error('Error processing Jira webhook:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
