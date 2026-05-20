'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { useToast } from '@/components/Toast'
import {
  BarChart3,
  TrendingUp,
  Users,
  Building,
  Clock,
  AlertTriangle,
  CheckCircle,
  Calendar,
  ClipboardCheck,
  Download,
  Filter,
  Loader2,
} from 'lucide-react'
import { BarChart } from '@/components/charts/BarChart'
import { LineChart } from '@/components/charts/LineChart'
import { PieChart } from '@/components/charts/PieChart'

export default function AnalyticsPage() {
  const { data: session, status } = useSession()
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)
  const [selectedPreset, setSelectedPreset] = useState<
    '1d' | '7d' | '1m' | '1y' | 'all' | 'custom'
  >('1m')
  const [activeTrendMetric, setActiveTrendMetric] = useState<'created' | 'done' | 'overdue'>(
    'created'
  )
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
  })
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)

  useEffect(() => {
    if (status === 'authenticated') {
      loadAnalytics()
    }
  }, [status, selectedPreset, dateRange])

  const loadAnalytics = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        type: 'all',
        preset: selectedPreset,
      })

      if (selectedPreset === 'custom') {
        params.append('dateFrom', dateRange.from)
        params.append('dateTo', dateRange.to)
      }

      const res = await fetch(`/api/analytics/letters?${params}`)
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      const result = await res.json()
      setData(result)
    } catch (error) {
      console.error('Failed to load analytics:', error)
      toast.error('Ошибка загрузки', 'Не удалось получить данные аналитики')
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async (format: 'json' | 'xlsx') => {
    setExportDropdownOpen(false)
    try {
      setExportLoading(true)
      const params = new URLSearchParams({
        export: 'true',
        preset: selectedPreset,
        format,
      })

      if (selectedPreset === 'custom') {
        params.append('dateFrom', dateRange.from)
        params.append('dateTo', dateRange.to)
      }

      const res = await fetch(`/api/analytics/letters?${params}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      if (format === 'xlsx') {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `analytics_${new Date().toISOString().split('T')[0]}.xlsx`
        a.click()
        URL.revokeObjectURL(url)
        toast.success('Успешный экспорт', 'Отчет Excel успешно скачан')
      } else {
        const exportData = await res.json()
        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
          type: 'application/json',
        })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `analytics_${new Date().toISOString().split('T')[0]}.json`
        a.click()
        URL.revokeObjectURL(url)
        toast.success('Успешный экспорт', 'JSON файл успешно скачан')
      }
    } catch (error) {
      console.error('Export failed:', error)
      toast.error('Ошибка экспорта', 'Не удалось выгрузить данные аналитики')
    } finally {
      setExportLoading(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }

  if (!session) {
    redirect('/auth/signin')
  }

  return (
    <div className="p-6 text-white">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="flex items-center gap-3 text-3xl font-bold">
                <BarChart3 className="h-8 w-8 animate-pulse text-blue-500" />
                Аналитика писем
              </h1>
              <p className="mt-2 text-slate-400">Статистика и метрики производительности системы</p>
            </div>

            <div className="relative">
              <button
                onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
                disabled={exportLoading}
                className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 shadow-lg backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/10 active:scale-95 disabled:pointer-events-none disabled:opacity-50"
              >
                {exportLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
                ) : (
                  <Download className="h-5 w-5 text-blue-400" />
                )}
                <span className="text-sm font-medium">Экспорт</span>
              </button>

              {exportDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setExportDropdownOpen(false)}
                  />
                  <div className="absolute right-0 z-50 mt-2 w-48 rounded-xl border border-white/10 bg-[#0c1017]/95 p-1.5 shadow-2xl backdrop-blur-lg duration-200 animate-in fade-in slide-in-from-top-2">
                    <button
                      onClick={() => handleExport('xlsx')}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm text-slate-300 transition-all hover:bg-white/5 hover:text-white"
                    >
                      <span className="flex h-6 w-6 items-center justify-center rounded bg-emerald-500/10 text-[10px] font-bold text-emerald-400">
                        XLS
                      </span>
                      <span>Excel (.xlsx)</span>
                    </button>
                    <button
                      onClick={() => handleExport('json')}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm text-slate-300 transition-all hover:bg-white/5 hover:text-white"
                    >
                      <span className="flex h-6 w-6 items-center justify-center rounded bg-blue-500/10 text-[10px] font-bold text-blue-400">
                        JSON
                      </span>
                      <span>JSON (.json)</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Presets and Filters */}
          <div className="mb-6 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex flex-wrap rounded-xl border border-white/10 bg-white/5 p-1 backdrop-blur-md">
                {[
                  { id: '1d', label: '1 день' },
                  { id: '7d', label: '7 дней' },
                  { id: '1m', label: 'Месяц' },
                  { id: '1y', label: 'Год' },
                  { id: 'all', label: 'Все время' },
                  { id: 'custom', label: 'Свой период' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedPreset(item.id as any)}
                    className={`rounded-lg px-4 py-2 text-xs font-semibold transition-all duration-300 sm:text-sm ${
                      selectedPreset === item.id
                        ? 'border-b border-blue-500/50 bg-blue-600/30 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                        : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Date Range - Animated slide-down */}
            <div
              className={`overflow-hidden transition-all duration-500 ease-in-out ${
                selectedPreset === 'custom'
                  ? 'max-h-32 opacity-100'
                  : 'pointer-events-none max-h-0 opacity-0'
              }`}
            >
              <div className="panel panel-glass flex flex-wrap items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-4 shadow-xl backdrop-blur-md">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-400" />
                  <span className="text-sm font-medium text-slate-300">Выберите период:</span>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    type="date"
                    value={dateRange.from}
                    onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                    className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white shadow-inner transition-all focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                  />
                  <span className="text-slate-500">—</span>
                  <input
                    type="date"
                    value={dateRange.to}
                    onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                    className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white shadow-inner transition-all focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                title="Всего писем"
                value={data.stats?.total || 0}
                icon={<BarChart3 className="h-6 w-6" />}
                color="blue"
              />
              <MetricCard
                title="Просроченные"
                value={data.stats?.deadlines?.overdue || 0}
                icon={<AlertTriangle className="h-6 w-6" />}
                color="red"
              />
              <MetricCard
                title="Завершено"
                value={data.stats?.byStatus?.DONE || 0}
                icon={<CheckCircle className="h-6 w-6" />}
                color="green"
              />
              <MetricCard
                title="SLA соблюдение"
                value={`${(data.performance?.slaCompliance || 0).toFixed(1)}%`}
                icon={<Clock className="h-6 w-6" />}
                color="purple"
              />
              <MetricCard
                title="Обработка заполнена"
                value={data.stats?.processingFilled ?? 0}
                icon={<ClipboardCheck className="h-6 w-6" />}
                color="indigo"
              />
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Status Distribution */}
              <ChartCard title="Распределение по статусам">
                <PieChart
                  data={[
                    {
                      label: 'Не рассмотрен',
                      value: data.stats?.byStatus?.NOT_REVIEWED || 0,
                      color: '#6B7280',
                    },
                    {
                      label: 'Принят',
                      value: data.stats?.byStatus?.ACCEPTED || 0,
                      color: '#3B82F6',
                    },
                    {
                      label: 'В работе',
                      value: data.stats?.byStatus?.IN_PROGRESS || 0,
                      color: '#F59E0B',
                    },
                    {
                      label: 'На уточнении',
                      value: data.stats?.byStatus?.CLARIFICATION || 0,
                      color: '#8B5CF6',
                    },
                    { label: 'Готово', value: data.stats?.byStatus?.READY || 0, color: '#10B981' },
                    { label: 'Сделано', value: data.stats?.byStatus?.DONE || 0, color: '#059669' },
                  ]}
                />
              </ChartCard>

              {/* Trends */}
              <ChartCard
                title={
                  selectedPreset === '1d'
                    ? 'Динамика по часам'
                    : selectedPreset === '1y' || selectedPreset === 'all'
                      ? 'Динамика по месяцам'
                      : 'Динамика по дням'
                }
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex rounded-lg border border-white/10 bg-white/5 p-0.5 shadow-sm backdrop-blur-sm">
                    {[
                      {
                        id: 'created',
                        label: 'Создано',
                        colorClass:
                          'text-blue-400 bg-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.2)] border border-blue-500/30',
                      },
                      {
                        id: 'done',
                        label: 'Выполнено',
                        colorClass:
                          'text-green-400 bg-green-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)] border border-green-500/30',
                      },
                      {
                        id: 'overdue',
                        label: 'Просрочено',
                        colorClass:
                          'text-red-400 bg-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.2)] border border-red-500/30',
                      },
                    ].map((metric) => (
                      <button
                        key={metric.id}
                        onClick={() => setActiveTrendMetric(metric.id as any)}
                        className={`rounded-md px-3 py-1 text-xs font-semibold transition-all ${
                          activeTrendMetric === metric.id
                            ? metric.colorClass
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {metric.label}
                      </button>
                    ))}
                  </div>
                </div>
                <LineChart
                  data={(data.trends || []).map((t: any) => ({
                    label: t.period,
                    value: t[activeTrendMetric] || 0,
                  }))}
                  color={
                    activeTrendMetric === 'created'
                      ? '#3B82F6'
                      : activeTrendMetric === 'done'
                        ? '#10B981'
                        : '#EF4444'
                  }
                  fillColor={
                    activeTrendMetric === 'created'
                      ? 'rgba(59, 130, 246, 0.1)'
                      : activeTrendMetric === 'done'
                        ? 'rgba(16, 185, 129, 0.1)'
                        : 'rgba(239, 68, 68, 0.1)'
                  }
                />
              </ChartCard>

              {/* Top Organizations */}
              <ChartCard title="Топ организации">
                <BarChart
                  data={(data.organizations || []).slice(0, 10).map((org: any) => ({
                    label: org.org.substring(0, 15),
                    value: org.total,
                  }))}
                  color="#10B981"
                />
              </ChartCard>

              {/* Top Users */}
              <ChartCard title="Топ ответственные">
                <BarChart
                  data={(data.users || []).slice(0, 10).map((user: any) => ({
                    label: (user.user?.name || user.user?.email || 'Без имени').substring(0, 15),
                    value: user.total,
                  }))}
                  color="#8B5CF6"
                />
              </ChartCard>
            </div>

            {/* Performance Metrics */}
            {data.performance && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <PerformanceCard
                  title="Среднее время ответа"
                  value={`${data.performance.avgResponseTime.toFixed(1)} ч`}
                  subtitle="От создания до обновления"
                />
                <PerformanceCard
                  title="Среднее время решения"
                  value={`${data.performance.avgResolutionTime.toFixed(1)} дн`}
                  subtitle="От создания до закрытия"
                />
                <PerformanceCard
                  title="SLA соблюдение"
                  value={`${data.performance.slaCompliance.toFixed(1)}%`}
                  subtitle={`${data.performance.onTime} вовремя / ${data.performance.late} просрочено`}
                />
              </div>
            )}

            {/* Activity Patterns */}
            {data.activity && (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <ChartCard title="По дням недели">
                  <BarChart
                    data={(data.activity.byDayOfWeek || []).map((d: any) => ({
                      label: d.day,
                      value: d.count,
                    }))}
                    color="#F59E0B"
                  />
                </ChartCard>

                <ChartCard title="По часам">
                  <LineChart
                    data={(data.activity.byHour || []).map((h: any) => ({
                      label: `${h.hour}:00`,
                      value: h.count,
                    }))}
                    color="#EC4899"
                  />
                </ChartCard>
              </div>
            )}
          </div>
        ) : (
          <div className="py-20 text-center text-slate-500">Нет данных</div>
        )}
      </div>
    </div>
  )
}

function MetricCard({
  title,
  value,
  icon,
  color,
}: {
  title: string
  value: string | number
  icon: React.ReactNode
  color: string
}) {
  const colorClasses = {
    blue: 'bg-blue-500/20 text-blue-400',
    red: 'bg-red-500/20 text-red-400',
    green: 'bg-green-500/20 text-green-400',
    purple: 'bg-purple-500/20 text-purple-400',
    indigo: 'bg-indigo-500/20 text-indigo-400',
  }

  return (
    <div className="panel panel-glass rounded-xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-400">{title}</h3>
        <div className={`rounded-lg p-2 ${colorClasses[color as keyof typeof colorClasses]}`}>
          {icon}
        </div>
      </div>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  )
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="panel panel-glass rounded-xl p-6">
      <h3 className="mb-4 text-lg font-semibold">{title}</h3>
      {children}
    </div>
  )
}

function PerformanceCard({
  title,
  value,
  subtitle,
}: {
  title: string
  value: string
  subtitle: string
}) {
  return (
    <div className="panel panel-glass rounded-xl p-6">
      <h3 className="mb-2 text-sm font-medium text-slate-400">{title}</h3>
      <p className="mb-1 text-2xl font-bold">{value}</p>
      <p className="text-xs text-slate-500">{subtitle}</p>
    </div>
  )
}
