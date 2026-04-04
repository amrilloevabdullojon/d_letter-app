'use client'

import { useSession } from 'next-auth/react'
import { Header } from '@/components/Header'
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { hasPermission } from '@/lib/permissions'
import { STATUS_LABELS } from '@/lib/utils'
import type { LetterStatus } from '@/types/prisma'
import {
  Loader2,
  Building2,
  FileText,
  AlertTriangle,
  Clock,
  CheckCircle,
  TrendingUp,
  Users,
  Calendar,
  Timer,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Search,
  Filter,
  Layers,
  Download,
  FileSpreadsheet,
  Share2,
  Save,
  MoreHorizontal,
  Target,
  Zap,
  ExternalLink,
  LayoutGrid,
  Table,
  BarChart3,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  X,
  Printer,
} from 'lucide-react'
import { useAuthRedirect } from '@/hooks/useAuthRedirect'
import { useToast } from '@/components/Toast'
import { useUserPreferences } from '@/hooks/useUserPreferences'
import { useDebounce } from '@/hooks/useDebounce'
import { ResponsiveChart } from '@/components/mobile/ResponsiveChart'
import { ScrollIndicator } from '@/components/mobile/ScrollIndicator'
import {
  defaultReportExportColumns,
  defaultReportViewState,
  type ReportChartView,
  type ReportExportColumns,
  type ReportGranularity,
  type ReportGroupBy,
  type ReportViewMode,
  type ReportViewPreset,
  type ReportViewState,
  normalizeReportPresets,
} from '@/lib/report-presets'

interface ReportsData {
  summary: {
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
  byStatus: Record<LetterStatus, number>
  byOwner: Array<{ id: string; name: string; count: number }>
  byType: Array<{ type: string; count: number }>
  monthly: Array<{ month: string; created: number; done: number }>
  generatedAt: string
  filters: {
    owners: Array<{ id: string; name: string; count: number }>
    orgs: string[]
    types: string[]
  }
  report: {
    rows: ReportAggregateRow[]
    periodGroups: ReportPeriodGroup[]
    heatmap: {
      periods: Array<{ key: string; label: string; sort: number }>
      groups: Array<{ key: string; label: string; total: number }>
      rows: Array<{ groupKey: string; values: Record<string, number> }>
      max: number
    }
    summary: {
      total: number
      orgCount: number
      typeCount: number
      groupCount: number
      periodCount: number
    }
  }
}

interface ReportAggregateRow {
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

interface ReportPeriodGroup {
  periodKey: string
  periodLabel: string
  periodSort: number
  totalCount: number
  maxCount: number
  rows: ReportAggregateRow[]
}

const STATUS_CHART_COLORS: Record<LetterStatus, string> = {
  NOT_REVIEWED: '#6b7280',
  ACCEPTED: '#3b82f6',
  IN_PROGRESS: '#f59e0b',
  CLARIFICATION: '#8b5cf6',
  FROZEN: '#60a5fa',
  REJECTED: '#ef4444',
  READY: '#22c55e',
  PROCESSED: '#6366f1',
  DONE: '#10b981',
}

const REPORT_STATUS_OPTIONS: LetterStatus[] = [
  'NOT_REVIEWED',
  'ACCEPTED',
  'IN_PROGRESS',
  'CLARIFICATION',
  'FROZEN',
  'REJECTED',
  'READY',
  'PROCESSED',
  'DONE',
]

const REPORT_PERIOD_VALUES: ReportViewState['periodMonths'][] = [3, 6, 12]

const isReportPeriod = (value: number): value is ReportViewState['periodMonths'] =>
  REPORT_PERIOD_VALUES.includes(value as ReportViewState['periodMonths'])

const createReportQuery = (state: {
  periodMonths: number
  reportGroupBy: ReportGroupBy
  reportGranularity: ReportGranularity
  reportStatusFilter: LetterStatus | 'all'
  reportOwnerFilter: string
  reportOrgFilter: string
  reportTypeFilter: string
  reportSearch: string
}) => {
  const params = new URLSearchParams()
  params.set('periodMonths', String(state.periodMonths))
  params.set('groupBy', state.reportGroupBy)
  params.set('granularity', state.reportGranularity)
  if (state.reportStatusFilter !== 'all') params.set('status', state.reportStatusFilter)
  if (state.reportOwnerFilter) params.set('ownerId', state.reportOwnerFilter)
  if (state.reportOrgFilter) params.set('org', state.reportOrgFilter)
  if (state.reportTypeFilter) params.set('type', state.reportTypeFilter)
  if (state.reportSearch.trim()) params.set('search', state.reportSearch.trim())
  return params
}

const buildLettersDrilldownParams = (input: {
  status?: LetterStatus | 'all'
  ownerId?: string
  org?: string
  type?: string
}) => {
  const params = new URLSearchParams()
  if (input.status && input.status !== 'all') params.set('status', input.status)
  if (input.ownerId) {
    if (input.ownerId === 'unassigned') {
      params.set('filter', 'unassigned')
    } else {
      params.set('owner', input.ownerId)
    }
  }
  if (input.org) params.set('search', input.org)
  if (input.type) params.set('type', input.type)
  return params
}

// Donut Chart Component
function DonutChart({
  data,
  size = 200,
  strokeWidth = 24,
  onSegmentClick,
}: {
  data: Array<{ label: string; value: number; color: string; key: string }>
  size?: number
  strokeWidth?: number
  onSegmentClick?: (key: string) => void
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0)
  if (total === 0) return null

  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius

  // Calculate offsets without mutation
  const segments = data.map((item, index) => {
    const percentage = item.value / total
    const strokeDasharray = `${percentage * circumference} ${circumference}`
    const offset = data.slice(0, index).reduce((acc, d) => acc + d.value / total, 0)
    const strokeDashoffset = -offset * circumference

    return {
      ...item,
      strokeDasharray,
      strokeDashoffset,
    }
  })

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90 transform">
        {segments.map((segment) => (
          <circle
            key={segment.key}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={segment.color}
            strokeWidth={strokeWidth}
            strokeDasharray={segment.strokeDasharray}
            strokeDashoffset={segment.strokeDashoffset}
            className={`transition-all duration-500 ${onSegmentClick ? 'cursor-pointer hover:opacity-80' : ''}`}
            onClick={() => onSegmentClick?.(segment.key)}
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-white">{total}</span>
        <span className="text-sm text-gray-400">всего</span>
      </div>
    </div>
  )
}

// KPI Card with Goal
function KPICard({
  title,
  value,
  goal,
  icon: Icon,
  color,
  trend,
}: {
  title: string
  value: number
  goal: number
  icon: React.ElementType
  color: string
  trend?: { direction: 'up' | 'down' | 'flat'; label: string }
}) {
  const progress = goal > 0 ? Math.min((value / goal) * 100, 100) : 0
  const isAchieved = value >= goal

  return (
    <div className="panel panel-glass rounded-xl p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`h-5 w-5 ${color}`} />
          <span className="text-sm text-slate-400">{title}</span>
        </div>
        {trend && (
          <span
            className={`inline-flex items-center gap-1 text-xs ${
              trend.direction === 'up'
                ? 'text-emerald-400'
                : trend.direction === 'down'
                  ? 'text-red-400'
                  : 'text-slate-400'
            }`}
          >
            {trend.direction === 'up' && <ArrowUpRight className="h-3 w-3" />}
            {trend.direction === 'down' && <ArrowDownRight className="h-3 w-3" />}
            {trend.direction === 'flat' && <Minus className="h-3 w-3" />}
            {trend.label}
          </span>
        )}
      </div>
      <div className="mb-3 flex items-end gap-2">
        <span className={`text-3xl font-bold ${color}`}>{value}</span>
        <span className="mb-1 text-sm text-slate-500">/ {goal}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full transition-all duration-500 ${isAchieved ? 'bg-emerald-500' : 'bg-amber-500'}`}
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-gray-500">{progress.toFixed(0)}% от цели</span>
        {isAchieved && (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
            <CheckCircle className="h-3 w-3" />
            Достигнуто
          </span>
        )}
      </div>
    </div>
  )
}

// Owner Detail Modal
function OwnerDetailModal({
  owner,
  onClose,
  onNavigate,
}: {
  owner: { id: string; name: string; count: number } | null
  onClose: () => void
  onNavigate: (ownerId: string) => void
}) {
  if (!owner) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="panel panel-glass animate-scaleIn relative w-full max-w-md rounded-2xl p-6">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-2 text-slate-400 transition hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-500/20">
            <Users className="h-6 w-6 text-teal-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">{owner.name || owner.id}</h3>
            <p className="text-sm text-gray-400">Исполнитель</p>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="panel panel-soft rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-white">{owner.count}</div>
            <div className="text-xs text-gray-400">Всего писем</div>
          </div>
          <div className="panel panel-soft rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-emerald-400">—</div>
            <div className="text-xs text-gray-400">Выполнено</div>
          </div>
        </div>

        <button
          onClick={() => onNavigate(owner.id)}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-3 text-white transition hover:bg-teal-500"
        >
          <FileText className="h-4 w-4" />
          Показать письма
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

export default function ReportsPage() {
  const { data: session, status: authStatus } = useSession()
  useAuthRedirect(authStatus)
  const router = useRouter()
  const toast = useToast()
  const { preferences, setPreferences, refresh: refreshPreferences } = useUserPreferences()
  const [stats, setStats] = useState<ReportsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [showAllTypes, setShowAllTypes] = useState(false)
  const [periodMonths, setPeriodMonths] = useState<ReportViewState['periodMonths']>(6)
  const [chartView, setChartView] = useState<ReportChartView>('status')
  const [ownerSort, setOwnerSort] = useState<ReportViewState['ownerSort']>('count')
  const [ownerSortDir, setOwnerSortDir] = useState<ReportViewState['ownerSortDir']>('desc')
  const [ownerPage, setOwnerPage] = useState(1)
  const [selectedOwner, setSelectedOwner] = useState<{
    id: string
    name: string
    count: number
  } | null>(null)
  const [filterOwner, setFilterOwner] = useState<string | null>(null)
  const [reportView, setReportView] = useState<ReportViewMode>('cards')
  const [reportGroupBy, setReportGroupBy] = useState<ReportGroupBy>('orgType')
  const [reportGranularity, setReportGranularity] = useState<ReportGranularity>('month')
  const [reportStatusFilter, setReportStatusFilter] = useState<LetterStatus | 'all'>('all')
  const [reportOwnerFilter, setReportOwnerFilter] = useState('')
  const [reportOrgFilter, setReportOrgFilter] = useState('')
  const [reportTypeFilter, setReportTypeFilter] = useState('')
  const [reportSearch, setReportSearch] = useState('')
  const [reportExportColumns, setReportExportColumns] = useState<ReportExportColumns>(
    defaultReportExportColumns()
  )
  const [expandedReportPeriods, setExpandedReportPeriods] = useState<Record<string, boolean>>({})
  const [advancedReportOpen, setAdvancedReportOpen] = useState(false)
  const [selectedPresetId, setSelectedPresetId] = useState('')
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false)
  const debouncedReportSearch = useDebounce(reportSearch, 300)
  const actionsMenuRef = useRef<HTMLDivElement | null>(null)

  // KPI Goals (configurable)
  const kpiGoals = {
    monthlyDone: 50,
    avgDaysTarget: 5,
    overdueMax: 5,
  }

  const currentReportView = useMemo<ReportViewState>(
    () => ({
      periodMonths,
      chartView,
      ownerSort,
      ownerSortDir,
      reportView,
      reportGroupBy,
      reportGranularity,
      reportStatusFilter,
      reportOwnerFilter,
      reportOrgFilter,
      reportTypeFilter,
      reportSearch,
      reportExportColumns,
    }),
    [
      periodMonths,
      chartView,
      ownerSort,
      ownerSortDir,
      reportView,
      reportGroupBy,
      reportGranularity,
      reportStatusFilter,
      reportOwnerFilter,
      reportOrgFilter,
      reportTypeFilter,
      reportSearch,
      reportExportColumns,
    ]
  )

  const reportPresets = useMemo(
    () => normalizeReportPresets(preferences?.reportPresets),
    [preferences?.reportPresets]
  )

  const applyView = useCallback((view: Partial<ReportViewState>) => {
    const normalized = {
      ...defaultReportViewState(),
      ...view,
      reportExportColumns: {
        ...defaultReportExportColumns(),
        ...view.reportExportColumns,
      },
    }

    setPeriodMonths(normalized.periodMonths)
    setChartView(normalized.chartView)
    setOwnerSort(normalized.ownerSort)
    setOwnerSortDir(normalized.ownerSortDir)
    setReportView(normalized.reportView)
    setReportGroupBy(normalized.reportGroupBy)
    setReportGranularity(normalized.reportGranularity)
    setReportStatusFilter(normalized.reportStatusFilter)
    setReportOwnerFilter(normalized.reportOwnerFilter)
    setReportOrgFilter(normalized.reportOrgFilter)
    setReportTypeFilter(normalized.reportTypeFilter)
    setReportSearch(normalized.reportSearch)
    setReportExportColumns(normalized.reportExportColumns)
  }, [])

  const loadStats = useCallback(
    async (showLoading = true) => {
      if (!session?.user || !hasPermission(session.user.role, 'VIEW_REPORTS')) return
      if (showLoading) setLoading(true)
      try {
        const params = createReportQuery({
          periodMonths,
          reportGroupBy,
          reportGranularity,
          reportStatusFilter,
          reportOwnerFilter,
          reportOrgFilter,
          reportTypeFilter,
          reportSearch: debouncedReportSearch,
        })
        const res = await fetch(`/api/reports/letters?${params.toString()}`, { cache: 'no-store' })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = (await res.json()) as ReportsData
        setStats(data)
        setLastUpdated(new Date(data.generatedAt))
      } catch (error) {
        console.error('Failed to load stats:', error)
        toast.error('Ошибка загрузки', 'Не удалось получить данные отчётов')
      } finally {
        if (showLoading) setLoading(false)
      }
    },
    [
      session?.user,
      periodMonths,
      reportGroupBy,
      reportGranularity,
      reportStatusFilter,
      reportOwnerFilter,
      reportOrgFilter,
      reportTypeFilter,
      debouncedReportSearch,
      toast,
    ]
  )

  useEffect(() => {
    if (!session?.user || !hasPermission(session.user.role, 'VIEW_REPORTS')) {
      return
    }

    void loadStats(!stats)
  }, [session?.user, loadStats])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const urlView = {
      periodMonths: Number(params.get('period') || 0),
      chartView: params.get('chart') as ReportChartView | null,
      ownerSort: params.get('osort') as ReportViewState['ownerSort'] | null,
      ownerSortDir: params.get('osortdir') as ReportViewState['ownerSortDir'] | null,
      reportView: params.get('rview') as ReportViewMode | null,
      reportGroupBy: params.get('rgroup') as ReportGroupBy | null,
      reportGranularity: params.get('rgran') as ReportGranularity | null,
      reportStatusFilter: params.get('rstatus') as LetterStatus | 'all' | null,
      reportOwnerFilter: params.get('rowner'),
      reportOrgFilter: params.get('rorg'),
      reportTypeFilter: params.get('rtype'),
      reportSearch: params.get('rq'),
    }

    if (
      isReportPeriod(urlView.periodMonths) ||
      urlView.chartView ||
      urlView.ownerSort ||
      urlView.ownerSortDir ||
      urlView.reportView ||
      urlView.reportGroupBy ||
      urlView.reportGranularity ||
      urlView.reportStatusFilter ||
      urlView.reportOwnerFilter ||
      urlView.reportOrgFilter ||
      urlView.reportTypeFilter ||
      urlView.reportSearch
    ) {
      applyView({
        periodMonths: isReportPeriod(urlView.periodMonths) ? urlView.periodMonths : undefined,
        chartView: urlView.chartView || undefined,
        ownerSort: urlView.ownerSort || undefined,
        ownerSortDir: urlView.ownerSortDir || undefined,
        reportView: urlView.reportView || undefined,
        reportGroupBy: urlView.reportGroupBy || undefined,
        reportGranularity: urlView.reportGranularity || undefined,
        reportStatusFilter: urlView.reportStatusFilter || undefined,
        reportOwnerFilter: urlView.reportOwnerFilter || undefined,
        reportOrgFilter: urlView.reportOrgFilter || undefined,
        reportTypeFilter: urlView.reportTypeFilter || undefined,
        reportSearch: urlView.reportSearch || undefined,
      })
    }
  }, [applyView])

  useEffect(() => {
    setExpandedReportPeriods({})
  }, [
    periodMonths,
    reportGroupBy,
    reportGranularity,
    reportStatusFilter,
    reportOwnerFilter,
    reportOrgFilter,
    reportTypeFilter,
    reportSearch,
  ])

  useEffect(() => {
    if (!actionsMenuOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      if (!actionsMenuRef.current) return
      if (actionsMenuRef.current.contains(event.target as Node)) return
      setActionsMenuOpen(false)
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActionsMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [actionsMenuOpen])

  const handleRefresh = async () => {
    if (refreshing) return
    setRefreshing(true)
    try {
      await loadStats(false)
    } finally {
      setRefreshing(false)
    }
  }

  const handleResetView = () => {
    applyView(defaultReportViewState())
    setOwnerPage(1)
    setShowAllTypes(false)
    setFilterOwner(null)
    setSelectedPresetId('')
    setExpandedReportPeriods({})
  }

  const handleReportReset = () => {
    const defaults = defaultReportViewState()
    setReportStatusFilter(defaults.reportStatusFilter)
    setReportOwnerFilter(defaults.reportOwnerFilter)
    setReportOrgFilter(defaults.reportOrgFilter)
    setReportTypeFilter(defaults.reportTypeFilter)
    setReportSearch(defaults.reportSearch)
    setExpandedReportPeriods({})
  }

  const persistReportPresets = useCallback(
    async (presets: ReportViewPreset[]) => {
      if (!preferences) {
        throw new Error('Preferences are not ready')
      }

      const optimistic = { ...preferences, reportPresets: presets }
      setPreferences(optimistic)

      const response = await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportPresets: presets }),
      })

      if (!response.ok) {
        await refreshPreferences()
        throw new Error('Failed to save report presets')
      }

      const updated = await response.json()
      setPreferences(updated)
    },
    [preferences, refreshPreferences, setPreferences]
  )

  const handleSaveView = async () => {
    const suggestedName =
      reportPresets.find((preset) => preset.id === selectedPresetId)?.name || 'Мой отчёт'
    const name = window.prompt('Название пресета', suggestedName)?.trim()
    if (!name) return

    try {
      const existing = reportPresets.find((preset) => preset.id === selectedPresetId)
      const nextPreset: ReportViewPreset = {
        id: existing?.id || crypto.randomUUID(),
        name,
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        view: currentReportView,
      }

      const nextPresets = [
        ...reportPresets.filter((preset) => preset.id !== nextPreset.id),
        nextPreset,
      ]
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .slice(0, 12)

      await persistReportPresets(nextPresets)
      setSelectedPresetId(nextPreset.id)
      toast.success(existing ? 'Пресет обновлён' : 'Пресет сохранён')
    } catch (error) {
      console.error('Failed to save report preset', error)
      toast.error('Не удалось сохранить пресет')
    }
  }

  const handleDeletePreset = async () => {
    if (!selectedPresetId) return

    const preset = reportPresets.find((item) => item.id === selectedPresetId)
    if (!preset) return

    if (!confirm(`Удалить пресет «${preset.name}»?`)) return

    try {
      const nextPresets = reportPresets.filter((item) => item.id !== selectedPresetId)
      await persistReportPresets(nextPresets)
      setSelectedPresetId('')
      toast.success('Пресет удалён')
    } catch (error) {
      console.error('Failed to delete report preset', error)
      toast.error('Не удалось удалить пресет')
    }
  }

  const handlePresetSelect = (presetId: string) => {
    setSelectedPresetId(presetId)
    setActionsMenuOpen(false)
    if (!presetId) return

    const preset = reportPresets.find((item) => item.id === presetId)
    if (!preset) return

    applyView(preset.view)
    setOwnerPage(1)
    setExpandedReportPeriods({})
  }

  const handleShare = async () => {
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    url.searchParams.set('period', String(periodMonths))
    url.searchParams.set('chart', chartView)
    url.searchParams.set('osort', ownerSort)
    url.searchParams.set('osortdir', ownerSortDir)
    if (reportView !== 'cards') url.searchParams.set('rview', reportView)
    if (reportGroupBy !== 'orgType') url.searchParams.set('rgroup', reportGroupBy)
    if (reportGranularity !== 'month') url.searchParams.set('rgran', reportGranularity)
    if (reportStatusFilter !== 'all') url.searchParams.set('rstatus', reportStatusFilter)
    if (reportOwnerFilter) url.searchParams.set('rowner', reportOwnerFilter)
    if (reportOrgFilter) url.searchParams.set('rorg', reportOrgFilter)
    if (reportTypeFilter) url.searchParams.set('rtype', reportTypeFilter)
    if (reportSearch) url.searchParams.set('rq', reportSearch)
    try {
      await navigator.clipboard.writeText(url.toString())
      toast.success('Ссылка скопирована')
    } catch (error) {
      console.error('Failed to copy link', error)
      toast.error('Не удалось скопировать ссылку')
    }
  }

  const handleExport = async (format: 'csv' | 'xlsx' | 'pdf') => {
    if (!stats || stats.report.rows.length === 0) {
      toast.error('Нет данных для экспорта за выбранный период')
      return
    }

    try {
      const params = createReportQuery({
        periodMonths,
        reportGroupBy,
        reportGranularity,
        reportStatusFilter,
        reportOwnerFilter,
        reportOrgFilter,
        reportTypeFilter,
        reportSearch,
      })
      params.set('format', format)
      const columns = Object.entries(reportExportColumns)
        .filter(([, enabled]) => enabled)
        .map(([key]) => key)
      if (columns.length > 0) {
        params.set('columns', columns.join(','))
      }

      const exportUrl = `/api/reports/letters/export?${params.toString()}`
      if (format === 'pdf') {
        window.open(exportUrl, '_blank', 'noopener,noreferrer')
        return
      }

      const response = await fetch(exportUrl)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `report-${reportGroupBy}-${new Date().toISOString().slice(0, 10)}.${format}`
      link.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error(`Failed to export report as ${format}`, error)
      toast.error('Не удалось сформировать экспорт')
    }
  }

  const handleReportDrilldown = (row: ReportAggregateRow) => {
    const params = buildLettersDrilldownParams({
      status: reportStatusFilter,
      ownerId: reportOwnerFilter,
      org: row.org || reportOrgFilter,
      type: row.type || reportTypeFilter,
    })
    router.push(`/letters?${params.toString()}`)
  }

  const handleStatusClick = (status: string) => {
    router.push(`/letters?status=${status}`)
  }

  const handleOwnerClick = (owner: { id: string; name: string; count: number }) => {
    setSelectedOwner({ id: owner.id, name: owner.name, count: owner.count })
  }

  const handleNavigateToOwnerLetters = (ownerId: string) => {
    router.push(`/letters?owner=${ownerId}`)
  }

  const handleOwnerSort = (field: 'count' | 'name') => {
    if (ownerSort === field) {
      setOwnerSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setOwnerSort(field)
      setOwnerSortDir(field === 'name' ? 'asc' : 'desc')
    }
    setOwnerPage(1)
  }

  const handleMoreOwners = () => {
    setOwnerPage((prev) => prev + 1)
  }

  const handleCollapseOwners = () => {
    setOwnerPage(1)
  }

  const toggleReportPeriod = (periodKey: string) => {
    setExpandedReportPeriods((prev) => ({
      ...prev,
      [periodKey]: !prev[periodKey],
    }))
  }

  const periodOptions = REPORT_PERIOD_VALUES

  const periodMonthly = useMemo(() => {
    if (!stats) return []
    return stats.monthly.slice(-periodMonths)
  }, [stats, periodMonths])

  const prevMonthly = useMemo(() => {
    if (!stats) return []
    return stats.monthly.slice(-(periodMonths * 2), -periodMonths)
  }, [stats, periodMonths])

  const reportAggregates = stats?.report.rows ?? []
  const reportPeriodGroups = stats?.report.periodGroups ?? []
  const reportHeatmap = stats?.report.heatmap ?? { periods: [], groups: [], rows: [], max: 0 }
  const reportSummary = stats?.report.summary ?? {
    total: 0,
    orgCount: 0,
    typeCount: 0,
    groupCount: 0,
    periodCount: 0,
  }
  const reportOrgOptions = stats?.filters.orgs ?? []
  const reportTypeOptions = stats?.filters.types ?? []
  const reportOwnerOptions = stats?.filters.owners ?? []
  const reportHeatmapMatrix = useMemo(
    () => new Map(reportHeatmap.rows.map((row) => [row.groupKey, row.values])),
    [reportHeatmap.rows]
  )

  const reportOwnerLabel = useMemo(() => {
    if (!reportOwnerFilter) return 'Все ответственные'
    if (reportOwnerFilter === 'unassigned') return 'Без ответственного'
    const owner = reportOwnerOptions.find((item) => item.id === reportOwnerFilter)
    return owner?.name || owner?.id || reportOwnerFilter
  }, [reportOwnerFilter, reportOwnerOptions])

  const reportStatusLabel =
    reportStatusFilter === 'all' ? 'Все статусы' : STATUS_LABELS[reportStatusFilter]

  const reportHasFilters =
    reportStatusFilter !== 'all' ||
    reportOwnerFilter ||
    reportOrgFilter ||
    reportTypeFilter ||
    reportSearch.trim() !== ''

  const sumBy = (items: Array<{ created: number; done: number }>, key: 'created' | 'done') =>
    items.reduce((acc, item) => acc + item[key], 0)

  const periodCreated = sumBy(periodMonthly, 'created')
  const periodDone = sumBy(periodMonthly, 'done')
  const prevCreated = prevMonthly.length > 0 ? sumBy(prevMonthly, 'created') : null
  const prevDone = prevMonthly.length > 0 ? sumBy(prevMonthly, 'done') : null

  const getTrend = (
    current: number,
    previous: number | null
  ): { direction: 'up' | 'down' | 'flat'; label: string } => {
    if (previous === null) return { direction: 'flat', label: 'Нет данных' }
    if (previous === 0) {
      return current === 0
        ? { direction: 'flat', label: '0%' }
        : { direction: 'up', label: '+100%' }
    }
    const diff = current - previous
    const pct = Math.round((diff / previous) * 100)
    const sign = diff > 0 ? '+' : diff < 0 ? '-' : ''
    return {
      direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat',
      label: `${sign}${Math.abs(pct)}%`,
    }
  }

  const createdTrend = getTrend(periodCreated, prevCreated)
  const doneTrend = getTrend(periodDone, prevDone)
  const avgPerMonth =
    periodMonthly.length > 0 ? Math.round(periodCreated / periodMonthly.length) : 0
  const prevAvgPerMonth =
    prevMonthly.length > 0 ? Math.round(sumBy(prevMonthly, 'created') / prevMonthly.length) : null
  const avgTrend = getTrend(avgPerMonth, prevAvgPerMonth)

  const ownersSorted = useMemo(() => {
    if (!stats) return []
    let list = [...stats.byOwner]
    if (filterOwner) {
      list = list.filter((o) => o.id === filterOwner)
    }
    list.sort((a, b) => {
      if (ownerSort === 'name') {
        return ownerSortDir === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
      }
      return ownerSortDir === 'asc' ? a.count - b.count : b.count - a.count
    })
    return list
  }, [stats, ownerSort, ownerSortDir, filterOwner])

  const ownersByCount = useMemo(() => {
    if (!stats) return []
    return [...stats.byOwner].sort((a, b) => b.count - a.count)
  }, [stats])

  const typesChart = useMemo(() => {
    if (!stats) return []
    return [...stats.byType].sort((a, b) => b.count - a.count).slice(0, 6)
  }, [stats])

  const donutData = useMemo(() => {
    if (!stats) return []
    return (Object.keys(stats.byStatus) as LetterStatus[]).map((status) => ({
      key: status,
      label: STATUS_LABELS[status],
      value: stats.byStatus[status],
      color: STATUS_CHART_COLORS[status],
    }))
  }, [stats])

  const ownerPageSize = 8
  const ownersToShow = ownersSorted.slice(0, ownerPage * ownerPageSize)
  const ownersChart = ownersByCount.slice(0, 6)
  const hasMoreOwners = ownersToShow.length < ownersSorted.length
  const canCollapseOwners = ownerPage > 1

  if (authStatus === 'loading') {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center">
        <p className="text-gray-400">Пожалуйста, войдите в систему</p>
      </div>
    )
  }

  if (!hasPermission(session.user.role, 'VIEW_REPORTS')) {
    return (
      <div className="app-shell min-h-screen">
        <Header />
        <main className="mx-auto flex max-w-3xl flex-col items-center justify-center gap-4 px-4 py-24 text-center sm:px-6 lg:px-8">
          <BarChart3 className="h-12 w-12 text-slate-500" />
          <div>
            <h1 className="text-2xl font-semibold text-white">Отчёты недоступны</h1>
            <p className="mt-2 text-sm text-slate-400">
              Для просмотра аналитики нужна роль или разрешение `VIEW_REPORTS`.
            </p>
          </div>
          <button
            onClick={() => router.push('/letters')}
            className="btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm"
          >
            <FileText className="h-4 w-4" />
            Перейти к письмам
          </button>
        </main>
      </div>
    )
  }

  const isInitialLoading = loading && !stats
  if (isInitialLoading) {
    return (
      <div className="app-shell min-h-screen">
        <Header />
        <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <div className="h-16 animate-shimmer rounded-2xl bg-white/5" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 animate-shimmer rounded-xl bg-white/5" />
            ))}
          </div>
          <div className="h-40 animate-shimmer rounded-2xl bg-white/5" />
          <div className="h-64 animate-shimmer rounded-2xl bg-white/5" />
        </main>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center">
        <p className="text-gray-400">Нет данных.</p>
      </div>
    )
  }

  const maxMonthly = Math.max(...periodMonthly.flatMap((m) => [m.created, m.done]), 1)

  const totalStatusCount = Object.values(stats.byStatus).reduce((a, b) => a + b, 0)
  const typesLimit = 8
  const orgTypePreviewLimit = 4
  const reportHeatmapLimit = 10
  const selectedPreset = reportPresets.find((preset) => preset.id === selectedPresetId) || null
  const typesToShow = showAllTypes ? stats.byType : stats.byType.slice(0, typesLimit)
  const maxOwnerCount = ownersByCount[0]?.count || 1
  const maxTypeCount = typesChart[0]?.count || 1
  const totalOwnerCount = ownersByCount.reduce((acc, owner) => acc + owner.count, 0)
  const compactStats = [
    {
      key: 'in-progress',
      label: 'В работе',
      value: stats.summary.inProgress,
      accent: 'text-sky-300',
      meta: 'активных писем',
    },
    {
      key: 'created-period',
      label: `Создано за ${periodMonths} мес`,
      value: periodCreated,
      accent: 'text-violet-300',
      meta: prevCreated !== null ? `было ${prevCreated}` : createdTrend.label,
      trend: createdTrend,
    },
    {
      key: 'done-period',
      label: `Закрыто за ${periodMonths} мес`,
      value: periodDone,
      accent: 'text-emerald-300',
      meta: prevDone !== null ? `было ${prevDone}` : doneTrend.label,
      trend: doneTrend,
    },
    {
      key: 'avg-month',
      label: 'Среднее в месяц',
      value: avgPerMonth,
      accent: 'text-blue-300',
      meta: prevAvgPerMonth !== null ? `было ${prevAvgPerMonth}` : avgTrend.label,
      trend: avgTrend,
    },
    {
      key: 'avg-days',
      label: 'Время до закрытия',
      value: stats.summary.avgDays,
      accent: 'text-orange-300',
      meta: 'дней в среднем',
    },
  ]

  const SortIcon = ownerSortDir === 'asc' ? ArrowUpRight : ArrowDownRight

  return (
    <div className="app-shell min-h-screen">
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Отчёты и статистика</h1>
            {lastUpdated && (
              <p className="mt-1 text-sm text-slate-400">
                Обновлено: {lastUpdated.toLocaleString('ru-RU')}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/my-progress"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-teal-600/50 bg-teal-600/10 px-4 py-2 text-teal-400 transition hover:bg-teal-600/20"
            >
              <TrendingUp className="h-4 w-4" />
              Мой прогресс
            </a>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white transition hover:bg-white/10 disabled:opacity-50"
            >
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Обновить
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="panel panel-glass mb-6 rounded-2xl p-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)_auto] xl:items-center">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-400">Быстрый вид</div>
                  <div className="mt-1 text-sm text-slate-500">
                    Сохрани отчёт как пресет и переключайся между сценариями в один клик.
                  </div>
                </div>
                {selectedPreset && (
                  <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300">
                    {selectedPreset.name}
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <select
                  value={selectedPresetId}
                  onChange={(event) => handlePresetSelect(event.target.value)}
                  className="h-10 min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-4 text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/50"
                >
                  <option value="">Без пресета</option>
                  {reportPresets.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleSaveView}
                  className="btn-secondary inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm transition"
                >
                  <Save className="h-4 w-4" />
                  {selectedPreset ? 'Обновить' : 'Сохранить'}
                </button>
              </div>
            </div>

            <ScrollIndicator
              className="no-scrollbar flex items-center gap-2 sm:flex-wrap"
              showArrows={true}
            >
              <span className="whitespace-nowrap text-xs uppercase tracking-wide text-slate-400">
                Период
              </span>
              {periodOptions.map((months) => (
                <button
                  key={months}
                  onClick={() => setPeriodMonths(months)}
                  className={`app-chip inline-flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-1.5 text-sm transition ${
                    periodMonths === months ? 'app-chip-active' : ''
                  }`}
                >
                  <Calendar className="h-4 w-4" />
                  {months} мес
                </button>
              ))}
            </ScrollIndicator>

            <div className="flex flex-wrap items-center gap-2 xl:justify-end">
              <button
                onClick={() => setAdvancedReportOpen((prev) => !prev)}
                className="btn-secondary inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm transition"
              >
                <Filter className="h-4 w-4" />
                Фильтры отчёта
                {advancedReportOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
              <div className="relative" ref={actionsMenuRef}>
                <button
                  type="button"
                  onClick={() => setActionsMenuOpen((prev) => !prev)}
                  aria-expanded={actionsMenuOpen}
                  className={`btn-ghost inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm transition ${
                    actionsMenuOpen ? 'bg-white/10 text-white' : ''
                  }`}
                >
                  <MoreHorizontal className="h-4 w-4" />
                  Еще
                  <ChevronDown
                    className={`h-4 w-4 transition ${actionsMenuOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {actionsMenuOpen && (
                  <div className="panel panel-solid absolute right-0 top-full z-20 mt-2 flex min-w-[240px] flex-col gap-1 rounded-xl p-2 shadow-2xl">
                    <button
                      onClick={() => {
                        setActionsMenuOpen(false)
                        void handleShare()
                      }}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-white transition hover:bg-white/5"
                    >
                      <Share2 className="h-4 w-4 text-teal-300" />
                      Поделиться видом
                    </button>
                    <button
                      onClick={() => {
                        setActionsMenuOpen(false)
                        handleResetView()
                      }}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-white transition hover:bg-white/5"
                    >
                      <RefreshCw className="h-4 w-4 text-slate-300" />
                      Сбросить вид
                    </button>
                    <button
                      onClick={() => {
                        setActionsMenuOpen(false)
                        void handleDeletePreset()
                      }}
                      disabled={!selectedPresetId}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-rose-200 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <X className="h-4 w-4 text-rose-300" />
                      Удалить пресет
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* KPI Cards with Goals */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <KPICard
            title="Закрыто за месяц"
            value={stats.summary.monthDone}
            goal={kpiGoals.monthlyDone}
            icon={Target}
            color="text-emerald-400"
            trend={doneTrend}
          />
          <KPICard
            title="Среднее время (дней)"
            value={stats.summary.avgDays}
            goal={kpiGoals.avgDaysTarget}
            icon={Zap}
            color="text-blue-400"
          />
          <KPICard
            title="Просроченные"
            value={stats.summary.overdue}
            goal={kpiGoals.overdueMax}
            icon={AlertTriangle}
            color="text-red-400"
          />
        </div>

        {/* Quick Stats */}
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <button
            onClick={() => router.push('/letters')}
            className="panel panel-soft group rounded-xl p-4 text-left transition hover:bg-white/10"
          >
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-emerald-400" />
                <span className="text-sm text-gray-400">Все письма</span>
              </div>
              <ExternalLink className="h-4 w-4 text-slate-600 transition group-hover:text-slate-400" />
            </div>
            <div className="text-3xl font-bold text-white">{stats.summary.total}</div>
          </button>

          <button
            onClick={() => router.push('/letters?filter=overdue')}
            className="panel panel-soft group rounded-xl p-4 text-left transition hover:bg-white/10"
          >
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-400" />
                <span className="text-sm text-gray-400">Просроченные</span>
              </div>
              <ExternalLink className="h-4 w-4 text-slate-600 transition group-hover:text-slate-400" />
            </div>
            <div className="text-3xl font-bold text-red-400">{stats.summary.overdue}</div>
          </button>

          <button
            onClick={() => router.push('/letters?filter=urgent')}
            className="panel panel-soft group rounded-xl p-4 text-left transition hover:bg-white/10"
          >
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-400" />
                <span className="text-sm text-gray-400">Срочные</span>
              </div>
              <ExternalLink className="h-4 w-4 text-slate-600 transition group-hover:text-slate-400" />
            </div>
            <div className="text-3xl font-bold text-yellow-400">{stats.summary.urgent}</div>
          </button>

          <button
            onClick={() => handleStatusClick('DONE')}
            className="panel panel-soft group rounded-xl p-4 text-left transition hover:bg-white/10"
          >
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-emerald-400" />
                <span className="text-sm text-gray-400">Выполнено</span>
              </div>
              <ExternalLink className="h-4 w-4 text-slate-600 transition group-hover:text-slate-400" />
            </div>
            <div className="text-3xl font-bold text-emerald-400">{stats.summary.done}</div>
          </button>
        </div>

        {/* Secondary Stats */}
        <div className="panel panel-soft mb-8 rounded-2xl p-4">
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Дополнительные показатели</h3>
              <p className="text-xs text-slate-400">
                Тихая сводка по периоду без перегрузки основного экрана.
              </p>
            </div>
            <span className="text-xs text-slate-500">Период анализа: {periodMonths} мес</span>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            {compactStats.map((item) => (
              <div
                key={item.key}
                className="border-white/8 rounded-xl border bg-black/10 px-4 py-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs text-slate-400">{item.label}</span>
                  {item.trend && (
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] ${
                        item.trend.direction === 'up'
                          ? 'text-emerald-400'
                          : item.trend.direction === 'down'
                            ? 'text-red-400'
                            : 'text-slate-500'
                      }`}
                    >
                      {item.trend.direction === 'up' && <ArrowUpRight className="h-3 w-3" />}
                      {item.trend.direction === 'down' && <ArrowDownRight className="h-3 w-3" />}
                      {item.trend.label}
                    </span>
                  )}
                </div>
                <div className={`mt-3 text-2xl font-semibold ${item.accent}`}>{item.value}</div>
                <div className="mt-1 text-xs text-slate-500">{item.meta}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Distribution Chart with Donut */}
        <div className="panel panel-solid mb-8 rounded-2xl p-6">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">Распределение</h3>
              <p className="text-sm text-gray-400">Нажмите на сегмент для перехода к списку</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setChartView('status')}
                className={`app-chip inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition ${
                  chartView === 'status' ? 'app-chip-active' : ''
                }`}
              >
                <Filter className="h-4 w-4" />
                Статусы
              </button>
              <button
                onClick={() => setChartView('owner')}
                className={`app-chip inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition ${
                  chartView === 'owner' ? 'app-chip-active' : ''
                }`}
              >
                <Users className="h-4 w-4" />
                Исполнители
              </button>
              <button
                onClick={() => setChartView('type')}
                className={`app-chip inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition ${
                  chartView === 'type' ? 'app-chip-active' : ''
                }`}
              >
                <Layers className="h-4 w-4" />
                Типы
              </button>
            </div>
          </div>

          {chartView === 'status' && (
            <div className="flex flex-col items-center gap-8 lg:flex-row">
              {/* Donut Chart */}
              <div className="flex-shrink-0">
                <ResponsiveChart minWidth={180} maxWidth={220} aspectRatio={1}>
                  {(size) => (
                    <DonutChart
                      data={donutData}
                      size={size.width}
                      strokeWidth={size.width > 200 ? 24 : 20}
                      onSegmentClick={handleStatusClick}
                    />
                  )}
                </ResponsiveChart>
              </div>

              {/* Legend & Bars */}
              <div className="w-full flex-1">
                {totalStatusCount > 0 ? (
                  <div className="space-y-3">
                    {(Object.keys(stats.byStatus) as LetterStatus[]).map((status) => {
                      const count = stats.byStatus[status]
                      const percentage = totalStatusCount > 0 ? (count / totalStatusCount) * 100 : 0

                      return (
                        <button
                          key={status}
                          onClick={() => handleStatusClick(status)}
                          className="group flex w-full items-center gap-3 rounded-lg p-2 transition hover:bg-white/5"
                        >
                          <div
                            className="h-3 w-3 flex-shrink-0 rounded-full"
                            style={{ backgroundColor: STATUS_CHART_COLORS[status] }}
                          />
                          <div className="w-28 truncate text-left text-sm text-slate-400">
                            {STATUS_LABELS[status]}
                          </div>
                          <div className="h-5 flex-1 overflow-hidden rounded-full bg-white/10">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${percentage}%`,
                                backgroundColor: STATUS_CHART_COLORS[status],
                              }}
                            />
                          </div>
                          <div className="flex w-16 items-center gap-1 text-right">
                            <span className="font-medium text-white">{count}</span>
                            <span className="text-sm text-slate-500">
                              ({percentage.toFixed(0)}%)
                            </span>
                          </div>
                          <ExternalLink className="h-4 w-4 text-slate-600 transition group-hover:text-teal-400" />
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <p className="py-6 text-sm text-gray-500">Нет данных.</p>
                )}
              </div>
            </div>
          )}

          {chartView === 'owner' && (
            <>
              {ownersChart.length > 0 ? (
                <div className="space-y-3">
                  {ownersChart.map((owner, index) => {
                    const percentage = maxOwnerCount > 0 ? (owner.count / maxOwnerCount) * 100 : 0
                    return (
                      <button
                        key={owner.id}
                        onClick={() => handleOwnerClick(owner)}
                        className="group flex w-full items-center gap-3 rounded-lg p-2 transition hover:bg-white/5"
                      >
                        <div className="w-6 text-sm text-slate-500">{index + 1}.</div>
                        <div className="w-36 truncate text-left text-sm text-slate-300">
                          {owner.name || owner.id}
                        </div>
                        <div className="h-5 flex-1 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <div className="w-10 text-right font-medium text-white">{owner.count}</div>
                        <ExternalLink className="h-4 w-4 text-slate-600 transition group-hover:text-teal-400" />
                      </button>
                    )
                  })}
                </div>
              ) : (
                <p className="py-6 text-sm text-gray-500">Нет данных.</p>
              )}
            </>
          )}

          {chartView === 'type' && (
            <>
              {typesChart.length > 0 ? (
                <div className="space-y-3">
                  {typesChart.map((item) => {
                    const percentage = maxTypeCount > 0 ? (item.count / maxTypeCount) * 100 : 0
                    return (
                      <div key={item.type} className="flex items-center gap-3">
                        <div className="w-40 truncate text-sm text-slate-300">{item.type}</div>
                        <div className="h-5 flex-1 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-sky-500 transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <div className="w-10 text-right font-medium text-white">{item.count}</div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="py-6 text-sm text-gray-500">Нет данных.</p>
              )}
            </>
          )}
        </div>

        {/* Owners Activity Table */}
        <div className="panel panel-solid mb-8 rounded-2xl p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">Активность исполнителей</h3>
              <p className="text-sm text-gray-400">Нажмите на исполнителя для просмотра деталей</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {filterOwner && (
                <button
                  onClick={() => setFilterOwner(null)}
                  className="inline-flex items-center gap-1 rounded bg-teal-500/20 px-2 py-1 text-xs text-teal-400"
                >
                  <X className="h-3 w-3" />
                  Сбросить фильтр
                </button>
              )}
              <button
                onClick={() => handleOwnerSort('count')}
                className={`app-chip inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition ${
                  ownerSort === 'count' ? 'app-chip-active' : ''
                }`}
              >
                <Filter className="h-4 w-4" />
                По объему
                {ownerSort === 'count' && <SortIcon className="h-4 w-4" />}
              </button>
              <button
                onClick={() => handleOwnerSort('name')}
                className={`app-chip inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition ${
                  ownerSort === 'name' ? 'app-chip-active' : ''
                }`}
              >
                <Users className="h-4 w-4" />
                По имени
                {ownerSort === 'name' && <SortIcon className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {ownersSorted.length > 0 ? (
            <>
              <div className="hidden overflow-x-auto sm:block">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-xs uppercase tracking-wide text-slate-400">
                      <th className="px-2 pb-3 text-left">Исполнитель</th>
                      <th className="px-2 pb-3 text-right">Писем</th>
                      <th className="px-2 pb-3 text-right">Доля</th>
                      <th className="px-2 pb-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {ownersToShow.map((owner) => {
                      const share =
                        totalOwnerCount > 0 ? Math.round((owner.count / totalOwnerCount) * 100) : 0
                      const progress = maxOwnerCount > 0 ? (owner.count / maxOwnerCount) * 100 : 0
                      return (
                        <tr
                          key={owner.id}
                          className="cursor-pointer text-sm transition hover:bg-white/5"
                          onClick={() => handleOwnerClick(owner)}
                        >
                          <td className="px-2 py-3 text-white">
                            <div className="font-medium">{owner.name || owner.id}</div>
                            <div className="text-xs text-gray-500">{share}% от всех писем</div>
                          </td>
                          <td className="px-2 py-3 text-right font-semibold text-white">
                            {owner.count}
                          </td>
                          <td className="px-2 py-3">
                            <div className="flex items-center gap-2">
                              <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                                <div
                                  className="h-2 rounded-full bg-emerald-500"
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                              <span className="w-10 text-right text-xs text-slate-400">
                                {share}%
                              </span>
                            </div>
                          </td>
                          <td className="px-2 py-3">
                            <ExternalLink className="h-4 w-4 text-slate-600" />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile view */}
              <div className="space-y-3 sm:hidden">
                {ownersToShow.map((owner) => {
                  const share =
                    totalOwnerCount > 0 ? Math.round((owner.count / totalOwnerCount) * 100) : 0
                  const progress = maxOwnerCount > 0 ? (owner.count / maxOwnerCount) * 100 : 0
                  return (
                    <button
                      key={owner.id}
                      onClick={() => handleOwnerClick(owner)}
                      className="panel-soft panel-glass w-full rounded-xl p-4 text-left"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-medium text-white">
                            {owner.name || owner.id}
                          </div>
                          <div className="text-xs text-gray-500">{share}% от всех</div>
                        </div>
                        <div className="text-right font-semibold text-white">{owner.count}</div>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-2 rounded-full bg-emerald-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </button>
                  )
                })}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                {hasMoreOwners && (
                  <button
                    onClick={handleMoreOwners}
                    className="text-sm text-emerald-400 transition hover:text-emerald-300"
                  >
                    Показать еще
                  </button>
                )}
                {canCollapseOwners && (
                  <button
                    onClick={handleCollapseOwners}
                    className="text-sm text-slate-400 transition hover:text-slate-300"
                  >
                    Свернуть
                  </button>
                )}
              </div>
            </>
          ) : (
            <p className="py-6 text-sm text-gray-500">Нет данных.</p>
          )}
        </div>

        {/* Monthly Chart */}
        <div className="panel panel-solid mb-8 rounded-2xl p-6">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">Динамика по месяцам</h3>
              <p className="text-sm text-gray-400">Сравнение созданных и закрытых</p>
            </div>
            <span className="text-xs text-gray-500">{periodMonthly.length} мес</span>
          </div>

          {periodMonthly.length > 0 ? (
            <div className="overflow-x-auto">
              <div className="flex h-48 min-w-[520px] items-end gap-3">
                {periodMonthly.map((month, index) => {
                  const label = `${month.month}: ${month.created} / ${month.done}`
                  return (
                    <div
                      key={index}
                      className="flex flex-1 flex-col items-center gap-2"
                      title={label}
                    >
                      <div className="flex w-full flex-1 items-end gap-1">
                        <div className="flex flex-1 flex-col justify-end">
                          <div
                            className="w-full rounded-t bg-blue-500 transition-all duration-500"
                            style={{
                              height: `${(month.created / maxMonthly) * 100}%`,
                              minHeight: month.created > 0 ? '8px' : '0',
                            }}
                          />
                        </div>
                        <div className="flex flex-1 flex-col justify-end">
                          <div
                            className="w-full rounded-t bg-emerald-500 transition-all duration-500"
                            style={{
                              height: `${(month.done / maxMonthly) * 100}%`,
                              minHeight: month.done > 0 ? '8px' : '0',
                            }}
                          />
                        </div>
                      </div>
                      <div className="text-xs text-slate-500">{month.month}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <p className="py-6 text-sm text-gray-500">Нет данных.</p>
          )}

          <div className="mt-4 flex flex-wrap justify-center gap-6 border-t border-white/10 pt-4">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-blue-500" />
              <span className="text-sm text-gray-400">Создано</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-emerald-500" />
              <span className="text-sm text-gray-400">Закрыто</span>
            </div>
          </div>
        </div>

        {/* Server Report */}
        <div className="panel panel-solid mb-8 rounded-2xl p-6">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">Отчёт по письмам</h3>
              <p className="text-sm text-slate-400">
                Агрегация строится на сервере и учитывает текущие фильтры, группировку и период.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => handleExport('csv')}
                disabled={reportAggregates.length === 0}
                className="btn-secondary inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm transition disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                CSV
              </button>
              <button
                onClick={() => handleExport('xlsx')}
                disabled={reportAggregates.length === 0}
                className="btn-secondary inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm transition disabled:opacity-50"
              >
                <FileSpreadsheet className="h-4 w-4" />
                XLSX
              </button>
              <button
                onClick={() => handleExport('pdf')}
                disabled={reportAggregates.length === 0}
                className="btn-secondary inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm transition disabled:opacity-50"
              >
                <Printer className="h-4 w-4" />
                PDF
              </button>
            </div>
          </div>

          {reportHasFilters && (
            <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-slate-400">
              {reportStatusFilter !== 'all' && (
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
                  Статус: {reportStatusLabel}
                </span>
              )}
              {reportOwnerFilter && (
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
                  Исполнитель: {reportOwnerLabel}
                </span>
              )}
              {reportOrgFilter && (
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
                  Учреждение: {reportOrgFilter}
                </span>
              )}
              {reportTypeFilter && (
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
                  Тип: {reportTypeFilter}
                </span>
              )}
              {reportSearch.trim() && (
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
                  Поиск: {reportSearch.trim()}
                </span>
              )}
              <button
                onClick={handleReportReset}
                className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-rose-300 transition hover:bg-white/10"
              >
                <X className="h-3 w-3" />
                Сбросить фильтры
              </button>
            </div>
          )}

          {advancedReportOpen && (
            <div className="panel panel-soft mb-6 rounded-xl p-4">
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.4fr,1fr,1fr]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    value={reportSearch}
                    onChange={(event) => setReportSearch(event.target.value)}
                    placeholder="Поиск по учреждениям и типам"
                    className="h-10 w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 text-white placeholder:text-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/50"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-slate-400" />
                  <select
                    value={reportStatusFilter}
                    onChange={(event) =>
                      setReportStatusFilter(event.target.value as LetterStatus | 'all')
                    }
                    className="h-10 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/50"
                  >
                    <option value="all">Все статусы</option>
                    {REPORT_STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {STATUS_LABELS[status]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-slate-400" />
                  <select
                    value={reportOwnerFilter}
                    onChange={(event) => setReportOwnerFilter(event.target.value)}
                    className="h-10 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/50"
                  >
                    <option value="">Все исполнители</option>
                    {reportOwnerOptions.map((owner) => (
                      <option key={owner.id || 'unknown'} value={owner.id || ''}>
                        {owner.name || owner.id}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-[1fr,1fr]">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-slate-400" />
                  <select
                    value={reportOrgFilter}
                    onChange={(event) => setReportOrgFilter(event.target.value)}
                    className="h-10 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/50"
                  >
                    <option value="">Все учреждения</option>
                    {reportOrgOptions.map((org) => (
                      <option key={org} value={org}>
                        {org}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-slate-400" />
                  <select
                    value={reportTypeFilter}
                    onChange={(event) => setReportTypeFilter(event.target.value)}
                    className="h-10 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/50"
                  >
                    <option value="">Все типы</option>
                    {reportTypeOptions.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="text-xs uppercase tracking-wide text-gray-400">Группировка</span>
                <button
                  onClick={() => setReportGroupBy('orgType')}
                  className={`app-chip inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition ${
                    reportGroupBy === 'orgType' ? 'app-chip-active' : ''
                  }`}
                >
                  Учреждение + тип
                </button>
                <button
                  onClick={() => setReportGroupBy('org')}
                  className={`app-chip inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition ${
                    reportGroupBy === 'org' ? 'app-chip-active' : ''
                  }`}
                >
                  Учреждение
                </button>
                <button
                  onClick={() => setReportGroupBy('type')}
                  className={`app-chip inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition ${
                    reportGroupBy === 'type' ? 'app-chip-active' : ''
                  }`}
                >
                  Тип
                </button>

                <span className="ml-2 text-xs uppercase tracking-wide text-gray-400">Период</span>
                <button
                  onClick={() => setReportGranularity('month')}
                  className={`app-chip inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition ${
                    reportGranularity === 'month' ? 'app-chip-active' : ''
                  }`}
                >
                  Месяц
                </button>
                <button
                  onClick={() => setReportGranularity('quarter')}
                  className={`app-chip inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition ${
                    reportGranularity === 'quarter' ? 'app-chip-active' : ''
                  }`}
                >
                  Квартал
                </button>
                <button
                  onClick={() => setReportGranularity('week')}
                  className={`app-chip inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition ${
                    reportGranularity === 'week' ? 'app-chip-active' : ''
                  }`}
                >
                  Неделя
                </button>

                <span className="ml-2 text-xs uppercase tracking-wide text-gray-400">Вид</span>
                <button
                  onClick={() => setReportView('cards')}
                  className={`app-chip inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition ${
                    reportView === 'cards' ? 'app-chip-active' : ''
                  }`}
                >
                  <LayoutGrid className="h-4 w-4" />
                  Карточки
                </button>
                <button
                  onClick={() => setReportView('table')}
                  className={`app-chip inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition ${
                    reportView === 'table' ? 'app-chip-active' : ''
                  }`}
                >
                  <Table className="h-4 w-4" />
                  Таблица
                </button>
                <button
                  onClick={() => setReportView('heatmap')}
                  className={`app-chip inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition ${
                    reportView === 'heatmap' ? 'app-chip-active' : ''
                  }`}
                >
                  <BarChart3 className="h-4 w-4" />
                  Теплокарта
                </button>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                <span className="uppercase tracking-wide">Колонки экспорта</span>
                {(
                  [
                    { key: 'period', label: 'Период' },
                    { key: 'org', label: 'Учреждение' },
                    { key: 'type', label: 'Тип письма' },
                    { key: 'status', label: 'Статус' },
                    { key: 'owner', label: 'Исполнитель' },
                    { key: 'count', label: 'Количество' },
                  ] as const
                ).map((column) => (
                  <label
                    key={column.key}
                    className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1"
                  >
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 accent-emerald-500"
                      checked={reportExportColumns[column.key]}
                      onChange={(event) =>
                        setReportExportColumns((prev) => ({
                          ...prev,
                          [column.key]: event.target.checked,
                        }))
                      }
                    />
                    {column.label}
                  </label>
                ))}
              </div>
            </div>
          )}

          {reportAggregates.length > 0 ? (
            <>
              <div className="mb-6 grid grid-cols-2 gap-2 lg:grid-cols-5">
                <div className="border-white/8 rounded-xl border bg-white/[0.03] px-3 py-2.5">
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-slate-400">
                    <FileText className="h-4 w-4 text-emerald-400" />
                    Всего писем
                  </div>
                  <div className="mt-2 text-xl font-semibold text-white">{reportSummary.total}</div>
                </div>
                <div className="border-white/8 rounded-xl border bg-white/[0.03] px-3 py-2.5">
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-slate-400">
                    <Filter className="h-4 w-4 text-sky-400" />
                    Группы
                  </div>
                  <div className="mt-2 text-xl font-semibold text-white">
                    {reportSummary.groupCount}
                  </div>
                </div>
                <div className="border-white/8 rounded-xl border bg-white/[0.03] px-3 py-2.5">
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-slate-400">
                    <Building2 className="h-4 w-4 text-amber-400" />
                    Учреждения
                  </div>
                  <div className="mt-2 text-xl font-semibold text-white">
                    {reportSummary.orgCount}
                  </div>
                </div>
                <div className="border-white/8 rounded-xl border bg-white/[0.03] px-3 py-2.5">
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-slate-400">
                    <Layers className="h-4 w-4 text-purple-400" />
                    Типы
                  </div>
                  <div className="mt-2 text-xl font-semibold text-white">
                    {reportSummary.typeCount}
                  </div>
                </div>
                <div className="border-white/8 rounded-xl border bg-white/[0.03] px-3 py-2.5">
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-slate-400">
                    <Calendar className="h-4 w-4 text-emerald-400" />
                    Периоды
                  </div>
                  <div className="mt-2 text-xl font-semibold text-white">
                    {reportSummary.periodCount}
                  </div>
                </div>
              </div>

              {reportView === 'cards' && (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {reportPeriodGroups.map((group) => {
                    const isExpanded = !!expandedReportPeriods[group.periodKey]
                    const rowsToShow = isExpanded
                      ? group.rows
                      : group.rows.slice(0, orgTypePreviewLimit)
                    const hasMore = group.rows.length > orgTypePreviewLimit
                    return (
                      <div key={group.periodKey} className="panel panel-soft rounded-xl p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="text-xs uppercase tracking-wide text-slate-500">
                              Период
                            </div>
                            <div className="text-base font-semibold text-white">
                              {group.periodLabel}
                            </div>
                          </div>
                          <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-xs text-emerald-300">
                            {group.totalCount} писем
                          </span>
                        </div>

                        <div className="mt-4 space-y-3">
                          {rowsToShow.map((row) => {
                            const percent =
                              group.maxCount > 0 ? (row.count / group.maxCount) * 100 : 0
                            const secondary =
                              reportGroupBy === 'orgType' ? row.type : row.secondaryLabel
                            return (
                              <button
                                key={`${group.periodKey}-${row.groupKey}`}
                                onClick={() => handleReportDrilldown(row)}
                                className="group flex w-full items-center gap-3 rounded-lg p-2 text-left transition hover:bg-white/5"
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="truncate text-sm text-white">
                                      {row.groupLabel}
                                    </span>
                                    {secondary && (
                                      <span className="truncate text-xs text-slate-500">
                                        {secondary}
                                      </span>
                                    )}
                                  </div>
                                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                                    <div
                                      className="h-full rounded-full bg-emerald-500"
                                      style={{ width: `${percent}%` }}
                                    />
                                  </div>
                                </div>
                                <div className="w-10 text-right text-sm font-semibold text-white">
                                  {row.count}
                                </div>
                                <ExternalLink className="h-4 w-4 text-slate-600 transition group-hover:text-teal-400" />
                              </button>
                            )
                          })}
                        </div>

                        {hasMore && (
                          <button
                            onClick={() => toggleReportPeriod(group.periodKey)}
                            className="mt-4 inline-flex items-center gap-2 text-sm text-emerald-400 transition hover:text-emerald-300"
                          >
                            {isExpanded
                              ? 'Скрыть'
                              : `Показать еще ${group.rows.length - orgTypePreviewLimit}`}
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {reportView === 'table' && (
                <div className="panel panel-soft overflow-hidden rounded-xl">
                  <div className="max-h-[520px] overflow-auto">
                    <table className="min-w-full text-sm">
                      <thead className="sticky top-0 bg-slate-900/80 text-xs uppercase tracking-wide text-slate-400 backdrop-blur">
                        <tr>
                          <th className="px-3 py-3 text-left">Период</th>
                          <th className="px-3 py-3 text-left">
                            {reportGroupBy === 'type' ? 'Тип' : 'Учреждение'}
                          </th>
                          <th className="px-3 py-3 text-left">
                            {reportGroupBy === 'orgType'
                              ? 'Тип письма'
                              : reportGroupBy === 'org'
                                ? 'Топ тип'
                                : 'Топ учреждение'}
                          </th>
                          <th className="px-3 py-3 text-right">Количество</th>
                          <th className="px-3 py-3"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                        {reportPeriodGroups.map((group) => (
                          <Fragment key={group.periodKey}>
                            {group.rows.map((row) => {
                              const secondary =
                                reportGroupBy === 'orgType' ? row.type : row.secondaryLabel
                              return (
                                <tr
                                  key={`${group.periodKey}-${row.groupKey}`}
                                  className="cursor-pointer transition hover:bg-white/5"
                                  onClick={() => handleReportDrilldown(row)}
                                >
                                  <td className="px-3 py-2 text-slate-400">{group.periodLabel}</td>
                                  <td className="px-3 py-2 text-white">{row.groupLabel}</td>
                                  <td className="px-3 py-2 text-gray-400">{secondary || 'Нет'}</td>
                                  <td className="px-3 py-2 text-right font-semibold text-white">
                                    {row.count}
                                  </td>
                                  <td className="px-3 py-2 text-right">
                                    <ExternalLink className="h-4 w-4 text-slate-600" />
                                  </td>
                                </tr>
                              )
                            })}
                            <tr className="bg-white/5 text-gray-200">
                              <td className="px-3 py-2 text-xs uppercase" colSpan={3}>
                                Итого за период
                              </td>
                              <td className="px-3 py-2 text-right font-semibold">
                                {group.totalCount}
                              </td>
                              <td className="px-3 py-2"></td>
                            </tr>
                          </Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {reportView === 'heatmap' && (
                <div className="panel panel-soft rounded-xl p-4">
                  {reportHeatmap.groups.length === 0 ? (
                    <p className="py-6 text-sm text-gray-500">Нет данных для отображения.</p>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <div
                          className="grid min-w-[640px] gap-2"
                          style={{
                            gridTemplateColumns: `minmax(160px, 1.2fr) repeat(${reportHeatmap.periods.length}, minmax(72px, 1fr))`,
                          }}
                        >
                          <div className="text-xs uppercase tracking-wide text-slate-500">
                            {reportGroupBy === 'type'
                              ? 'Тип'
                              : reportGroupBy === 'org'
                                ? 'Учреждение'
                                : 'Группа'}
                          </div>
                          {reportHeatmap.periods.map((period) => (
                            <div
                              key={period.key}
                              className="text-xs uppercase tracking-wide text-slate-500"
                            >
                              {period.label}
                            </div>
                          ))}

                          {reportHeatmap.groups.slice(0, reportHeatmapLimit).map((group) => (
                            <Fragment key={group.key}>
                              <div className="truncate pr-2 text-sm text-gray-200">
                                {group.label}
                              </div>
                              {reportHeatmap.periods.map((period) => {
                                const count = reportHeatmapMatrix.get(group.key)?.[period.key] || 0
                                const intensity =
                                  reportHeatmap.max > 0 ? count / reportHeatmap.max : 0
                                const background =
                                  count === 0
                                    ? 'rgba(255,255,255,0.04)'
                                    : `rgba(16,185,129,${0.2 + intensity * 0.8})`
                                return (
                                  <div
                                    key={`${group.key}-${period.key}`}
                                    title={`${group.label} — ${period.label}: ${count}`}
                                    className="flex h-8 items-center justify-center rounded-md text-xs font-medium text-white"
                                    style={{ backgroundColor: background }}
                                  >
                                    {count > 0 ? count : ''}
                                  </div>
                                )
                              })}
                            </Fragment>
                          ))}
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center justify-between text-xs text-slate-500">
                        <span>
                          Топ {Math.min(reportHeatmapLimit, reportHeatmap.groups.length)} групп по
                          объему.
                        </span>
                        <span>Интенсивность по количеству писем.</span>
                      </div>
                    </>
                  )}
                </div>
              )}
            </>
          ) : (
            <p className="py-6 text-sm text-gray-500">Нет данных за выбранный период.</p>
          )}
        </div>
        {/* Types */}
        {stats.byType.length > 0 && (
          <div className="panel panel-solid rounded-2xl p-6">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-lg font-semibold text-white">Типы писем</h3>
              <span className="text-xs text-slate-500">
                {typesToShow.length} / {stats.byType.length}
              </span>
            </div>

            <div className="space-y-3">
              {typesToShow.map((item) => (
                <div
                  key={item.type}
                  className="panel panel-soft flex items-center gap-3 rounded-xl px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm text-white">{item.type}</div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-sky-500"
                        style={{
                          width: `${maxTypeCount > 0 ? (item.count / maxTypeCount) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="w-12 text-right text-lg font-semibold text-white">
                    {item.count}
                  </div>
                </div>
              ))}
            </div>

            {stats.byType.length > typesLimit && (
              <button
                onClick={() => setShowAllTypes((prev) => !prev)}
                className="mt-4 text-sm text-emerald-400 transition hover:text-emerald-300"
              >
                {showAllTypes ? 'Свернуть' : 'Показать все'}
              </button>
            )}
          </div>
        )}
      </main>

      {/* Owner Detail Modal */}
      <OwnerDetailModal
        owner={selectedOwner}
        onClose={() => setSelectedOwner(null)}
        onNavigate={handleNavigateToOwnerLetters}
      />
    </div>
  )
}
