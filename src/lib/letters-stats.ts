import 'server-only'

import { prisma } from '@/lib/prisma'
import { MONTHS_TO_SHOW, URGENT_DAYS } from '@/lib/constants'
import { normalizeLetterType, normalizeOrganization } from '@/lib/reporting'
import type { LetterStatus } from '@prisma/client'

export interface LetterStatsSummary {
  total: number
  overdue: number
  urgent: number
  done: number
  inProgress: number
  notReviewed: number
  todayDeadlines: number
  weekDeadlines: number
  monthNew: number
  monthDone: number
  avgDays: number
  needsProcessing: number
}

export interface LetterOwnerStat {
  id: string
  name: string
  count: number
}

export interface LetterTypeStat {
  type: string
  count: number
}

export interface LetterMonthlyStat {
  month: string
  created: number
  done: number
}

export interface LetterStatsSnapshot {
  summary: LetterStatsSummary
  byStatus: Record<LetterStatus, number>
  byOwner: LetterOwnerStat[]
  byType: LetterTypeStat[]
  monthly: LetterMonthlyStat[]
}

export async function getLetterStatsSnapshot(): Promise<LetterStatsSnapshot> {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const yearAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)
  const weekEnd = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)

  const [
    statusCounts,
    total,
    overdueCount,
    urgentCount,
    todayDeadlinesCount,
    weekDeadlinesCount,
    monthNewCount,
    monthDoneCount,
    byOwner,
    byType,
    allUsers,
    needsProcessingCount,
    monthlyCreatedRaw,
    monthlyDoneRaw,
    avgDaysResult,
  ] = await Promise.all([
    prisma.letter.groupBy({
      by: ['status'],
      where: { deletedAt: null },
      _count: { status: true },
    }),
    prisma.letter.count({ where: { deletedAt: null } }),
    prisma.letter.count({
      where: {
        deletedAt: null,
        deadlineDate: { lt: now },
        status: { notIn: ['READY', 'PROCESSED', 'DONE', 'FROZEN', 'REJECTED'] },
      },
    }),
    prisma.letter.count({
      where: {
        deletedAt: null,
        deadlineDate: {
          gte: now,
          lte: new Date(now.getTime() + URGENT_DAYS * 24 * 60 * 60 * 1000),
        },
        status: { notIn: ['READY', 'PROCESSED', 'DONE', 'FROZEN', 'REJECTED'] },
      },
    }),
    prisma.letter.count({
      where: {
        deletedAt: null,
        deadlineDate: { gte: today, lt: tomorrow },
        status: { notIn: ['READY', 'PROCESSED', 'DONE', 'FROZEN', 'REJECTED'] },
      },
    }),
    prisma.letter.count({
      where: {
        deletedAt: null,
        deadlineDate: { gte: today, lt: weekEnd },
        status: { notIn: ['READY', 'PROCESSED', 'DONE', 'FROZEN', 'REJECTED'] },
      },
    }),
    prisma.letter.count({
      where: { deletedAt: null, createdAt: { gte: startOfMonth } },
    }),
    prisma.letter.count({
      where: {
        deletedAt: null,
        closeDate: { gte: startOfMonth },
        status: { in: ['READY', 'PROCESSED', 'DONE'] },
      },
    }),
    prisma.letter.groupBy({
      by: ['ownerId'],
      _count: { id: true },
      where: { ownerId: { not: null }, deletedAt: null },
    }),
    prisma.letter.groupBy({
      by: ['type'],
      _count: { id: true },
      where: { type: { not: null }, deletedAt: null },
    }),
    prisma.user.findMany({
      select: { id: true, name: true, email: true },
    }),
    prisma.letter.count({
      where: {
        deletedAt: null,
        processing: null,
        status: { notIn: ['READY', 'PROCESSED', 'DONE', 'FROZEN', 'REJECTED'] },
      },
    }),
    prisma.$queryRaw<Array<{ month: Date; count: bigint }>>`
      SELECT
        DATE_TRUNC('month', "createdAt") as month,
        COUNT(*) as count
      FROM "Letter"
      WHERE "deletedAt" IS NULL AND "createdAt" >= ${yearAgo}
      GROUP BY DATE_TRUNC('month', "createdAt")
      ORDER BY month DESC
    `,
    prisma.$queryRaw<Array<{ month: Date; count: bigint }>>`
      SELECT
        DATE_TRUNC('month', "closeDate") as month,
        COUNT(*) as count
      FROM "Letter"
      WHERE "deletedAt" IS NULL
        AND "closeDate" >= ${yearAgo}
        AND status IN ('READY', 'PROCESSED', 'DONE')
      GROUP BY DATE_TRUNC('month', "closeDate")
      ORDER BY month DESC
    `,
    prisma.$queryRaw<Array<{ avg_days: number | null }>>`
      SELECT
        AVG(EXTRACT(DAY FROM ("closeDate" - "date"))::numeric) as avg_days
      FROM "Letter"
      WHERE "deletedAt" IS NULL
        AND status IN ('READY', 'PROCESSED', 'DONE')
        AND "closeDate" IS NOT NULL
        AND "closeDate" >= "date"
    `,
  ])

  const byStatus: Record<LetterStatus, number> = {
    NOT_REVIEWED: 0,
    ACCEPTED: 0,
    IN_PROGRESS: 0,
    CLARIFICATION: 0,
    FROZEN: 0,
    REJECTED: 0,
    READY: 0,
    PROCESSED: 0,
    DONE: 0,
  }

  statusCounts.forEach((item) => {
    byStatus[item.status] = item._count.status
  })

  const doneCount = byStatus.READY + byStatus.DONE + byStatus.PROCESSED
  const inProgressCount = byStatus.IN_PROGRESS + byStatus.ACCEPTED + byStatus.CLARIFICATION
  const userById = new Map(allUsers.map((user) => [user.id, user]))

  const ownerStats = byOwner
    .map((entry) => {
      const ownerId = entry.ownerId ?? 'unassigned'
      const user = entry.ownerId ? userById.get(entry.ownerId) : undefined
      return {
        id: ownerId,
        name: entry.ownerId ? user?.name || user?.email?.split('@')[0] || ownerId : 'Не назначено',
        count: entry._count.id,
      }
    })
    .sort((a, b) => b.count - a.count)

  const typeStats = byType
    .map((entry) => ({
      type: normalizeLetterType(entry.type),
      count: entry._count.id,
    }))
    .sort((a, b) => b.count - a.count)

  const createdByMonth = new Map(
    monthlyCreatedRaw.map((row) => [
      new Date(row.month).toLocaleDateString('ru-RU', { month: 'short' }),
      Number(row.count),
    ])
  )
  const doneByMonth = new Map(
    monthlyDoneRaw.map((row) => [
      new Date(row.month).toLocaleDateString('ru-RU', { month: 'short' }),
      Number(row.count),
    ])
  )

  const monthlyMap = new Map<string, { created: number; done: number }>()
  for (let i = 0; i < MONTHS_TO_SHOW; i += 1) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthKey = monthStart.toLocaleDateString('ru-RU', { month: 'short' })
    monthlyMap.set(monthKey, {
      created: createdByMonth.get(monthKey) || 0,
      done: doneByMonth.get(monthKey) || 0,
    })
  }

  const monthly = Array.from(monthlyMap.entries())
    .reverse()
    .map(([month, data]) => ({ month, ...data }))

  const avgDays = avgDaysResult[0]?.avg_days ? Math.round(avgDaysResult[0].avg_days) : 0

  return {
    summary: {
      total,
      overdue: overdueCount,
      urgent: urgentCount,
      done: doneCount,
      inProgress: inProgressCount,
      notReviewed: byStatus.NOT_REVIEWED,
      todayDeadlines: todayDeadlinesCount,
      weekDeadlines: weekDeadlinesCount,
      monthNew: monthNewCount,
      monthDone: monthDoneCount,
      avgDays,
      needsProcessing: needsProcessingCount,
    },
    byStatus,
    byOwner: ownerStats,
    byType: typeStats,
    monthly,
  }
}

export function normalizeLetterReportRecord(input: {
  createdAt: Date
  org: string | null
  type: string | null
  status: LetterStatus
  ownerId: string | null
}) {
  return {
    createdAt: input.createdAt,
    org: normalizeOrganization(input.org),
    type: normalizeLetterType(input.type),
    status: input.status,
    ownerId: input.ownerId,
  }
}
