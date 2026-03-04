'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  Clock,
  AlertTriangle,
  CheckCircle,
  FileText,
  TrendingUp,
  Users,
  Calendar,
  Loader2,
  ClipboardX,
  RefreshCw,
} from 'lucide-react'

interface StatsResponse {
  summary: {
    total: number
    overdue: number
    urgent: number
    done: number
    inProgress: number
    notReviewed: number
    todayDeadlines: number
    weekDeadlines: number
    needsProcessing?: number
  }
}

type StatsWidgetsProps = {
  summary?: StatsResponse['summary'] | null
  loading?: boolean
}

export function StatsWidgets({ summary, loading }: StatsWidgetsProps) {
  const [stats, setStats] = useState<StatsResponse['summary'] | null>(summary ?? null)
  const [isLoading, setIsLoading] = useState(loading ?? summary === undefined)
  const [hasError, setHasError] = useState(false)

  const fetchStats = useCallback(async () => {
    try {
      setIsLoading(true)
      setHasError(false)
      const res = await fetch('/api/stats')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: StatsResponse = await res.json()
      setStats(data.summary)
    } catch (error) {
      console.error('Failed to fetch stats:', error)
      setHasError(true)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (summary !== undefined || loading !== undefined) {
      setStats(summary ?? null)
      setIsLoading(Boolean(loading))
      return
    }

    fetchStats()
    // Refresh every 5 minutes
    const interval = setInterval(fetchStats, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [summary, loading, fetchStats])

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="flex h-24 items-center justify-center rounded-xl border border-white/10 bg-white/5"
          >
            <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
          </div>
        ))}
      </div>
    )
  }

  if (hasError) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-red-500/20 bg-red-500/5 px-5 py-4">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-red-400" />
          <p className="text-sm text-slate-300">Не удалось загрузить статистику</p>
        </div>
        <button
          onClick={fetchStats}
          className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-white/10 hover:text-white"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Повторить
        </button>
      </div>
    )
  }

  if (!stats) return null

  const widgets = [
    {
      label: 'Просрочено',
      value: stats.overdue,
      icon: AlertTriangle,
      color: 'text-red-400',
      bg: 'bg-red-500/10',
      border: 'border-red-500/30',
      link: '/letters?filter=overdue',
    },
    {
      label: 'Срочные (3 дня)',
      value: stats.urgent,
      icon: Clock,
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/30',
      link: '/letters?filter=urgent',
    },
    {
      label: 'В работе',
      value: stats.inProgress,
      icon: TrendingUp,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/30',
      link: '/letters?filter=active',
    },
    {
      label: 'Завершено',
      value: stats.done,
      icon: CheckCircle,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30',
      link: '/letters?filter=done',
    },
    {
      label: 'Без обработки',
      value: stats.needsProcessing ?? 0,
      icon: ClipboardX,
      color: 'text-orange-400',
      bg: 'bg-orange-500/10',
      border: 'border-orange-500/30',
      link: '/letters?filter=no_processing',
    },
  ]

  return (
    <div className="space-y-4">
      {/* Main stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {widgets.map((widget) => (
          <Link
            key={widget.label}
            href={widget.link}
            className={`group rounded-xl border ${widget.border} ${widget.bg} p-4 transition hover:scale-[1.02] hover:shadow-lg`}
          >
            <div className="flex items-center justify-between">
              <widget.icon className={`h-5 w-5 ${widget.color}`} />
              <span className={`text-2xl font-bold ${widget.color}`}>{widget.value}</span>
            </div>
            <p className="mt-2 text-sm text-slate-400 group-hover:text-slate-300">{widget.label}</p>
          </Link>
        ))}
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-3">
          <FileText className="h-5 w-5 text-slate-400" />
          <div>
            <p className="text-lg font-semibold text-white">{stats.total}</p>
            <p className="text-xs text-slate-500">Всего писем</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-3">
          <Calendar className="h-5 w-5 text-orange-400" />
          <div>
            <p className="text-lg font-semibold text-white">{stats.todayDeadlines}</p>
            <p className="text-xs text-slate-500">Дедлайн сегодня</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-3">
          <Users className="h-5 w-5 text-purple-400" />
          <div>
            <p className="text-lg font-semibold text-white">{stats.notReviewed}</p>
            <p className="text-xs text-slate-500">Не рассмотрено</p>
          </div>
        </div>
      </div>
    </div>
  )
}
