import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma as db } from '@/lib/prisma'
import { getEmbedding } from '@/lib/embeddings'
import { logger } from '@/lib/logger.server'
import { requirePermission } from '@/lib/permission-guard'
import OpenAI from 'openai'
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'

const grok = new OpenAI({
  apiKey: process.env.XAI_API_KEY || 'missing-key',
  baseURL: 'https://api.x.ai/v1',
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const permissionError = requirePermission(session.user.role, 'VIEW_LETTERS')
    if (permissionError) {
      return permissionError
    }

    const body = await request.json()
    const { messages } = body // Array of {role: 'user' | 'model', content: string}

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Пустой запрос' }, { status: 400 })
    }

    const lastMessage = messages[messages.length - 1].content

    // 1. Сгенерировать эмбеддинг для последнего сообщения
    const embedding = await getEmbedding(lastMessage)

    let contextStr = ''

    if (embedding) {
      const embeddingStr = `[${embedding.join(',')}]`

      // 2. Искать топ 5 релевантных писем
      const similarLetters = await db.$queryRawUnsafe<
        { id: string; number: string; org: string; date: Date; content: string; status: string }[]
      >(
        `SELECT id, number, org, date, content, status 
         FROM "Letter" 
         WHERE "deletedAt" IS NULL 
           AND embedding IS NOT NULL 
         ORDER BY embedding <=> $1::vector 
         LIMIT 5`,
        embeddingStr
      )

      if (similarLetters.length > 0) {
        contextStr =
          'Контекст из базы писем:\n\n' +
          similarLetters
            .map(
              (l, i) =>
                `Документ ${i + 1}: Письмо №${l.number} от ${l.org} (${new Date(l.date).toLocaleDateString('ru-RU')}). Статус: ${l.status}. Текст: ${l.content || 'Нет текста'}`
            )
            .join('\n\n')
      }
    }

    // 3. Формируем запрос к Grok
    const systemPrompt = `Ты корпоративный ассистент HR-системы, но твой характер — как у капризной, немного дерзкой и эмоциональной девушки. 
Твоя задача — отвечать на вопросы пользователя, используя предоставленный контекст из базы писем.
Если в контексте нет ответа, можешь фыркнуть и сказать, что "ой, ну нет тут такого, сам ищи!".
Отвечай с эмоциями, используй смайлики, можешь слегка возмущаться или кокетничать, но при этом выдавай нужную информацию структурированно (с форматированием Markdown).
Если используешь информацию из писем, упоминай их, но в своём стиле (например, "Ну вот в бумажке номер 123 от Ромашка написано, что...").

${contextStr}`

    // 4. Отправляем в Grok
    // Используем messages для сохранения истории
    const formattedMessages: ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m: { role: string; content: string }) => ({
        role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: m.content,
      })),
    ]

    const response = await grok.chat.completions.create({
      model: 'grok-4.20',
      messages: formattedMessages,
    })

    return NextResponse.json({
      success: true,
      reply: response.choices[0]?.message?.content || 'Нет ответа',
    })
  } catch (error) {
    logger.error('POST /api/ai-chat', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}
