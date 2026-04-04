import { z } from 'zod'
import type { LetterStatus } from '@prisma/client'

export const REPORT_PERIOD_OPTIONS = [3, 6, 12] as const
export const REPORT_CHART_VIEWS = ['status', 'owner', 'type'] as const
export const REPORT_VIEWS = ['cards', 'table', 'heatmap'] as const
export const REPORT_GROUP_BY = ['orgType', 'org', 'type'] as const
export const REPORT_GRANULARITY = ['month', 'quarter', 'week'] as const
export const REPORT_EXPORT_COLUMN_KEYS = [
  'period',
  'org',
  'type',
  'status',
  'owner',
  'count',
] as const

export type ReportChartView = (typeof REPORT_CHART_VIEWS)[number]
export type ReportViewMode = (typeof REPORT_VIEWS)[number]
export type ReportGroupBy = (typeof REPORT_GROUP_BY)[number]
export type ReportGranularity = (typeof REPORT_GRANULARITY)[number]
export type ReportExportColumnKey = (typeof REPORT_EXPORT_COLUMN_KEYS)[number]

export type ReportExportColumns = Record<ReportExportColumnKey, boolean>

export type ReportViewState = {
  periodMonths: (typeof REPORT_PERIOD_OPTIONS)[number]
  chartView: ReportChartView
  ownerSort: 'count' | 'name'
  ownerSortDir: 'asc' | 'desc'
  reportView: ReportViewMode
  reportGroupBy: ReportGroupBy
  reportGranularity: ReportGranularity
  reportStatusFilter: LetterStatus | 'all'
  reportOwnerFilter: string
  reportOrgFilter: string
  reportTypeFilter: string
  reportSearch: string
  reportExportColumns: ReportExportColumns
}

export type ReportViewPreset = {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  view: ReportViewState
}

const reportExportColumnsSchema = z.object({
  period: z.boolean(),
  org: z.boolean(),
  type: z.boolean(),
  status: z.boolean(),
  owner: z.boolean(),
  count: z.boolean(),
})

export const reportViewStateSchema = z.object({
  periodMonths: z.union([z.literal(3), z.literal(6), z.literal(12)]),
  chartView: z.enum(REPORT_CHART_VIEWS),
  ownerSort: z.enum(['count', 'name']).default('count'),
  ownerSortDir: z.enum(['asc', 'desc']).default('desc'),
  reportView: z.enum(REPORT_VIEWS),
  reportGroupBy: z.enum(REPORT_GROUP_BY),
  reportGranularity: z.enum(REPORT_GRANULARITY),
  reportStatusFilter: z
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
    .default('all'),
  reportOwnerFilter: z.string().default(''),
  reportOrgFilter: z.string().default(''),
  reportTypeFilter: z.string().default(''),
  reportSearch: z.string().default(''),
  reportExportColumns: reportExportColumnsSchema,
})

export const reportViewPresetSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(80),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
  view: reportViewStateSchema,
})

export const defaultReportExportColumns = (): ReportExportColumns => ({
  period: true,
  org: true,
  type: true,
  status: false,
  owner: false,
  count: true,
})

export const defaultReportViewState = (): ReportViewState => ({
  periodMonths: 6,
  chartView: 'status',
  ownerSort: 'count',
  ownerSortDir: 'desc',
  reportView: 'cards',
  reportGroupBy: 'orgType',
  reportGranularity: 'month',
  reportStatusFilter: 'all',
  reportOwnerFilter: '',
  reportOrgFilter: '',
  reportTypeFilter: '',
  reportSearch: '',
  reportExportColumns: defaultReportExportColumns(),
})

export function normalizeReportViewState(value: unknown): ReportViewState {
  const parsed = reportViewStateSchema.safeParse(value)
  if (!parsed.success) {
    return defaultReportViewState()
  }

  return {
    ...defaultReportViewState(),
    ...parsed.data,
    reportExportColumns: {
      ...defaultReportExportColumns(),
      ...parsed.data.reportExportColumns,
    },
  }
}

export function normalizeReportPresets(value: unknown): ReportViewPreset[] {
  if (!Array.isArray(value)) return []

  return value
    .map((preset) => reportViewPresetSchema.safeParse(preset))
    .filter((result): result is { success: true; data: ReportViewPreset } => result.success)
    .map((result) => ({
      ...result.data,
      view: normalizeReportViewState(result.data.view),
    }))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export function buildReportPreset(
  name: string,
  view: ReportViewState,
  existingId?: string
): ReportViewPreset {
  const now = new Date().toISOString()

  return {
    id: existingId || crypto.randomUUID(),
    name: name.trim(),
    createdAt: now,
    updatedAt: now,
    view: normalizeReportViewState(view),
  }
}
