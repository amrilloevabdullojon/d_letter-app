'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
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
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
  })

  useEffect(() => {
    if (status === 'authenticated') {
      loadAnalytics()
    }
  }, [status, dateRange])

  const loadAnalytics = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        type: 'all',
        dateFrom: dateRange.from,
        dateTo: dateRange.to,
      })

      const res = await fetch(`/api/analytics/letters?${params}`)
      if (res.ok) {
        const result = await res.json()
        setData(result)
      }
    } catch (error) {
      console.error('Failed to load analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        export: 'true',
        dateFrom: dateRange.from,
        dateTo: dateRange.to,
      })

      const res = await fetch(`/api/analytics/letters?${params}`)
      if (res.ok) {
        const data = await res.json()
        const blob = new Blob([JSON.stringify(data, null, 2)], {
          type: 'application/json',
        })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `analytics_${new Date().toISOString().split('T')[0]}.json`
        a.click()
      }
    } catch (error) {
      console.error('Export failed:', error)
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
    <div className="min-h-screen bg-gray-900 p-6 text-white">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h1 className="flex items-center gap-3 text-3xl font-bold">
                <BarChart3 className="h-8 w-8 text-blue-500" />
                Аналитика писем
              </h1>
              <p className="mt-2 text-gray-400">Статистика и метрики производительности системы</p>
            </div>

            <button
              onClick={handleExport}
              className="flex items-center gap-2 rounded-lg bg-gray-800 px-4 py-2 transition hover:bg-gray-700"
            >
              <Download className="h-5 w-5" />
              Экспорт
            </button>
          </div>

          {/* Date Range Filter */}
          <div className="flex items-center gap-4 rounded-lg bg-gray-800 p-4">
            <Calendar className="h-5 w-5 text-gray-400" />
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                className="rounded border border-gray-700 bg-gray-900 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
              />
              <span className="text-gray-400">—</span>
              <input
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                className="rounded border border-gray-700 bg-gray-900 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
              />
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
              <ChartCard title="Динамика по дням">
                <LineChart
                  data={(data.trends || []).map((t: any) => ({
                    label: t.period,
                    value: t.created,
                  }))}
                  color="#3B82F6"
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
          <div className="py-20 text-center text-gray-500">Нет данных</div>
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
    <div className="rounded-lg bg-gray-800 p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-400">{title}</h3>
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
    <div className="rounded-lg bg-gray-800 p-6">
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
    <div className="rounded-lg bg-gray-800 p-6">
      <h3 className="mb-2 text-sm font-medium text-gray-400">{title}</h3>
      <p className="mb-1 text-2xl font-bold">{value}</p>
      <p className="text-xs text-gray-500">{subtitle}</p>
    </div>
  )
}
