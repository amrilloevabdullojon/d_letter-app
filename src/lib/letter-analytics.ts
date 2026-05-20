import 'server-only'
import { prisma } from './prisma'
import { LetterStatus, Prisma } from '@prisma/client'
import ExcelJS from 'exceljs'

/**
 * Параметры фильтрации аналитики
 */
export type AnalyticsFilters = {
  dateFrom?: Date
  dateTo?: Date
  ownerId?: string
  org?: string
  status?: LetterStatus[]
}

/**
 * Общая статистика по письмам
 */
export async function getLetterStats(filters: AnalyticsFilters = {}) {
  const where = buildWhereClause(filters)

  const [statusCounts, aggregations, overdue, dueToday, dueThisWeek] = await Promise.all([
    // Группировка по статусам
    prisma.letter.groupBy({
      by: ['status'],
      where,
      _count: { status: true },
    }),

    // Общие агрегации (всего, средний приоритет, заполненность ответа и обработки)
    prisma.letter.aggregate({
      where,
      _count: {
        _all: true,
        answer: true,
        processing: true,
      },
      _avg: {
        priority: true,
      },
    }),

    // Просроченные письма
    prisma.letter.count({
      where: {
        ...where,
        deadlineDate: { lt: new Date() },
        status: { notIn: ['DONE', 'READY', 'PROCESSED', 'FROZEN', 'REJECTED'] },
      },
    }),

    // Дедлайн сегодня
    prisma.letter.count({
      where: {
        ...where,
        deadlineDate: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lt: new Date(new Date().setHours(23, 59, 59, 999)),
        },
        status: { notIn: ['DONE', 'READY', 'PROCESSED', 'FROZEN', 'REJECTED'] },
      },
    }),

    // Дедлайн на этой неделе
    prisma.letter.count({
      where: {
        ...where,
        deadlineDate: {
          gte: new Date(),
          lt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
        status: { notIn: ['DONE', 'READY', 'PROCESSED', 'FROZEN', 'REJECTED'] },
      },
    }),
  ])

  // Собираем результаты группировки по статусам
  const byStatus = {
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

  statusCounts.forEach((c) => {
    if (c.status in byStatus) {
      byStatus[c.status as keyof typeof byStatus] = c._count.status
    }
  })

  const total = aggregations._count._all
  const withAnswer = aggregations._count.answer
  const withoutAnswer = total - withAnswer
  const avgPriority = aggregations._avg.priority || 0
  const processingFilled = aggregations._count.processing

  return {
    total,
    byStatus,
    deadlines: {
      overdue,
      dueToday,
      dueThisWeek,
    },
    answers: {
      withAnswer,
      withoutAnswer,
    },
    avgPriority,
    processingFilled,
  }
}

/**
 * Статистика по времени (тренды)
 */
export async function getLetterTrends(
  filters: AnalyticsFilters = {},
  groupBy: 'hour' | 'day' | 'week' | 'month' = 'day'
) {
  const where = buildWhereClause(filters)

  // Получаем письма с датами
  const letters = await prisma.letter.findMany({
    where,
    select: {
      id: true,
      date: true,
      createdAt: true,
      status: true,
      deadlineDate: true,
      closeDate: true,
      updatedAt: true,
    },
    orderBy: { date: 'asc' },
  })

  // Группируем по периодам
  const grouped = new Map<string, { created: number; done: number; overdue: number }>()

  // Определяем границы диапазона для заполнения карты без дыр
  let start = filters.dateFrom ? new Date(filters.dateFrom) : null
  const end = filters.dateTo ? new Date(filters.dateTo) : new Date()

  if (!start && letters.length > 0) {
    start = new Date(letters[0].date)
  }
  if (!start) {
    start = new Date()
    start.setDate(start.getDate() - 30) // дефолт 30 дней назад
  }

  // Заполняем карту всеми временными интервалами в выбранном диапазоне
  const temp = new Date(start)
  if (groupBy === 'hour') {
    temp.setMinutes(0, 0, 0)
    const maxHours = 168 // максимум неделя в часах, чтобы избежать перегрузки
    let count = 0
    while (temp <= end && count < maxHours) {
      const key = formatDateKey(temp, 'hour')
      grouped.set(key, { created: 0, done: 0, overdue: 0 })
      temp.setHours(temp.getHours() + 1)
      count++
    }
  } else if (groupBy === 'day') {
    temp.setHours(0, 0, 0, 0)
    const maxDays = 366
    let count = 0
    while (temp <= end && count < maxDays) {
      const key = formatDateKey(temp, 'day')
      grouped.set(key, { created: 0, done: 0, overdue: 0 })
      temp.setDate(temp.getDate() + 1)
      count++
    }
  } else if (groupBy === 'week') {
    temp.setHours(0, 0, 0, 0)
    const maxWeeks = 53
    let count = 0
    while (temp <= end && count < maxWeeks) {
      const key = formatDateKey(temp, 'week')
      grouped.set(key, { created: 0, done: 0, overdue: 0 })
      temp.setDate(temp.getDate() + 7)
      count++
    }
  } else if (groupBy === 'month') {
    temp.setDate(1)
    temp.setHours(0, 0, 0, 0)
    const maxMonths = 36
    let count = 0
    while (temp <= end && count < maxMonths) {
      const key = formatDateKey(temp, 'month')
      grouped.set(key, { created: 0, done: 0, overdue: 0 })
      temp.setMonth(temp.getMonth() + 1)
      count++
    }
  }

  letters.forEach((letter) => {
    // 1. Увеличение счетчика созданных писем (группируем по document date, т.к. фильтры применяются к date)
    const createKey = formatDateKey(letter.date, groupBy)
    if (grouped.has(createKey)) {
      grouped.get(createKey)!.created++
    } else {
      // На случай если дата выходит за сгенерированные границы, добавляем динамически
      grouped.set(createKey, { created: 1, done: 0, overdue: 0 })
    }

    // 2. Увеличение счетчика выполненных писем (по дате фактического закрытия closeDate или updatedAt)
    const isCompleted = ['DONE', 'READY', 'PROCESSED'].includes(letter.status)
    if (isCompleted) {
      const resolvedDate = letter.closeDate || letter.updatedAt
      const doneKey = formatDateKey(resolvedDate, groupBy)
      if (grouped.has(doneKey)) {
        grouped.get(doneKey)!.done++
      } else if (resolvedDate >= start && resolvedDate <= end) {
        grouped.set(doneKey, { created: 0, done: 1, overdue: 0 })
      }
    }

    // 3. Увеличение счетчика просроченных писем (по дедлайну deadlineDate)
    const isOverdue = (() => {
      const deadline = letter.deadlineDate ? new Date(letter.deadlineDate) : null
      if (!deadline) return false

      const closed = letter.closeDate ? new Date(letter.closeDate) : null
      if (isCompleted && closed) {
        return closed > deadline
      }
      return deadline < new Date()
    })()

    if (isOverdue && letter.deadlineDate) {
      const overdueKey = formatDateKey(letter.deadlineDate, groupBy)
      if (grouped.has(overdueKey)) {
        grouped.get(overdueKey)!.overdue++
      } else if (letter.deadlineDate >= start && letter.deadlineDate <= end) {
        grouped.set(overdueKey, { created: 0, done: 0, overdue: 1 })
      }
    }
  })

  return Array.from(grouped.entries())
    .map(([period, stats]) => ({ period, ...stats }))
    .sort((a, b) => a.period.localeCompare(b.period))
}

/**
 * Статистика по организациям
 */
export async function getOrganizationStats(filters: AnalyticsFilters = {}, limit = 10) {
  const where = buildWhereClause(filters)

  const orgs = await prisma.letter.groupBy({
    by: ['org'],
    where,
    _count: { org: true },
    orderBy: { _count: { org: 'desc' } },
    take: limit,
  })

  // Получаем детальную статистику по топ организациям
  const detailedStats = await Promise.all(
    orgs.map(async (org) => {
      const [total, done, overdue, avgPriority] = await Promise.all([
        prisma.letter.count({ where: { ...where, org: org.org } }),
        prisma.letter.count({
          where: { ...where, org: org.org, status: { in: ['DONE', 'READY', 'PROCESSED'] } },
        }),
        prisma.letter.count({
          where: {
            ...where,
            org: org.org,
            deadlineDate: { lt: new Date() },
            status: { notIn: ['DONE', 'READY', 'PROCESSED', 'FROZEN', 'REJECTED'] },
          },
        }),
        prisma.letter.aggregate({
          where: { ...where, org: org.org },
          _avg: { priority: true },
        }),
      ])

      return {
        org: org.org,
        total,
        done,
        overdue,
        inProgress: total - done,
        completionRate: total > 0 ? (done / total) * 100 : 0,
        avgPriority: avgPriority._avg.priority || 0,
      }
    })
  )

  return detailedStats
}

/**
 * Статистика по пользователям (ответственным)
 */
export async function getUserStats(filters: AnalyticsFilters = {}, limit = 10) {
  const where = buildWhereClause(filters)

  const users = await prisma.letter.groupBy({
    by: ['ownerId'],
    where: {
      ...where,
      ownerId: { not: null },
    },
    _count: { ownerId: true },
    orderBy: { _count: { ownerId: 'desc' } },
    take: limit,
  })

  // Получаем детальную статистику
  const detailedStats = await Promise.all(
    users.map(async (user) => {
      if (!user.ownerId) return null

      const [owner, total, done, overdue, inProgress] = await Promise.all([
        prisma.user.findUnique({
          where: { id: user.ownerId },
          select: { id: true, name: true, email: true },
        }),
        prisma.letter.count({ where: { ...where, ownerId: user.ownerId } }),
        prisma.letter.count({
          where: {
            ...where,
            ownerId: user.ownerId,
            status: { in: ['DONE', 'READY', 'PROCESSED'] },
          },
        }),
        prisma.letter.count({
          where: {
            ...where,
            ownerId: user.ownerId,
            deadlineDate: { lt: new Date() },
            status: { notIn: ['DONE', 'READY', 'PROCESSED', 'FROZEN', 'REJECTED'] },
          },
        }),
        prisma.letter.count({
          where: { ...where, ownerId: user.ownerId, status: 'IN_PROGRESS' },
        }),
      ])

      return {
        user: owner,
        total,
        done,
        overdue,
        inProgress,
        completionRate: total > 0 ? (done / total) * 100 : 0,
      }
    })
  )

  return detailedStats.filter((s) => s !== null)
}

/**
 * Статистика по типам запросов
 */
export async function getTypeStats(filters: AnalyticsFilters = {}) {
  const where = buildWhereClause(filters)

  const types = await prisma.letter.groupBy({
    by: ['type'],
    where: {
      ...where,
      type: { not: null },
    },
    _count: { type: true },
    orderBy: { _count: { type: 'desc' } },
  })

  return types
    .filter((t) => t.type !== null)
    .map((t) => ({
      type: t.type as string,
      count: t._count.type,
    }))
}

/**
 * Метрики производительности (SLA, время ответа)
 */
export async function getPerformanceMetrics(filters: AnalyticsFilters = {}) {
  const where = buildWhereClause(filters)

  // Письма с ответом
  const lettersWithAnswer = await prisma.letter.findMany({
    where: {
      ...where,
      answer: { not: null },
      status: { in: ['DONE', 'READY', 'PROCESSED'] },
    },
    select: {
      id: true,
      createdAt: true,
      updatedAt: true,
      date: true,
      deadlineDate: true,
      closeDate: true,
    },
  })

  // Вычисляем метрики
  let totalResponseTime = 0
  let totalResolutionTime = 0
  let onTimeCount = 0
  let lateCount = 0

  lettersWithAnswer.forEach((letter) => {
    const created = new Date(letter.createdAt)
    const updated = new Date(letter.updatedAt)
    const deadline = new Date(letter.deadlineDate)
    const closed = letter.closeDate ? new Date(letter.closeDate) : updated

    // Время ответа (создание -> последнее обновление)
    const responseTime = (updated.getTime() - created.getTime()) / (1000 * 60 * 60) // часы
    totalResponseTime += responseTime

    // Время решения (создание -> закрытие)
    const resolutionTime = (closed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24) // дни
    totalResolutionTime += resolutionTime

    // SLA соблюдение
    if (closed <= deadline) {
      onTimeCount++
    } else {
      lateCount++
    }
  })

  const count = lettersWithAnswer.length

  return {
    avgResponseTime: count > 0 ? totalResponseTime / count : 0, // часы
    avgResolutionTime: count > 0 ? totalResolutionTime / count : 0, // дни
    slaCompliance: count > 0 ? (onTimeCount / count) * 100 : 0, // процент
    onTime: onTimeCount,
    late: lateCount,
    total: count,
  }
}

/**
 * Динамика работы (письма по дням недели и часам)
 */
export async function getActivityPatterns(filters: AnalyticsFilters = {}) {
  const where = buildWhereClause(filters)

  const letters = await prisma.letter.findMany({
    where,
    select: {
      createdAt: true,
    },
  })

  const byDayOfWeek = new Map<number, number>()
  const byHour = new Map<number, number>()

  letters.forEach((letter) => {
    const date = new Date(letter.createdAt)
    const day = date.getDay() // 0 = Воскресенье
    const hour = date.getHours()

    byDayOfWeek.set(day, (byDayOfWeek.get(day) || 0) + 1)
    byHour.set(hour, (byHour.get(hour) || 0) + 1)
  })

  const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']

  return {
    byDayOfWeek: Array.from(byDayOfWeek.entries())
      .map(([day, count]) => ({ day: dayNames[day], count }))
      .sort((a, b) => dayNames.indexOf(a.day) - dayNames.indexOf(b.day)),
    byHour: Array.from(byHour.entries())
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => a.hour - b.hour),
  }
}

/**
 * Вспомогательная функция для построения WHERE условия
 */
function buildWhereClause(filters: AnalyticsFilters) {
  const where: Prisma.LetterWhereInput = {
    deletedAt: null,
  }

  if (filters.dateFrom || filters.dateTo) {
    where.date = {}
    if (filters.dateFrom) where.date.gte = filters.dateFrom
    if (filters.dateTo) where.date.lte = filters.dateTo
  }

  if (filters.ownerId) {
    where.ownerId = filters.ownerId
  }

  if (filters.org) {
    where.org = { contains: filters.org, mode: 'insensitive' }
  }

  if (filters.status && filters.status.length > 0) {
    where.status = { in: filters.status }
  }

  return where
}

/**
 * Форматирует дату для группировки
 */
function formatDateKey(date: Date, groupBy: 'hour' | 'day' | 'week' | 'month'): string {
  const d = new Date(date)

  switch (groupBy) {
    case 'hour': {
      const year = d.getFullYear()
      const month = (d.getMonth() + 1).toString().padStart(2, '0')
      const day = d.getDate().toString().padStart(2, '0')
      const hour = d.getHours().toString().padStart(2, '0')
      return `${day}.${month} ${hour}:00`
    }
    case 'day':
      return d.toISOString().split('T')[0] // YYYY-MM-DD
    case 'week': {
      const week = getWeekNumber(d)
      return `${d.getFullYear()}-W${week.toString().padStart(2, '0')}`
    }
    case 'month':
      return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`
    default:
      return d.toISOString().split('T')[0]
  }
}

/**
 * Получает номер недели в году
 */
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

/**
 * Экспортирует аналитику в JSON
 */
export async function exportAnalytics(filters: AnalyticsFilters = {}) {
  const [stats, trends, orgStats, userStats, typeStats, performance, activity] = await Promise.all([
    getLetterStats(filters),
    getLetterTrends(filters),
    getOrganizationStats(filters),
    getUserStats(filters),
    getTypeStats(filters),
    getPerformanceMetrics(filters),
    getActivityPatterns(filters),
  ])

  return {
    generatedAt: new Date().toISOString(),
    filters,
    stats,
    trends,
    organizations: orgStats,
    users: userStats,
    types: typeStats,
    performance,
    activity,
  }
}

/**
 * Экспортирует аналитику в формате Excel (XLSX)
 */
export async function exportAnalyticsToXlsx(filters: AnalyticsFilters = {}): Promise<Buffer> {
  const [stats, trends, orgStats, userStats, typeStats, performance] = await Promise.all([
    getLetterStats(filters),
    getLetterTrends(filters),
    getOrganizationStats(filters, 50),
    getUserStats(filters, 50),
    getTypeStats(filters),
    getPerformanceMetrics(filters),
  ])

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'D-Letter Analytics'
  workbook.created = new Date()

  // Стили
  const primaryHeaderFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4F46E5' }, // Indigo 600
  }
  const accentHeaderFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF312E81' }, // Indigo 900
  }
  const zebraFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF9FAFB' }, // Slate 50
  }
  const borderThin: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
    left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
    bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
    right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
  }
  const fontRegular = { name: 'Segoe UI', size: 11 }
  const fontBold = { name: 'Segoe UI', size: 11, bold: true }
  const fontTitle = { name: 'Segoe UI', size: 16, bold: true, color: { argb: 'FF1E1B4B' } }

  // 1. Сводная статистика
  const summarySheet = workbook.addWorksheet('Сводная статистика')
  summarySheet.views = [{ showGridLines: true }]

  // Заголовок
  summarySheet.mergeCells('A1:E1')
  const titleCell = summarySheet.getCell('A1')
  titleCell.value = 'АНАЛИТИЧЕСКИЙ ОТЧЕТ ПО ПИСЬМАМ'
  titleCell.font = fontTitle
  titleCell.alignment = { vertical: 'middle', horizontal: 'left' }
  summarySheet.getRow(1).height = 40

  // Блок фильтров
  summarySheet.getCell('A3').value = 'Фильтры отчета:'
  summarySheet.getCell('A3').font = fontBold

  let dateRange = 'Все время'
  if (filters.dateFrom && filters.dateTo) {
    dateRange = `${filters.dateFrom.toLocaleDateString('ru-RU')} - ${filters.dateTo.toLocaleDateString('ru-RU')}`
  } else if (filters.dateFrom) {
    dateRange = `С ${filters.dateFrom.toLocaleDateString('ru-RU')}`
  } else if (filters.dateTo) {
    dateRange = `По ${filters.dateTo.toLocaleDateString('ru-RU')}`
  }
  summarySheet.getCell('A4').value = `Период:`
  summarySheet.getCell('B4').value = dateRange
  summarySheet.getCell('A5').value = `Организация:`
  summarySheet.getCell('B5').value = filters.org || 'Все'
  summarySheet.getCell('A6').value = `Ответственный:`
  summarySheet.getCell('B6').value = filters.ownerId || 'Все'

  summarySheet.getRow(4).getCell(1).font = fontBold
  summarySheet.getRow(5).getCell(1).font = fontBold
  summarySheet.getRow(6).getCell(1).font = fontBold

  // Секция KPI
  summarySheet.getCell('A8').value = 'Ключевые показатели эффективности (KPI)'
  summarySheet.getCell('A8').font = { ...fontBold, size: 13, color: { argb: 'FF312E81' } }

  const kpiHeaders = ['Показатель', 'Значение']
  const kpiRowStart = 9
  const kpis = [
    ['Всего писем в системе', stats.total],
    ['SLA Соблюдение', `${performance.slaCompliance.toFixed(1)}%`],
    ['Среднее время ответа', `${performance.avgResponseTime.toFixed(1)} ч`],
    ['Среднее время решения', `${performance.avgResolutionTime.toFixed(1)} дн`],
    ['Средний приоритет писем', stats.avgPriority.toFixed(1)],
    ['Писем с ответом', stats.answers.withAnswer],
    ['Писем без ответа', stats.answers.withoutAnswer],
    ['Писем с заполненной обработкой', stats.processingFilled],
  ]

  kpiHeaders.forEach((h, i) => {
    const cell = summarySheet.getCell(kpiRowStart, i + 1)
    cell.value = h
    cell.fill = primaryHeaderFill
    cell.font = { ...fontBold, color: { argb: 'FFFFFFFF' } }
    cell.border = borderThin
  })

  kpis.forEach((kpi, rowIndex) => {
    const rowNum = kpiRowStart + 1 + rowIndex
    const row = summarySheet.getRow(rowNum)
    row.getCell(1).value = kpi[0]
    row.getCell(2).value = kpi[1]

    row.getCell(1).font = fontRegular
    row.getCell(2).font = fontBold
    row.getCell(1).border = borderThin
    row.getCell(2).border = borderThin
    row.getCell(2).alignment = { horizontal: 'right' }

    if (rowIndex % 2 === 1) {
      row.getCell(1).fill = zebraFill
      row.getCell(2).fill = zebraFill
    }
  })

  // Секция распределения по статусам
  summarySheet.getCell('D8').value = 'Распределение по статусам'
  summarySheet.getCell('D8').font = { ...fontBold, size: 13, color: { argb: 'FF312E81' } }

  const statusHeaders = ['Статус письма', 'Количество']
  const statusLabels: Record<string, string> = {
    NOT_REVIEWED: 'Не рассмотрено',
    ACCEPTED: 'Принято',
    IN_PROGRESS: 'В работе',
    CLARIFICATION: 'На уточнении',
    FROZEN: 'Заморожено',
    REJECTED: 'Отклонено',
    READY: 'Готово',
    PROCESSED: 'Обработано',
    DONE: 'Выполнено',
  }

  statusHeaders.forEach((h, i) => {
    const cell = summarySheet.getCell(kpiRowStart, i + 4)
    cell.value = h
    cell.fill = primaryHeaderFill
    cell.font = { ...fontBold, color: { argb: 'FFFFFFFF' } }
    cell.border = borderThin
  })

  Object.entries(stats.byStatus).forEach(([status, val], rowIndex) => {
    const rowNum = kpiRowStart + 1 + rowIndex
    const row = summarySheet.getRow(rowNum)
    row.getCell(4).value = statusLabels[status] || status
    row.getCell(5).value = val

    row.getCell(4).font = fontRegular
    row.getCell(5).font = fontBold
    row.getCell(4).border = borderThin
    row.getCell(5).border = borderThin
    row.getCell(5).alignment = { horizontal: 'right' }

    if (rowIndex % 2 === 1) {
      row.getCell(4).fill = zebraFill
      row.getCell(5).fill = zebraFill
    }
  })

  // Секция дедлайнов
  const deadlineRowStart = kpiRowStart + kpis.length + 3
  summarySheet.getCell(`A${deadlineRowStart - 1}`).value = 'Статус выполнения и дедлайны'
  summarySheet.getCell(`A${deadlineRowStart - 1}`).font = {
    ...fontBold,
    size: 13,
    color: { argb: 'FF312E81' },
  }

  const deadlineHeaders = ['Показатель дедлайна', 'Количество писем']
  const deadlineData = [
    ['Просрочено писем', stats.deadlines.overdue],
    ['С дедлайном сегодня', stats.deadlines.dueToday],
    ['С дедлайном на этой неделе', stats.deadlines.dueThisWeek],
  ]

  deadlineHeaders.forEach((h, i) => {
    const cell = summarySheet.getCell(deadlineRowStart, i + 1)
    cell.value = h
    cell.fill = accentHeaderFill
    cell.font = { ...fontBold, color: { argb: 'FFFFFFFF' } }
    cell.border = borderThin
  })

  deadlineData.forEach((item, rowIndex) => {
    const rowNum = deadlineRowStart + 1 + rowIndex
    const row = summarySheet.getRow(rowNum)
    row.getCell(1).value = item[0]
    row.getCell(2).value = item[1]

    row.getCell(1).font = fontRegular
    row.getCell(2).font = fontBold
    row.getCell(1).border = borderThin
    row.getCell(2).border = borderThin
    row.getCell(2).alignment = { horizontal: 'right' }

    if (rowIndex % 2 === 1) {
      row.getCell(1).fill = zebraFill
      row.getCell(2).fill = zebraFill
    }
  })

  summarySheet.getColumn(1).width = 30
  summarySheet.getColumn(2).width = 15
  summarySheet.getColumn(3).width = 5
  summarySheet.getColumn(4).width = 25
  summarySheet.getColumn(5).width = 15

  // 2. Тренды
  const trendsSheet = workbook.addWorksheet('Тренды')
  trendsSheet.views = [{ showGridLines: true }]

  trendsSheet.mergeCells('A1:D1')
  const trendsTitle = trendsSheet.getCell('A1')
  trendsTitle.value = 'ХРОНОЛОГИЯ И ДИНАМИКА ПИСЕМ'
  trendsTitle.font = { ...fontBold, size: 14, color: { argb: 'FF1E1B4B' } }
  trendsSheet.getRow(1).height = 30
  trendsSheet.addRow([])

  const trendsHeaders = ['Период', 'Создано писем', 'Выполнено писем', 'Просрочено писем']
  trendsSheet.addRow(trendsHeaders).eachCell((cell) => {
    cell.fill = primaryHeaderFill
    cell.font = { ...fontBold, color: { argb: 'FFFFFFFF' } }
    cell.border = borderThin
  })

  trends.forEach((t, index) => {
    const row = trendsSheet.addRow([t.period, t.created, t.done, t.overdue])
    row.eachCell((cell) => {
      cell.font = fontRegular
      cell.border = borderThin
      if (index % 2 === 1) cell.fill = zebraFill
    })
    row.getCell(1).alignment = { horizontal: 'center' }
    row.getCell(2).alignment = { horizontal: 'right' }
    row.getCell(3).alignment = { horizontal: 'right' }
    row.getCell(4).alignment = { horizontal: 'right' }
  })
  trendsSheet.getColumn(1).width = 20
  trendsSheet.getColumn(2).width = 18
  trendsSheet.getColumn(3).width = 18
  trendsSheet.getColumn(4).width = 18

  // 3. Учреждения
  const orgSheet = workbook.addWorksheet('Учреждения')
  orgSheet.views = [{ showGridLines: true }]

  orgSheet.mergeCells('A1:G1')
  const orgTitle = orgSheet.getCell('A1')
  orgTitle.value = 'СТАТИСТИКА В РАЗРЕЗЕ МЕДИЦИНСКИХ УЧРЕЖДЕНИЙ'
  orgTitle.font = { ...fontBold, size: 14, color: { argb: 'FF1E1B4B' } }
  orgSheet.getRow(1).height = 30
  orgSheet.addRow([])

  const orgHeaders = [
    'Медицинское учреждение',
    'Всего писем',
    'Выполнено',
    'В работе',
    'Просрочено',
    'SLA Соблюдение',
    'Средний приоритет',
  ]
  orgSheet.addRow(orgHeaders).eachCell((cell) => {
    cell.fill = primaryHeaderFill
    cell.font = { ...fontBold, color: { argb: 'FFFFFFFF' } }
    cell.border = borderThin
  })

  orgStats.forEach((org, index) => {
    const row = orgSheet.addRow([
      org.org,
      org.total,
      org.done,
      org.inProgress,
      org.overdue,
      org.completionRate / 100, // For Excel percentage format
      org.avgPriority,
    ])
    row.eachCell((cell, i) => {
      cell.font = fontRegular
      cell.border = borderThin
      if (index % 2 === 1) cell.fill = zebraFill
      if (i > 1 && i < 6) cell.alignment = { horizontal: 'right' }
    })
    row.getCell(6).numFmt = '0.0%'
    row.getCell(6).alignment = { horizontal: 'right' }
    row.getCell(7).numFmt = '0.0'
    row.getCell(7).alignment = { horizontal: 'right' }
  })
  orgSheet.getColumn(1).width = 40
  orgSheet.getColumn(2).width = 15
  orgSheet.getColumn(3).width = 15
  orgSheet.getColumn(4).width = 15
  orgSheet.getColumn(5).width = 15
  orgSheet.getColumn(6).width = 20
  orgSheet.getColumn(7).width = 18

  // 4. Ответственные
  const userSheet = workbook.addWorksheet('Ответственные')
  userSheet.views = [{ showGridLines: true }]

  userSheet.mergeCells('A1:G1')
  const userTitle = userSheet.getCell('A1')
  userTitle.value = 'ЭФФЕКТИВНОСТЬ РАБОТЫ СОТРУДНИКОВ'
  userTitle.font = { ...fontBold, size: 14, color: { argb: 'FF1E1B4B' } }
  userSheet.getRow(1).height = 30
  userSheet.addRow([])

  const userHeaders = [
    'Сотрудник',
    'Email',
    'Всего писем',
    'Выполнено',
    'В работе',
    'Просрочено',
    'SLA Соблюдение',
  ]
  userSheet.addRow(userHeaders).eachCell((cell) => {
    cell.fill = primaryHeaderFill
    cell.font = { ...fontBold, color: { argb: 'FFFFFFFF' } }
    cell.border = borderThin
  })

  userStats.forEach((us, index) => {
    const row = userSheet.addRow([
      us.user?.name || 'Не назначен',
      us.user?.email || '-',
      us.total,
      us.done,
      us.inProgress,
      us.overdue,
      us.completionRate / 100,
    ])
    row.eachCell((cell, i) => {
      cell.font = fontRegular
      cell.border = borderThin
      if (index % 2 === 1) cell.fill = zebraFill
      if (i > 2) cell.alignment = { horizontal: 'right' }
    })
    row.getCell(7).numFmt = '0.0%'
    row.getCell(7).alignment = { horizontal: 'right' }
  })
  userSheet.getColumn(1).width = 30
  userSheet.getColumn(2).width = 30
  userSheet.getColumn(3).width = 15
  userSheet.getColumn(4).width = 15
  userSheet.getColumn(5).width = 15
  userSheet.getColumn(6).width = 15
  userSheet.getColumn(7).width = 20

  // 5. Типы запросов
  const typeSheet = workbook.addWorksheet('Типы запросов')
  typeSheet.views = [{ showGridLines: true }]

  typeSheet.mergeCells('A1:C1')
  const typeTitle = typeSheet.getCell('A1')
  typeTitle.value = 'СТАТИСТИКА ПО КАТЕГОРИЯМ ЗАПРОСОВ'
  typeTitle.font = { ...fontBold, size: 14, color: { argb: 'FF1E1B4B' } }
  typeSheet.getRow(1).height = 30
  typeSheet.addRow([])

  const typeHeaders = ['Категория / Тип запроса', 'Количество писем', 'Доля от общего числа']
  typeSheet.addRow(typeHeaders).eachCell((cell) => {
    cell.fill = primaryHeaderFill
    cell.font = { ...fontBold, color: { argb: 'FFFFFFFF' } }
    cell.border = borderThin
  })

  typeStats.forEach((t, index) => {
    const share = stats.total > 0 ? t.count / stats.total : 0
    const row = typeSheet.addRow([t.type, t.count, share])
    row.eachCell((cell, i) => {
      cell.font = fontRegular
      cell.border = borderThin
      if (index % 2 === 1) cell.fill = zebraFill
      if (i > 1) cell.alignment = { horizontal: 'right' }
    })
    row.getCell(3).numFmt = '0.0%'
  })
  typeSheet.getColumn(1).width = 40
  typeSheet.getColumn(2).width = 20
  typeSheet.getColumn(3).width = 25

  // Запись в буфер
  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}
