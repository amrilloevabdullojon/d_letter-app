import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const COMPLETED_STATUSES = ['READY', 'DONE']
const IN_PROGRESS_STATUSES = ['IN_PROGRESS', 'ACCEPTED', 'CLARIFICATION']

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const userId = session.user.id
    const searchParams = request.nextUrl.searchParams
    const period = searchParams.get('period') || 'week'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    // Определяем дату начала периода
    const now = new Date()
    let periodStart: Date
    let periodDays: number

    switch (period) {
      case 'month':
        periodDays = 30
        periodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case 'quarter':
        periodDays = 90
        periodStart = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      default: // week
        periodDays = 7
        periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    }

    // Получаем статистику параллельно
    const [
      totalCompleted,
      completedThisPeriod,
      inProgress,
      overdue,
      completedLetters,
      avgCompletionResult,
      dailyCompletions,
    ] = await Promise.all([
      // Всего отработано (где пользователь - исполнитель и статус завершён)
      prisma.letter.count({
        where: {
          ownerId: userId,
          status: { in: COMPLETED_STATUSES as any },
        },
      }),

      // Отработано за период
      prisma.letter.count({
        where: {
          ownerId: userId,
          status: { in: COMPLETED_STATUSES as any },
          updatedAt: { gte: periodStart },
        },
      }),

      // В работе сейчас
      prisma.letter.count({
        where: {
          ownerId: userId,
          status: { in: IN_PROGRESS_STATUSES as any },
        },
      }),

      // Просроченные
      prisma.letter.count({
        where: {
          ownerId: userId,
          status: { in: IN_PROGRESS_STATUSES as any },
          deadlineDate: { lt: now },
        },
      }),

      // Последние отработанные письма с пагинацией
      prisma.letter.findMany({
        where: {
          ownerId: userId,
          status: { in: COMPLETED_STATUSES as any },
        },
        select: {
          id: true,
          number: true,
          org: true,
          status: true,
          updatedAt: true,
          deadlineDate: true,
          type: true,
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit + 1, // +1 для проверки hasMore
      }),

      // Среднее время выполнения (дней от создания до завершения)
      prisma.$queryRaw<{ avg: number }[]>`
        SELECT AVG(EXTRACT(EPOCH FROM ("updatedAt" - "createdAt")) / 86400)::float as avg
        FROM "Letter"
        WHERE "ownerId" = ${userId}
        AND "status" IN ('READY', 'DONE')
        AND "updatedAt" > "createdAt"
      `,

      // Статистика по дням за период
      prisma.$queryRaw<{ date: string; count: bigint }[]>`
        SELECT DATE("updatedAt") as date, COUNT(*)::bigint as count
        FROM "Letter"
        WHERE "ownerId" = ${userId}
        AND "status" IN ('READY', 'DONE')
        AND "updatedAt" >= ${periodStart}
        GROUP BY DATE("updatedAt")
        ORDER BY date ASC
      `,
    ])

    // Проверяем, есть ли ещё записи
    const hasMore = completedLetters.length > limit
    const lettersToReturn = hasMore ? completedLetters.slice(0, limit) : completedLetters

    // Формируем массив дней для графика
    const dailyStatsMap = new Map<string, number>()
    dailyCompletions.forEach((d) => {
      const dateStr = new Date(d.date).toISOString().split('T')[0]
      dailyStatsMap.set(dateStr, Number(d.count))
    })

    const dailyStats: { date: string; count: number }[] = []
    for (let i = periodDays - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const dateStr = date.toISOString().split('T')[0]
      dailyStats.push({
        date: dateStr,
        count: dailyStatsMap.get(dateStr) || 0,
      })
    }

    // Вычисляем streak (последовательные дни с завершениями)
    let streak = 0
    for (let i = dailyStats.length - 1; i >= 0; i--) {
      if (dailyStats[i].count > 0) {
        streak++
      } else if (i < dailyStats.length - 1) {
        // Разрыв в последовательности (не считая сегодня)
        break
      }
    }

    const avgCompletionDays = avgCompletionResult[0]?.avg || null

    return NextResponse.json({
      stats: {
        totalCompleted,
        completedThisPeriod,
        inProgress,
        overdue,
        avgCompletionDays,
        streak,
      },
      letters: lettersToReturn.map((l) => ({
        id: l.id,
        number: l.number,
        organization: l.org,
        status: l.status,
        completedAt: l.updatedAt.toISOString(),
        deadlineDate: l.deadlineDate.toISOString(),
        type: l.type,
      })),
      dailyStats,
      hasMore,
    })
  } catch (error) {
    console.error('Failed to get progress:', error)
    return NextResponse.json(
      { error: 'Не удалось загрузить статистику' },
      { status: 500 }
    )
  }
}
