import 'server-only'

import { prisma } from '@/lib/prisma'
import { cache, CACHE_KEYS, CACHE_TTL } from '@/lib/cache'
import { getLetterStatsSnapshot, normalizeLetterReportRecord } from '@/lib/letters-stats'
import type { LetterStatus, Prisma } from '@prisma/client'
import { z } from 'zod'
import type { ReportExportColumns, ReportGranularity, ReportGroupBy } from '@/lib/report-presets'

const reportStatusSchema = z
  .enum([
    'all',
    'NOT_REVIEWED',
    'ACCEPTED',
    'IN_PROGRESS',
    'CLARIFICATION',
    'FROZEN',
    'REJECTED',
    'READY',
    'PROCESSED',
    'DONE',
  ])
  .default('all')

const reportGroupBySchema = z.enum(['orgType', 'org', 'type']).default('orgType')
const reportGranularitySchema = z.enum(['month', 'quarter', 'week']).default('month')

export const reportsQuerySchema = z.object({
  periodMonths: z.coerce
    .number()
    .int()
    .refine((value) => [3, 6, 12].includes(value), {
      message: 'Invalid report period',
    }),
  groupBy: reportGroupBySchema.optional(),
  granularity: reportGranularitySchema.optional(),
  status: reportStatusSchema.optional(),
  ownerId: z.string().optional(),
  org: z.string().max(500).optional(),
  type: z.string().max(100).optional(),
  search: z.string().max(200).optional(),
})

export const reportsExportQuerySchema = reportsQuerySchema.extend({
  format: z.enum(['csv', 'xlsx', 'pdf']),
  columns: z
    .string()
    .optional()
    .transform(
      (value) =>
        value
          ?.split(',')
          .map((item) => item.trim())
          .filter(Boolean) || []
    ),
})

export type ReportsQuery = z.infer<typeof reportsQuerySchema>
export type ReportsExportQuery = z.infer<typeof reportsExportQuerySchema>

export type ReportAggregateRow = {
  periodKey: string
  periodLabel: string
  periodSort: number
  groupKey: string
  groupLabel: string
  org?: string
  type?: string
  count: number
  secondaryLabel?: string
}

export type ReportPeriodGroup = {
  periodKey: string
  periodLabel: string
  periodSort: number
  totalCount: number
  maxCount: number
  rows: ReportAggregateRow[]
}

type ReportMatrixRow = {
  groupKey: string
  values: Record<string, number>
}

type ReportHeatmap = {
  periods: Array<{ key: string; label: string; sort: number }>
  groups: Array<{ key: string; label: string; total: number }>
  rows: ReportMatrixRow[]
  max: number
}

export type LettersReportResponse = Awaited<ReturnType<typeof getLettersReportData>>

type NormalizedReportRecord = ReturnType<typeof normalizeLetterReportRecord>

const REPORT_COLUMN_KEYS = new Set(['period', 'org', 'type', 'status', 'owner', 'count'])

function getReportCacheKey(query: ReportsQuery, role: string | null | undefined) {
  const params = new URLSearchParams()
  params.set('periodMonths', String(query.periodMonths))
  params.set('groupBy', query.groupBy || 'orgType')
  params.set('granularity', query.granularity || 'month')
  params.set('status', query.status || 'all')
  if (query.ownerId) params.set('ownerId', query.ownerId)
  if (query.org) params.set('org', query.org)
  if (query.type) params.set('type', query.type)
  if (query.search) params.set('search', query.search.trim())
  return CACHE_KEYS.REPORTS(`${role || 'unknown'}:${params.toString()}`)
}

function getPeriodStart(periodMonths: number) {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth() - (periodMonths - 1), 1)
}

function getBucket(date: Date, granularity: ReportGranularity) {
  if (granularity === 'week') {
    const start = new Date(date)
    const day = (start.getDay() + 6) % 7
    start.setDate(start.getDate() - day)
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    const key = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`
    const label = `${start.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })} - ${end.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })} ${start.getFullYear()}`
    return { key, label, sortValue: start.getTime() }
  }

  if (granularity === 'quarter') {
    const year = date.getFullYear()
    const quarter = Math.floor(date.getMonth() / 3) + 1
    const key = `${year}-Q${quarter}`
    return {
      key,
      label: `${quarter} кв. ${year}`,
      sortValue: new Date(year, (quarter - 1) * 3, 1).getTime(),
    }
  }

  const year = date.getFullYear()
  const month = date.getMonth()
  const key = `${year}-${String(month + 1).padStart(2, '0')}`
  return {
    key,
    label: date.toLocaleDateString('ru-RU', { month: 'short', year: 'numeric' }),
    sortValue: new Date(year, month, 1).getTime(),
  }
}

function filterLetters(
  letters: NormalizedReportRecord[],
  query: ReportsQuery
): NormalizedReportRecord[] {
  const searchValue = query.search?.trim().toLowerCase() || ''

  return letters.filter((letter) => {
    if (query.status && query.status !== 'all' && letter.status !== query.status) return false
    if (query.ownerId) {
      if (query.ownerId === 'unassigned') {
        if (letter.ownerId) return false
      } else if (letter.ownerId !== query.ownerId) {
        return false
      }
    }
    if (query.org && letter.org !== query.org) return false
    if (query.type && letter.type !== query.type) return false
    if (searchValue) {
      const haystack = `${letter.org} ${letter.type}`.toLowerCase()
      if (!haystack.includes(searchValue)) return false
    }
    return true
  })
}

function buildAggregates(
  letters: NormalizedReportRecord[],
  groupBy: ReportGroupBy,
  granularity: ReportGranularity
) {
  const rows = new Map<string, ReportAggregateRow>()
  const secondaryMap = new Map<string, Map<string, number>>()

  letters.forEach((letter) => {
    const bucket = getBucket(letter.createdAt, granularity)
    const org = letter.org
    const type = letter.type

    let groupKey = ''
    let groupLabel = ''
    let orgValue: string | undefined
    let typeValue: string | undefined

    if (groupBy === 'orgType') {
      groupKey = `${org}||${type}`
      groupLabel = org
      orgValue = org
      typeValue = type
    } else if (groupBy === 'org') {
      groupKey = org
      groupLabel = org
      orgValue = org
    } else {
      groupKey = type
      groupLabel = type
      typeValue = type
    }

    const rowKey = `${bucket.key}||${groupKey}`
    const existing = rows.get(rowKey)
    if (existing) {
      existing.count += 1
    } else {
      rows.set(rowKey, {
        periodKey: bucket.key,
        periodLabel: bucket.label,
        periodSort: bucket.sortValue,
        groupKey,
        groupLabel,
        org: orgValue,
        type: typeValue,
        count: 1,
      })
    }

    if (groupBy !== 'orgType') {
      const groupSecondary = secondaryMap.get(rowKey) || new Map<string, number>()
      const secondaryLabel = groupBy === 'org' ? type : org
      groupSecondary.set(secondaryLabel, (groupSecondary.get(secondaryLabel) || 0) + 1)
      secondaryMap.set(rowKey, groupSecondary)
    }
  })

  return Array.from(rows.values())
    .map((row) => {
      if (groupBy === 'orgType') return row

      const secondary = secondaryMap.get(`${row.periodKey}||${row.groupKey}`)
      if (!secondary) return row

      const topSecondary = Array.from(secondary.entries()).sort((a, b) => b[1] - a[1])[0]?.[0]

      return {
        ...row,
        secondaryLabel: topSecondary,
      }
    })
    .sort((a, b) => {
      if (a.periodSort !== b.periodSort) return b.periodSort - a.periodSort
      if (a.count !== b.count) return b.count - a.count
      return a.groupLabel.localeCompare(b.groupLabel, 'ru-RU')
    })
}

function buildPeriodGroups(rows: ReportAggregateRow[]): ReportPeriodGroup[] {
  const groups = new Map<string, ReportPeriodGroup>()

  rows.forEach((row) => {
    const existing = groups.get(row.periodKey)
    if (existing) {
      existing.totalCount += row.count
      existing.maxCount = Math.max(existing.maxCount, row.count)
      existing.rows.push(row)
      return
    }

    groups.set(row.periodKey, {
      periodKey: row.periodKey,
      periodLabel: row.periodLabel,
      periodSort: row.periodSort,
      totalCount: row.count,
      maxCount: row.count,
      rows: [row],
    })
  })

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      rows: [...group.rows].sort((a, b) => {
        if (a.count !== b.count) return b.count - a.count
        return a.groupLabel.localeCompare(b.groupLabel, 'ru-RU')
      }),
    }))
    .sort((a, b) => b.periodSort - a.periodSort)
}

function buildHeatmap(rows: ReportAggregateRow[]): ReportHeatmap {
  if (rows.length === 0) {
    return { periods: [], groups: [], rows: [], max: 0 }
  }

  const periodMap = new Map<string, { label: string; sort: number }>()
  const groupTotals = new Map<string, { label: string; total: number }>()
  const matrix = new Map<string, Record<string, number>>()
  let max = 0

  rows.forEach((row) => {
    periodMap.set(row.periodKey, { label: row.periodLabel, sort: row.periodSort })
    groupTotals.set(row.groupKey, {
      label: row.groupLabel,
      total: (groupTotals.get(row.groupKey)?.total || 0) + row.count,
    })
    const groupRow = matrix.get(row.groupKey) || {}
    groupRow[row.periodKey] = (groupRow[row.periodKey] || 0) + row.count
    matrix.set(row.groupKey, groupRow)
    max = Math.max(max, row.count)
  })

  const periods = Array.from(periodMap.entries())
    .map(([key, value]) => ({ key, label: value.label, sort: value.sort }))
    .sort((a, b) => b.sort - a.sort)

  const groups = Array.from(groupTotals.entries())
    .map(([key, value]) => ({ key, label: value.label, total: value.total }))
    .sort((a, b) => b.total - a.total)

  return {
    periods,
    groups,
    rows: groups.map((group) => ({
      groupKey: group.key,
      values: matrix.get(group.key) || {},
    })),
    max,
  }
}

function buildSummary(
  letters: NormalizedReportRecord[],
  rows: ReportAggregateRow[],
  periodGroups: ReportPeriodGroup[]
) {
  const orgs = new Set<string>()
  const types = new Set<string>()
  const groups = new Set<string>()
  const periods = new Set<string>()

  letters.forEach((letter) => {
    orgs.add(letter.org)
    types.add(letter.type)
  })

  rows.forEach((row) => {
    groups.add(row.groupKey)
  })

  periodGroups.forEach((group) => {
    periods.add(group.periodKey)
  })

  return {
    total: letters.length,
    orgCount: orgs.size,
    typeCount: types.size,
    groupCount: groups.size,
    periodCount: periods.size,
  }
}

function buildFilterOptions(
  letters: NormalizedReportRecord[],
  ownerStats: Array<{ id: string; name: string; count: number }>
) {
  const orgs = Array.from(new Set(letters.map((letter) => letter.org))).sort((a, b) =>
    a.localeCompare(b, 'ru-RU')
  )
  const types = Array.from(new Set(letters.map((letter) => letter.type))).sort((a, b) =>
    a.localeCompare(b, 'ru-RU')
  )
  const ownerNames = new Map(ownerStats.map((owner) => [owner.id, owner.name]))
  const ownerCounts = new Map<string, number>()
  letters.forEach((letter) => {
    const key = letter.ownerId || 'unassigned'
    ownerCounts.set(key, (ownerCounts.get(key) || 0) + 1)
  })

  const owners = Array.from(ownerCounts.entries())
    .map(([id, count]) => ({
      id,
      name: id === 'unassigned' ? 'Без ответственного' : ownerNames.get(id) || id,
      count,
    }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count
      return a.name.localeCompare(b.name, 'ru-RU')
    })

  return { orgs, types, owners }
}

function buildWhere(periodStart: Date): Prisma.LetterWhereInput {
  return {
    deletedAt: null,
    createdAt: { gte: periodStart },
  }
}

export async function getLettersReportData(query: ReportsQuery, role?: string | null) {
  const normalizedQuery = reportsQuerySchema.parse(query)
  const cacheKey = getReportCacheKey(normalizedQuery, role)
  const cached = await cache.get<{
    summary: Awaited<ReturnType<typeof getLetterStatsSnapshot>>['summary']
    byStatus: Awaited<ReturnType<typeof getLetterStatsSnapshot>>['byStatus']
    byOwner: Awaited<ReturnType<typeof getLetterStatsSnapshot>>['byOwner']
    byType: Awaited<ReturnType<typeof getLetterStatsSnapshot>>['byType']
    monthly: Awaited<ReturnType<typeof getLetterStatsSnapshot>>['monthly']
    generatedAt: string
    filters: ReturnType<typeof buildFilterOptions>
    report: {
      rows: ReportAggregateRow[]
      periodGroups: ReportPeriodGroup[]
      heatmap: ReportHeatmap
      summary: ReturnType<typeof buildSummary>
    }
  }>(cacheKey)
  if (cached) return cached

  const [statsSnapshot, baseLetters] = await Promise.all([
    getLetterStatsSnapshot(),
    prisma.letter.findMany({
      where: buildWhere(getPeriodStart(normalizedQuery.periodMonths)),
      select: {
        createdAt: true,
        org: true,
        type: true,
        status: true,
        ownerId: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  const normalizedLetters = baseLetters.map((letter) => normalizeLetterReportRecord(letter))
  const reportLetters = filterLetters(normalizedLetters, normalizedQuery)
  const rows = buildAggregates(
    reportLetters,
    normalizedQuery.groupBy || 'orgType',
    normalizedQuery.granularity || 'month'
  )
  const periodGroups = buildPeriodGroups(rows)
  const heatmap = buildHeatmap(rows)
  const summary = buildSummary(reportLetters, rows, periodGroups)

  const result = {
    summary: statsSnapshot.summary,
    byStatus: statsSnapshot.byStatus,
    byOwner: statsSnapshot.byOwner,
    byType: statsSnapshot.byType,
    monthly: statsSnapshot.monthly,
    generatedAt: new Date().toISOString(),
    filters: buildFilterOptions(normalizedLetters, statsSnapshot.byOwner),
    report: {
      rows,
      periodGroups,
      heatmap,
      summary,
    },
  }

  await cache.set(cacheKey, result, CACHE_TTL.REPORTS)
  return result
}

export function resolveExportColumns(
  columns: string[],
  fallback: ReportExportColumns
): ReportExportColumns {
  if (!columns || columns.length === 0) {
    return fallback
  }

  const resolved = Object.fromEntries(
    Array.from(REPORT_COLUMN_KEYS).map((key) => [key, columns.includes(key)])
  ) as ReportExportColumns

  return Object.values(resolved).some(Boolean) ? resolved : fallback
}

export function buildExportHeaders(columns: ReportExportColumns): string[] {
  const headers: string[] = []
  if (columns.period) headers.push('Период')
  if (columns.org) headers.push('Учреждение')
  if (columns.type) headers.push('Тип письма')
  if (columns.status) headers.push('Статус')
  if (columns.owner) headers.push('Исполнитель')
  if (columns.count) headers.push('Количество')
  return headers
}

export function buildExportRows(
  rows: ReportAggregateRow[],
  columns: ReportExportColumns,
  context: {
    statusLabel: string
    ownerLabel: string
    orgFilter: string
    typeFilter: string
  }
): string[][] {
  return rows.map((row) => {
    const values: string[] = []
    if (columns.period) values.push(row.periodLabel)
    if (columns.org) values.push(row.org || context.orgFilter || '')
    if (columns.type) values.push(row.type || context.typeFilter || '')
    if (columns.status) values.push(context.statusLabel)
    if (columns.owner) values.push(context.ownerLabel)
    if (columns.count) values.push(String(row.count))
    return values
  })
}

export function csvEscape(value: string): string {
  if (/[",\n;]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function buildCsv(rows: string[][]): string {
  return rows.map((row) => row.map((cell) => csvEscape(cell)).join(',')).join('\n')
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function buildPrintableReportHtml(input: {
  title: string
  generatedAt: string
  filtersLabel: string
  headers: string[]
  rows: string[][]
}) {
  const headerRow = input.headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')
  const bodyRows = input.rows
    .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`)
    .join('')

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(input.title)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 32px; color: #111827; }
    h1 { font-size: 22px; margin-bottom: 6px; }
    .meta { color: #6b7280; font-size: 13px; margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    th { background: #f9fafb; font-weight: 600; font-size: 12px; text-transform: uppercase; color: #6b7280; }
    .footer { margin-top: 28px; font-size: 12px; color: #9ca3af; text-align: center; }
    @media print { body { padding: 16px; } }
  </style>
</head>
<body>
  <h1>${escapeHtml(input.title)}</h1>
  <div class="meta">Сформирован: ${escapeHtml(input.generatedAt)}${input.filtersLabel ? ` | ${escapeHtml(input.filtersLabel)}` : ''}</div>
  <table>
    <thead><tr>${headerRow}</tr></thead>
    <tbody>${bodyRows}</tbody>
  </table>
  <div class="footer">DMED App</div>
  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`
}
