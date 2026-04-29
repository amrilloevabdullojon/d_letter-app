import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma as db } from '@/lib/prisma'
import { getEmbedding } from '@/lib/embeddings'
import { logger } from '@/lib/logger.server'

// БАГ #3 ФИКС: лимит поднят с 50 до 100
const BATCH_SIZE = 100

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const letters = await db.$queryRawUnsafe<
      { id: string; content: string | null; org: string; number: string }[]
    >(
      `SELECT id, content, org, number FROM "Letter" WHERE embedding IS NULL AND "deletedAt" IS NULL LIMIT ${BATCH_SIZE}`
    )

    if (letters.length === 0) {
      return NextResponse.json({ success: true, message: 'Нет писем для обработки', remaining: 0 })
    }

    let processed = 0
    let failed = 0

    for (const letter of letters) {
      const textToEmbed = `Письмо №${letter.number}. Организация: ${letter.org}. Содержание: ${letter.content || ''}`
      const embedding = await getEmbedding(textToEmbed)
      if (!embedding && processed === 0 && failed === 0) {
        return NextResponse.json(
          {
            error:
              'Ошибка эмбеддингов. Проверьте логи или API ключ. Ключ: ' +
              !!process.env.OPENAI_API_KEY,
          },
          { status: 500 }
        )
      }

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

      await new Promise((r) => setTimeout(r, 200))
    }

    // БАГ #3 ФИКС: точное количество оставшихся писем
    const remainingCount = await db.$queryRawUnsafe<[{ count: string }]>(
      `SELECT COUNT(*) as count FROM "Letter" WHERE embedding IS NULL AND "deletedAt" IS NULL`
    )
    const remaining = parseInt((remainingCount as any)[0]?.count || '0', 10)

    return NextResponse.json({
      success: true,
      processed,
      failed,
      remaining,
    })
  } catch (error: any) {
    logger.error('POST /api/letters/backfill-embeddings', error)
    return NextResponse.json(
      { error: 'Детали ошибки: ' + (error.message || JSON.stringify(error)) },
      { status: 500 }
    )
  }
}
