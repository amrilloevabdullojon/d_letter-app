import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { logger } from '@/lib/logger.server'
import { requirePermission } from '@/lib/permission-guard'
import {
  getLetterStats,
  getLetterTrends,
  getOrganizationStats,
  getUserStats,
  getTypeStats,
  getPerformanceMetrics,
  getActivityPatterns,
  exportAnalytics,
  exportAnalyticsToXlsx,
  AnalyticsFilters,
} from '@/lib/letter-analytics'
import { LetterStatus } from '@prisma/client'

/**
 * GET /api/analytics/letters
 *
 * Получает аналитику по письмам
 *
 * Query параметры:
 * - type: stats | trends | organizations | users | types | performance | activity | all
 * - dateFrom, dateTo: диапазон дат
 * - ownerId: фильтр по владельцу
 * - org: фильтр по организации
 * - status: фильтр по статусу (через запятую)
 * - groupBy: day | week | month (для trends)
 * - limit: количество результатов (для top lists)
 * - export: true для экспорта в JSON
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const permissionError = requirePermission(session.user.role, 'VIEW_LETTERS')
    if (permissionError) {
      return permissionError
    }

    const { searchParams } = new URL(request.url)

    // Строим фильтры
    const filters: AnalyticsFilters = {}

    if (searchParams.get('ownerId')) {
      filters.ownerId = searchParams.get('ownerId')!
    }
    if (searchParams.get('org')) {
      filters.org = searchParams.get('org')!
    }

    const statusParam = searchParams.get('status')
    if (statusParam) {
      filters.status = statusParam.split(',') as LetterStatus[]
    }

    const preset = searchParams.get('preset') || '1m'
    let groupBy = (searchParams.get('groupBy') || 'day') as 'hour' | 'day' | 'week' | 'month'

    if (preset === '1d') {
      filters.dateFrom = new Date(Date.now() - 24 * 60 * 60 * 1000)
      filters.dateTo = new Date()
      groupBy = 'hour'
    } else if (preset === '7d') {
      filters.dateFrom = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      filters.dateTo = new Date()
      groupBy = 'day'
    } else if (preset === '1m') {
      filters.dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      filters.dateTo = new Date()
      groupBy = 'day'
    } else if (preset === '1y') {
      filters.dateFrom = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
      filters.dateTo = new Date()
      groupBy = 'month'
    } else if (preset === 'all') {
      filters.dateFrom = undefined
      filters.dateTo = undefined
      groupBy = 'month'
    } else {
      // custom / промежуток
      if (searchParams.get('dateFrom')) {
        filters.dateFrom = new Date(searchParams.get('dateFrom')!)
      }
      if (searchParams.get('dateTo')) {
        filters.dateTo = new Date(searchParams.get('dateTo')!)
      }

      // Умный выбор groupBy для кастомного интервала, если он не задан явно
      if (!searchParams.get('groupBy') && filters.dateFrom && filters.dateTo) {
        const diffMs = filters.dateTo.getTime() - filters.dateFrom.getTime()
        const diffDays = diffMs / (1000 * 60 * 60 * 24)
        if (diffDays <= 1.1) {
          groupBy = 'hour'
        } else if (diffDays <= 31) {
          groupBy = 'day'
        } else if (diffDays <= 365) {
          groupBy = 'week'
        } else {
          groupBy = 'month'
        }
      }
    }

    const type = searchParams.get('type') || 'all'
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10')))
    const shouldExport = searchParams.get('export') === 'true'
    const exportFormat = searchParams.get('format')

    // Экспорт
    if (shouldExport) {
      if (exportFormat === 'xlsx') {
        const buffer = await exportAnalyticsToXlsx(filters)
        logger.info('GET /api/analytics/letters', 'Analytics exported to XLSX', {
          userId: session.user.id,
        })
        const filename = `analytics-${new Date().toISOString().split('T')[0]}.xlsx`
        return new NextResponse(new Uint8Array(buffer), {
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="${filename}"`,
          },
        })
      }

      const data = await exportAnalytics(filters)
      logger.info('GET /api/analytics/letters', 'Analytics exported', {
        userId: session.user.id,
      })
      return NextResponse.json(data)
    }

    // Получаем данные по типу
    const result: Record<string, unknown> = {}

    if (type === 'stats' || type === 'all') {
      result.stats = await getLetterStats(filters)
    }

    if (type === 'trends' || type === 'all') {
      result.trends = await getLetterTrends(filters, groupBy)
    }

    if (type === 'organizations' || type === 'all') {
      result.organizations = await getOrganizationStats(filters, limit)
    }

    if (type === 'users' || type === 'all') {
      result.users = await getUserStats(filters, limit)
    }

    if (type === 'types' || type === 'all') {
      result.types = await getTypeStats(filters)
    }

    if (type === 'performance' || type === 'all') {
      result.performance = await getPerformanceMetrics(filters)
    }

    if (type === 'activity' || type === 'all') {
      result.activity = await getActivityPatterns(filters)
    }

    logger.info('GET /api/analytics/letters', 'Analytics retrieved', {
      userId: session.user.id,
      type,
    })

    return NextResponse.json(result)
  } catch (error) {
    logger.error('GET /api/analytics/letters', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
