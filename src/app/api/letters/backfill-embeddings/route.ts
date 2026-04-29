import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma as db } from '@/lib/prisma'
import { getEmbedding } from '@/lib/embeddings'
import { logger } from '@/lib/logger.server'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const letters = await db.$queryRawUnsafe<
      { id: string; content: string | null; org: string; number: string }[]
    >(
      `SELECT id, content, org, number FROM "Letter" WHERE embedding IS NULL AND "deletedAt" IS NULL LIMIT 50`
    )

    if (letters.length === 0) {
      return NextResponse.json({ success: true, message: 'Нет писем для обработки' })
    }

    let processed = 0
    let failed = 0

    for (const letter of letters) {
      const textToEmbed = `Письмо №${letter.number}. Организация: ${letter.org}. Содержание: ${letter.content || ''}`
      const embedding = await getEmbedding(textToEmbed)

      if (embedding) {
        const embeddingStr = `[${embedding.join(',')}]`

        await db.$executeRawUnsafe(
          `UPDATE "Letter" SET embedding = $1::vector WHERE id = $2`,
          embeddingStr,
          letter.id
        )
        processed++
      } else {
        failed++
      }

      await new Promise((r) => setTimeout(r, 250))
    }

    return NextResponse.json({
      success: true,
      processed,
      failed,
      remaining: letters.length === 50 ? 'Возможно есть еще' : 0,
    })
  } catch (error) {
    logger.error('POST /api/letters/backfill-embeddings', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}
