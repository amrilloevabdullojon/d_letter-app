import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma as db } from '@/lib/prisma'
import { generateProcessingText } from '@/lib/ai'
import { logger } from '@/lib/logger.server'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const { id } = await params
    const letter = await db.letter.findUnique({
      where: { id },
      select: { content: true },
    })

    if (!letter) {
      return NextResponse.json({ error: 'Письмо не найдено' }, { status: 404 })
    }

    if (!letter.content || letter.content.trim() === '') {
      return NextResponse.json(
        { error: 'Содержание письма пустое, невозможно сгенерировать ответ' },
        { status: 400 }
      )
    }

    const generatedText = await generateProcessingText(letter.content)

    if (!generatedText) {
      return NextResponse.json({ error: 'Не удалось сгенерировать текст' }, { status: 500 })
    }

    return NextResponse.json({ success: true, processing: generatedText })
  } catch (error) {
    logger.error('POST /api/letters/[id]/ai-processing', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}
