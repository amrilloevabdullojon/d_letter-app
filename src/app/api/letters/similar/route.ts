import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma as db } from '@/lib/prisma'
import { getEmbedding } from '@/lib/embeddings'
import { logger } from '@/lib/logger.server'
import { requirePermission } from '@/lib/permission-guard'

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
    const { content } = body

    if (!content || typeof content !== 'string' || content.trim().length < 10) {
      return NextResponse.json({ success: true, similarLetters: [] })
    }

    const embedding = await getEmbedding(content)
    if (!embedding) {
      return NextResponse.json({ error: 'Не удалось сгенерировать эмбеддинг' }, { status: 500 })
    }

    const embeddingStr = `[${embedding.join(',')}]`

    // Ищем топ 3 похожих писем с косинусным расстоянием < 0.20 (схожесть > 0.80)
    const similarLetters = await db.$queryRawUnsafe<
      { id: string; number: string; org: string; date: Date; status: string }[]
    >(
      `SELECT id, number, org, date, status 
       FROM "Letter" 
       WHERE "deletedAt" IS NULL 
         AND embedding IS NOT NULL 
         AND embedding <=> $1::vector < 0.20
       ORDER BY embedding <=> $1::vector 
       LIMIT 3`,
      embeddingStr
    )

    return NextResponse.json({ success: true, similarLetters })
  } catch (error) {
    logger.error('POST /api/letters/similar', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}
