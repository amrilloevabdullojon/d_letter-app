import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma as db } from '@/lib/prisma'
import { getEmbedding } from '@/lib/embeddings'
import { GoogleGenAI } from '@google/genai'
import { logger } from '@/lib/logger.server'
import { requirePermission } from '@/lib/permission-guard'

const genai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
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

    // 3. Формируем запрос к Gemini
    const systemPrompt = `Ты умный корпоративный ассистент HR-системы (RAG бот).
Твоя задача — отвечать на вопросы пользователя, используя предоставленный контекст из базы писем.
Если в контексте нет ответа, честно скажи, что не нашел информации.
Отвечай профессионально, структурированно, с форматированием Markdown.
Если используешь информацию из писем, обязательно ссылайся на них (например, "Согласно письму №123 от Ромашка...").

${contextStr}`

    // 4. Отправляем в Gemini
    // Используем messages для сохранения истории
    const formattedMessages = messages.map((m) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }))

    const response = await genai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: formattedMessages,
      config: {
        systemInstruction: systemPrompt,
      },
    })

    return NextResponse.json({
      success: true,
      reply: response.text,
    })
  } catch (error) {
    logger.error('POST /api/ai-chat', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}
