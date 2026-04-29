import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generateJiraDescription } from '@/lib/ai'
import { logger } from '@/lib/logger.server'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const body = await request.json()
    const { processingText } = body

    if (!processingText || processingText.trim() === '') {
      return NextResponse.json({ error: 'Пустой текст обработки' }, { status: 400 })
    }

    const generatedDescription = await generateJiraDescription(processingText)

    if (!generatedDescription) {
      return NextResponse.json({ error: 'Не удалось сгенерировать описание' }, { status: 500 })
    }

    return NextResponse.json({ success: true, description: generatedDescription })
  } catch (error) {
    logger.error('POST /api/letters/[id]/ai-jira-description', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}
