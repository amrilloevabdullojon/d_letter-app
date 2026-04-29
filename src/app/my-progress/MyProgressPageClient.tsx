'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Header } from '@/components/Header'
import { useAuthRedirect } from '@/hooks/useAuthRedirect'
import { useToast } from '@/components/Toast'
import Link from 'next/link'
import {
  Loader2,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  ArrowRight,
  BarChart3,
  Target,
  Flame,
  Minus,
} from 'lucide-react'
import { STATUS_LABELS, formatDate, getWorkingDaysUntilDeadline } from '@/lib/utils'
import type { LetterStatus } from '@/types/prisma'
import { OwnerSelector, OwnerOption } from '@/components/OwnerSelector'

interface ProgressStats {
  totalCompleted: number
  completedThisPeriod: number
  completedPrevPeriod: number
  periodDelta: number
  inProgress: number
  overdue: number
  avgCompletionDays: number | null
  streak: number
}

interface ByStatus {
  status: string
  count: number
}

interface CompletedLetter {
  id: string
  number: string
  organization: string
  status: LetterStatus
  completedAt: string
  deadlineDate: string
  type: string | null
}

interface DailyStats {
  date: string
  count: number
}

type Period = 'week' | 'month' | 'quarter'

const PERIOD_LABELS: Record<Period, string> = {
  week: 'Неделя',
  month: 'Месяц',
  quarter: 'Квартал',
}

const PERIOD_PREV_LABELS: Record<Period, string> = {
  week: 'прошлой неделе',
  month: 'прошлому месяцу',
  quarter: 'прошлому кварталу',
}

const PERIOD_DAYS: Record<Period, number> = {
  week: 7,
  month: 30,
  quarter: 90,
}

// Status display config
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  NOT_REVIEWED: { label: 'Не рассмотрен', color: 'text-slate-400', bg: 'bg-slate-500/20' },
  ACCEPTED: { label: 'Принят', color: 'text-blue-400', bg: 'bg-blue-500/20' },
  IN_PROGRESS: { label: 'В работе', color: 'text-teal-400', bg: 'bg-teal-500/20' },
  CLARIFICATION: { label: 'Уточнение', color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
  FROZEN: { label: 'Заморожен', color: 'text-cyan-400', bg: 'bg-cyan-500/20' },
  REJECTED: { label: 'Отклонён', color: 'text-red-400', bg: 'bg-red-500/20' },
  READY: { label: 'Готово', color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
  PROCESSED: { label: 'Обработано', color: 'text-purple-400', bg: 'bg-purple-500/20' },
  DONE: { label: 'Сделано', color: 'text-green-400', bg: 'bg-green-500/20' },
}

function DeltaBadge({ delta }: { delta: number }) {
  if (delta === 0) {
    return (
      <span className="flex items-center gap-1 rounded-full bg-slate-700/50 px-2 py-0.5 text-xs text-slate-400">
        <Minus className="h-3 w-3" />
        Без изменений
      </span>
    )
  }
  const isPositive = delta > 0
  return (
    <span
      className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
        isPositive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
      }`}
    >
      {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {isPositive ? '+' : ''}
      {delta}%
    </span>
  )
}

export function MyProgressPageClient() {
  const { data: session, status: authStatus } = useSession()
  useAuthRedirect(authStatus)
  const toast = useToast()

  const [period, setPeriod] = useState<Period>('week')
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<ProgressStats | null>(null)
  const [letters, setLetters] = useState<CompletedLetter[]>([])
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([])
  const [byStatus, setByStatus] = useState<ByStatus[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [targetUserId, setTargetUserId] = useState<string | null>(null)
  const [targetUserInfo, setTargetUserInfo] = useState<{
    name: string | null
    email: string | null
  } | null>(null)
  const [usersList, setUsersList] = useState<OwnerOption[]>([])

  // Load users if SUPERADMIN
  useEffect(() => {
    if (session?.user?.role === 'SUPERADMIN') {
      fetch('/api/users')
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setUsersList(
              data.map((u: any) => ({
                id: u.id,
                name: u.name,
                email: u.email,
              }))
            )
          }
        })
        .catch((err) => console.error('Failed to load users:', err))
    }
  }, [session])

  const loadProgress = useCallback(
    async (currentPage = 1) => {
      if (!session?.user?.id) return

      setLoading(true)
      try {
        const url = new URL(`/api/my-progress`, window.location.origin)
        url.searchParams.set('period', period)
        url.searchParams.set('page', currentPage.toString())
        url.searchParams.set('limit', '10')
        if (targetUserId) {
          url.searchParams.set('userId', targetUserId)
        }

        const res = await fetch(url.toString())
        const data = await res.json()

        if (data.error) throw new Error(data.error)

        setStats(data.stats)
        setDailyStats(data.dailyStats || [])
        setByStatus(data.byStatus || [])
        setTargetUserInfo(data.targetUser || null)

        if (currentPage === 1) {
          setLetters(data.letters || [])
        } else {
          setLetters((prev) => [...prev, ...(data.letters || [])])
        }

        setHasMore(data.hasMore || false)
        setPage(currentPage)
      } catch (error) {
        console.error('Failed to load progress:', error)
        toast.error('Не удалось загрузить статистику')
      } finally {
        setLoading(false)
      }
    },
    [session?.user?.id, period, targetUserId, toast]
  )

  useEffect(() => {
    loadProgress(1)
  }, [loadProgress])

  const maxDailyCount = Math.max(...dailyStats.map((d) => d.count), 1)
  const totalByStatus = byStatus.reduce((sum, s) => sum + s.count, 0)

  if (authStatus === 'loading') {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="app-shell min-h-screen">
      <Header />

      <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white sm:text-3xl">Мой прогресс</h1>
              {targetUserId && targetUserInfo ? (
                <p className="mt-1 text-sm text-slate-400">
                  Статистика пользователя: {targetUserInfo.name || targetUserInfo.email}
                </p>
              ) : (
                <p className="mt-1 text-sm text-slate-400">
                  Привет, {session.user.name || session.user.email}! Вот твоя статистика
                </p>
              )}
            </div>

            {/* User selector for SUPERADMIN */}
            {session.user.role === 'SUPERADMIN' && (
              <div className="w-full sm:max-w-xs">
                <OwnerSelector
                  currentOwner={
                    targetUserId ? usersList.find((u) => u.id === targetUserId) || null : null
                  }
                  users={usersList}
                  onSelect={async (id) => setTargetUserId(id)}
                  placeholder="Выбрать сотрудника"
                />
              </div>
            )}

            {/* Period selector */}
            <div className="flex items-center gap-1 rounded-xl bg-slate-800/50 p-1">
              {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                    period === p
                      ? 'bg-teal-500 text-white shadow-lg'
                      : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
                  }`}
                >
                  {PERIOD_LABELS[p]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading && !stats ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Completed this period */}
              <div className="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-teal-500/10 to-teal-600/5 p-5">
                <div className="flex items-center justify-between">
                  <div className="rounded-xl bg-teal-500/20 p-2.5">
                    <CheckCircle2 className="h-5 w-5 text-teal-400" />
                  </div>
                  {stats?.streak && stats.streak > 1 && (
                    <div className="flex items-center gap-1 rounded-full bg-orange-500/20 px-2 py-1">
                      <Flame className="h-3.5 w-3.5 text-orange-400" />
                      <span className="text-xs font-medium text-orange-400">
                        {stats.streak} дн.
                      </span>
                    </div>
                  )}
                </div>
                <div className="mt-4">
                  <div className="flex items-end gap-2">
                    <div className="text-3xl font-bold text-white">
                      {stats?.completedThisPeriod || 0}
                    </div>
                    {stats && <DeltaBadge delta={stats.periodDelta} />}
                  </div>
                  <div className="mt-1 text-sm text-slate-400">
                    За {PERIOD_LABELS[period].toLowerCase()}
                  </div>
                  {stats && stats.completedPrevPeriod > 0 && (
                    <div className="mt-1 text-xs text-slate-500">
                      vs {stats.completedPrevPeriod} по {PERIOD_PREV_LABELS[period]}
                    </div>
                  )}
                </div>
              </div>

              {/* Total completed */}
              <div className="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-blue-500/10 to-blue-600/5 p-5">
                <div className="w-fit rounded-xl bg-blue-500/20 p-2.5">
                  <Target className="h-5 w-5 text-blue-400" />
                </div>
                <div className="mt-4">
                  <div className="text-3xl font-bold text-white">{stats?.totalCompleted || 0}</div>
                  <div className="mt-1 text-sm text-slate-400">Всего отработано</div>
                </div>
              </div>

              {/* In progress */}
              <div className="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-amber-500/10 to-amber-600/5 p-5">
                <div className="w-fit rounded-xl bg-amber-500/20 p-2.5">
                  <Clock className="h-5 w-5 text-amber-400" />
                </div>
                <div className="mt-4">
                  <div className="flex items-end gap-2">
                    <div className="text-3xl font-bold text-white">{stats?.inProgress || 0}</div>
                    {stats && stats.overdue > 0 && (
                      <span className="mb-1 flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-xs text-red-400">
                        <AlertTriangle className="h-3 w-3" />
                        {stats.overdue} просроч.
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-sm text-slate-400">В работе сейчас</div>
                </div>
              </div>

              {/* Avg completion time */}
              <div className="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-purple-500/10 to-purple-600/5 p-5">
                <div className="w-fit rounded-xl bg-purple-500/20 p-2.5">
                  <TrendingUp className="h-5 w-5 text-purple-400" />
                </div>
                <div className="mt-4">
                  <div className="text-3xl font-bold text-white">
                    {stats?.avgCompletionDays?.toFixed(1) || '—'}
                  </div>
                  <div className="mt-1 text-sm text-slate-400">Среднее время (дней)</div>
                </div>
              </div>
            </div>

            {/* Chart + By Status */}
            <div className="mb-8 grid gap-6 lg:grid-cols-3">
              {/* Activity chart */}
              <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30 p-6 lg:col-span-2">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
                    <BarChart3 className="h-5 w-5 text-teal-400" />
                    Динамика по дням
                  </h2>
                  <div className="text-sm text-slate-400">Последние {PERIOD_DAYS[period]} дней</div>
                </div>

                {dailyStats.length > 0 ? (
                  <div className="flex h-40 items-end gap-1">
                    {dailyStats.map((day) => {
                      const height = (day.count / maxDailyCount) * 100
                      const date = new Date(day.date)
                      const isToday = date.toDateString() === new Date().toDateString()

                      return (
                        <div
                          key={day.date}
                          className="group relative flex flex-1 flex-col items-center"
                        >
                          <div
                            className={`w-full rounded-t transition-all ${
                              isToday
                                ? 'bg-teal-500'
                                : day.count > 0
                                  ? 'bg-teal-500/60 group-hover:bg-teal-500/80'
                                  : 'bg-slate-700/50'
                            }`}
                            style={{
                              height: `${Math.max(height, 4)}%`,
                              minHeight: '4px',
                            }}
                          />
                          {/* Tooltip */}
                          <div className="pointer-events-none absolute -top-12 left-1/2 z-10 -translate-x-1/2 scale-0 rounded-lg bg-slate-900 px-2 py-1.5 text-xs text-white shadow-lg ring-1 ring-white/10 transition-transform group-hover:scale-100">
                            <div className="font-medium">{day.count} писем</div>
                            <div className="text-slate-400">
                              {date.toLocaleDateString('ru-RU', {
                                day: 'numeric',
                                month: 'short',
                              })}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="flex h-40 items-center justify-center text-slate-500">
                    Нет данных за выбранный период
                  </div>
                )}
              </div>

              {/* By status breakdown */}
              <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30 p-6">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
                  <FileText className="h-5 w-5 text-teal-400" />
                  По статусам
                </h2>

                {byStatus.length > 0 ? (
                  <div className="space-y-2.5">
                    {byStatus
                      .sort((a, b) => b.count - a.count)
                      .map((s) => {
                        const cfg = STATUS_CONFIG[s.status] || {
                          label: s.status,
                          color: 'text-slate-400',
                          bg: 'bg-slate-500/20',
                        }
                        const pct =
                          totalByStatus > 0 ? Math.round((s.count / totalByStatus) * 100) : 0
                        return (
                          <div key={s.status}>
                            <div className="mb-1 flex items-center justify-between text-xs">
                              <span className={`font-medium ${cfg.color}`}>{cfg.label}</span>
                              <span className="text-slate-400">
                                {s.count} ({pct}%)
                              </span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-700/50">
                              <div
                                className={`h-full rounded-full transition-all ${cfg.bg.replace('/20', '/60')}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        )
                      })}
                  </div>
                ) : (
                  <div className="flex h-32 items-center justify-center text-sm text-slate-500">
                    Нет активности за период
                  </div>
                )}
              </div>
            </div>

            {/* Letters List */}
            <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30">
              <div className="border-b border-slate-700/50 p-4 sm:p-6">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
                  <CheckCircle2 className="h-5 w-5 text-teal-400" />
                  Последние отработанные письма
                </h2>
              </div>

              {letters.length > 0 ? (
                <div className="divide-y divide-slate-700/50">
                  {letters.map((letter) => {
                    const daysLeft = getWorkingDaysUntilDeadline(letter.deadlineDate)
                    const wasOnTime = daysLeft >= 0

                    return (
                      <Link
                        key={letter.id}
                        href={`/letters/${letter.id}`}
                        className="flex items-center gap-4 p-4 transition hover:bg-slate-800/50 sm:p-5"
                      >
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                            wasOnTime ? 'bg-teal-500/20' : 'bg-red-500/20'
                          }`}
                        >
                          {wasOnTime ? (
                            <CheckCircle2 className="h-5 w-5 text-teal-400" />
                          ) : (
                            <AlertTriangle className="h-5 w-5 text-red-400" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-medium text-teal-400">
                              #{letter.number}
                            </span>
                            <span className="rounded bg-slate-700/50 px-2 py-0.5 text-xs text-slate-400">
                              {STATUS_LABELS[letter.status]}
                            </span>
                            {letter.type && (
                              <span className="hidden rounded bg-slate-700/50 px-2 py-0.5 text-xs text-slate-500 sm:inline">
                                {letter.type}
                              </span>
                            )}
                          </div>
                          <div className="mt-1 truncate text-sm text-slate-300">
                            {letter.organization}
                          </div>
                        </div>

                        <div className="hidden text-right sm:block">
                          <div className="text-sm text-slate-400">
                            {formatDate(letter.completedAt)}
                          </div>
                          <div
                            className={`mt-0.5 text-xs ${
                              wasOnTime ? 'text-teal-400' : 'text-red-400'
                            }`}
                          >
                            {wasOnTime ? 'В срок ✓' : 'С опозданием'}
                          </div>
                        </div>

                        <ArrowRight className="h-4 w-4 shrink-0 text-slate-600" />
                      </Link>
                    )
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-slate-800">
                    <FileText className="h-7 w-7 text-slate-600" />
                  </div>
                  <div className="text-sm font-medium text-slate-400">Нет отработанных писем</div>
                  <div className="mt-1 text-xs text-slate-600">
                    Письма появятся здесь после завершения работы
                  </div>
                </div>
              )}

              {hasMore && (
                <div className="border-t border-slate-700/50 p-4 text-center">
                  <button
                    onClick={() => loadProgress(page + 1)}
                    disabled={loading}
                    className="inline-flex items-center gap-2 rounded-lg bg-slate-700/50 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Загрузить ещё'}
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
