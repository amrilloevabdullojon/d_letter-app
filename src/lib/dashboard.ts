import 'server-only'
import type { Session } from 'next-auth'
import type { LetterStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { cache, CACHE_KEYS, CACHE_TTL } from '@/lib/cache'
import { URGENT_DAYS } from '@/lib/constants'
import { hasPermission } from '@/lib/permissions'

export type DashboardSummary = {
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
}

export type DashboardData = {
  summary: DashboardSummary
  byStatus: Record<LetterStatus, number>
  recentLetters: Array<{
    id: string
    number: string
    org: string
    date: Date
    deadlineDate: Date
    status: LetterStatus
    type: string | null
    owner: { name: string | null; email: string | null } | null
  }>
  urgentLetters: Array<{
    id: string
    number: string
    org: string
    date: Date
    deadlineDate: Date
    status: LetterStatus
    type: string | null
    owner: { name: string | null; email: string | null } | null
  }>
  overdueLetters: Array<{
    id: string
    number: string
    org: string
    date: Date
    deadlineDate: Date
    status: LetterStatus
    type: string | null
    owner: { name: string | null; email: string | null } | null
  }>
  unassignedLetters: Array<{
    id: string
    number: string
    org: string
    date: Date
    deadlineDate: Date
    status: LetterStatus
    type: string | null
    owner: { name: string | null; email: string | null } | null
  }>
  recentRequests: Array<{
    id: string
    organization: string
    contactName: string
    status: string
    priority: string
    createdAt: Date
  }>
}

export class DashboardError extends Error {
  constructor(
    message: string,
    public readonly code: 'UNAUTHORIZED' | 'FORBIDDEN'
  ) {
    super(message)
    this.name = 'DashboardError'
  }
}

const emptyByStatus: Record<LetterStatus, number> = {
  NOT_REVIEWED: 0,
  ACCEPTED: 0,
  IN_PROGRESS: 0,
  CLARIFICATION: 0,
  READY: 0,
  DONE: 0,
  FROZEN: 0,
  REJECTED: 0,
  PROCESSED: 0,
}

export async function getDashboardData(session: Session): Promise<DashboardData> {
  if (!session?.user) {
    throw new DashboardError('Unauthorized', 'UNAUTHORIZED')
  }

  if (
    !hasPermission(session.user.role, 'VIEW_LETTERS') ||
    !hasPermission(session.user.role, 'VIEW_REQUESTS')
  ) {
    throw new DashboardError('Forbidden', 'FORBIDDEN')
  }

  const cacheKey = CACHE_KEYS.DASHBOARD(session.user.role || 'unknown')
  const cached = await cache.get<DashboardData>(cacheKey)
  if (cached) return cached

  const now = new Date()
  const urgentDeadline = new Date(now.getTime() + URGENT_DAYS * 24 * 60 * 60 * 1000)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)
  const weekEnd = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const cachedStats = await cache.get<{
    summary: DashboardSummary
    byStatus: Record<LetterStatus, number>
  }>(CACHE_KEYS.STATS)

  let summary: DashboardSummary | null = cachedStats?.summary ?? null
  let byStatus: Record<LetterStatus, number> = cachedStats?.byStatus ?? { ...emptyByStatus }

  if (!summary) {
    // ✅ PERF: Single SQL query replaces 9 separate Prisma queries (8 COUNTs + 1 groupBy)
    const statsResult = await prisma.$queryRaw<
      Array<{
        total: bigint
        overdue: bigint
        urgent: bigint
        today_deadlines: bigint
        week_deadlines: bigint
        month_new: bigint
        month_done: bigint
        cnt_not_reviewed: bigint
        cnt_accepted: bigint
        cnt_in_progress: bigint
        cnt_clarification: bigint
        cnt_ready: bigint
        cnt_done: bigint
        cnt_frozen: bigint
        cnt_rejected: bigint
        cnt_processed: bigint
      }>
    >`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE "deadlineDate" < ${now} AND "status" NOT IN ('READY', 'DONE', 'PROCESSED', 'FROZEN', 'REJECTED')) AS overdue,
        COUNT(*) FILTER (WHERE "deadlineDate" >= ${now} AND "deadlineDate" <= ${urgentDeadline} AND "status" NOT IN ('READY', 'DONE', 'PROCESSED', 'FROZEN', 'REJECTED')) AS urgent,
        COUNT(*) FILTER (WHERE "deadlineDate" >= ${today} AND "deadlineDate" < ${tomorrow} AND "status" NOT IN ('READY', 'DONE', 'PROCESSED', 'FROZEN', 'REJECTED')) AS today_deadlines,
        COUNT(*) FILTER (WHERE "deadlineDate" >= ${today} AND "deadlineDate" < ${weekEnd} AND "status" NOT IN ('READY', 'DONE', 'PROCESSED', 'FROZEN', 'REJECTED')) AS week_deadlines,
        COUNT(*) FILTER (WHERE "createdAt" >= ${startOfMonth}) AS month_new,
        COUNT(*) FILTER (WHERE "closeDate" >= ${startOfMonth} AND "status" IN ('READY', 'DONE')) AS month_done,
        COUNT(*) FILTER (WHERE "status" = 'NOT_REVIEWED') AS cnt_not_reviewed,
        COUNT(*) FILTER (WHERE "status" = 'ACCEPTED') AS cnt_accepted,
        COUNT(*) FILTER (WHERE "status" = 'IN_PROGRESS') AS cnt_in_progress,
        COUNT(*) FILTER (WHERE "status" = 'CLARIFICATION') AS cnt_clarification,
        COUNT(*) FILTER (WHERE "status" = 'READY') AS cnt_ready,
        COUNT(*) FILTER (WHERE "status" = 'DONE') AS cnt_done,
        COUNT(*) FILTER (WHERE "status" = 'FROZEN') AS cnt_frozen,
        COUNT(*) FILTER (WHERE "status" = 'REJECTED') AS cnt_rejected,
        COUNT(*) FILTER (WHERE "status" = 'PROCESSED') AS cnt_processed
      FROM "Letter"
      WHERE "deletedAt" IS NULL
    `

    const stats = statsResult[0]
    byStatus = {
      NOT_REVIEWED: Number(stats.cnt_not_reviewed),
      ACCEPTED: Number(stats.cnt_accepted),
      IN_PROGRESS: Number(stats.cnt_in_progress),
      CLARIFICATION: Number(stats.cnt_clarification),
      READY: Number(stats.cnt_ready),
      DONE: Number(stats.cnt_done),
      FROZEN: Number(stats.cnt_frozen),
      REJECTED: Number(stats.cnt_rejected),
      PROCESSED: Number(stats.cnt_processed),
    }

    const done = byStatus.READY + byStatus.DONE
    const inProgress = byStatus.IN_PROGRESS + byStatus.ACCEPTED + byStatus.CLARIFICATION

    summary = {
      total: Number(stats.total),
      overdue: Number(stats.overdue),
      urgent: Number(stats.urgent),
      done,
      inProgress,
      notReviewed: byStatus.NOT_REVIEWED,
      todayDeadlines: Number(stats.today_deadlines),
      weekDeadlines: Number(stats.week_deadlines),
      monthNew: Number(stats.month_new),
      monthDone: Number(stats.month_done),
      avgDays: 0,
    }
  }

  const selectLetter = {
    id: true,
    number: true,
    org: true,
    date: true,
    deadlineDate: true,
    status: true,
    type: true,
    owner: { select: { name: true, email: true } },
  } as const

  const [recentLetters, urgentLetters, overdueLetters, unassignedLetters, recentRequests] =
    await Promise.all([
      prisma.letter.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: selectLetter,
      }),
      prisma.letter.findMany({
        where: {
          deletedAt: null,
          deadlineDate: { gte: now, lte: urgentDeadline },
          status: { notIn: ['READY', 'DONE'] },
        },
        orderBy: { deadlineDate: 'asc' },
        take: 5,
        select: selectLetter,
      }),
      prisma.letter.findMany({
        where: {
          deletedAt: null,
          deadlineDate: { lt: now },
          status: { notIn: ['READY', 'DONE'] },
        },
        orderBy: { deadlineDate: 'asc' },
        take: 5,
        select: selectLetter,
      }),
      prisma.letter.findMany({
        where: { deletedAt: null, ownerId: null },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: selectLetter,
      }),
      prisma.request.findMany({
        where: { deletedAt: null, status: { in: ['NEW', 'IN_REVIEW'] } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          organization: true,
          contactName: true,
          status: true,
          priority: true,
          createdAt: true,
        },
      }),
    ])

  const response: DashboardData = {
    summary: summary ?? {
      total: 0,
      overdue: 0,
      urgent: 0,
      done: 0,
      inProgress: 0,
      notReviewed: 0,
      todayDeadlines: 0,
      weekDeadlines: 0,
      monthNew: 0,
      monthDone: 0,
      avgDays: 0,
    },
    byStatus,
    recentLetters,
    urgentLetters,
    overdueLetters,
    unassignedLetters,
    recentRequests,
  }

  await cache.set(cacheKey, response, CACHE_TTL.DASHBOARD)
  return response
}
