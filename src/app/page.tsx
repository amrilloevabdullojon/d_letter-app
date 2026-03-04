import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  FileText,
  Clock,
  AlertTriangle,
  Plus,
  ArrowRight,
  Star,
  Activity,
  Inbox,
  CheckCircle2,
} from 'lucide-react'
import { Header } from '@/components/Header'
import { StatsWidgets } from '@/components/StatsWidgets'
import { DashboardLetterTabs } from '@/components/DashboardLetterTabs'
import { EmptyState } from '@/components/ui/EmptyState'
import { authOptions } from '@/lib/auth'
import { getDashboardData, DashboardError } from '@/lib/dashboard'
import { formatDate } from '@/lib/utils'
import type { LetterStatus } from '@/types/prisma'

type Letter = {
  id: string
  number: string
  org: string
  date: Date | string
  deadlineDate: Date | string
  status: LetterStatus
  type: string | null
  owner: {
    name: string | null
    email: string | null
  } | null
}

type Request = {
  id: string
  organization: string
  contactName: string
  status: string
  priority: string
  createdAt: Date | string
}

export default async function HomePage() {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect('/login')
  }

  let dashboardData
  try {
    dashboardData = await getDashboardData(session)
  } catch (error) {
    if (error instanceof DashboardError) {
      redirect(error.code === 'FORBIDDEN' ? '/letters?error=forbidden' : '/login')
    }
    throw error
  }

  const statsSummary = dashboardData.summary
  const stats = {
    total: statsSummary.total,
    active: statsSummary.inProgress,
    overdue: statsSummary.overdue,
    completed: statsSummary.done,
    urgent: statsSummary.urgent,
  }

  const recentLetters = dashboardData.recentLetters as Letter[]
  const urgentLetters = dashboardData.urgentLetters as Letter[]
  const overdueLetters = dashboardData.overdueLetters as Letter[]
  const unassignedLetters = dashboardData.unassignedLetters as Letter[]
  const recentRequests = dashboardData.recentRequests as Request[]

  const roleLabel =
    session.user.role === 'SUPERADMIN'
      ? 'Суперадмин'
      : session.user.role === 'ADMIN'
        ? 'Администратор'
        : 'Сотрудник'
  const isAdmin = session.user.role === 'ADMIN' || session.user.role === 'SUPERADMIN'

  return (
    <div className="app-shell min-h-screen">
      <Header />

      <main
        id="main-content"
        className="animate-pageIn mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8"
      >
        {/* ── Welcome ────────────────────────────────────────────── */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold text-white sm:text-3xl">
              Добро пожаловать, {session.user.name || session.user.email?.split('@')[0]}!
            </h1>
            <p className="mt-1 flex items-center gap-2 text-muted">
              <span className="inline-flex items-center gap-1 rounded-full border border-teal-400/20 bg-teal-500/15 px-2 py-0.5 text-xs text-teal-300">
                {roleLabel}
              </span>
              <span className="text-slate-500">•</span>
              {new Date().toLocaleDateString('ru-RU', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Link
              href="/letters/new"
              className="btn-primary inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 transition"
            >
              <Plus className="h-5 w-5" />
              Новое письмо
            </Link>
            <Link
              href="/request"
              className="btn-secondary inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 transition hover:brightness-110"
            >
              <Inbox className="h-5 w-5" />
              Подать заявку
            </Link>
          </div>
        </div>

        {/* ── Status bar ─────────────────────────────────────────── */}
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Link
            href="/letters?filter=overdue"
            className="group flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-3.5 transition hover:border-red-500/40 hover:bg-red-500/15"
          >
            <AlertTriangle className="h-5 w-5 shrink-0 text-red-400 transition-transform group-hover:scale-110" />
            <div>
              <div className="text-xl font-bold leading-none text-white">{stats.overdue}</div>
              <div className="mt-1 text-xs text-slate-400">Просрочено</div>
            </div>
          </Link>

          <Link
            href="/letters?filter=urgent"
            className="group flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3.5 transition hover:border-amber-500/40 hover:bg-amber-500/15"
          >
            <Clock className="h-5 w-5 shrink-0 text-amber-400 transition-transform group-hover:scale-110" />
            <div>
              <div className="text-xl font-bold leading-none text-white">{stats.urgent}</div>
              <div className="mt-1 text-xs text-slate-400">Срочные</div>
            </div>
          </Link>

          <Link
            href="/letters?status=IN_PROGRESS"
            className="group flex items-center gap-3 rounded-xl border border-blue-500/20 bg-blue-500/10 p-3.5 transition hover:border-blue-500/40 hover:bg-blue-500/15"
          >
            <FileText className="h-5 w-5 shrink-0 text-blue-400 transition-transform group-hover:scale-110" />
            <div>
              <div className="text-xl font-bold leading-none text-white">{stats.active}</div>
              <div className="mt-1 text-xs text-slate-400">В работе</div>
            </div>
          </Link>

          <Link
            href="/letters?status=DONE"
            className="group flex items-center gap-3 rounded-xl border border-teal-500/20 bg-teal-500/10 p-3.5 transition hover:border-teal-500/40 hover:bg-teal-500/15"
          >
            <CheckCircle2 className="h-5 w-5 shrink-0 text-teal-400 transition-transform group-hover:scale-110" />
            <div>
              <div className="text-xl font-bold leading-none text-white">{stats.completed}</div>
              <div className="mt-1 text-xs text-slate-400">Выполнено</div>
            </div>
          </Link>
        </div>

        {/* ── Stats Widgets ──────────────────────────────────────── */}
        <div className="mb-8">
          <StatsWidgets summary={statsSummary} loading={false} />
        </div>

        {/* ── Letter tab switcher ────────────────────────────────── */}
        <div className="mb-6">
          <DashboardLetterTabs
            overdueLetters={overdueLetters}
            urgentLetters={urgentLetters}
            recentLetters={recentLetters}
            unassignedLetters={unassignedLetters}
            isAdmin={isAdmin}
          />
        </div>

        {/* ── Requests + Quick actions ───────────────────────────── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Active requests */}
          <div className="panel panel-glass rounded-2xl">
            <div className="flex items-center justify-between border-b border-white/10 p-4">
              <div className="flex items-center gap-2">
                <Inbox className="h-5 w-5 text-teal-400" />
                <h3 className="font-semibold text-white">Активные заявки</h3>
              </div>
              <Link
                href="/requests"
                className="flex items-center gap-1 text-sm text-teal-400 hover:text-teal-300"
              >
                Все <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="divide-y divide-white/5">
              {recentRequests.map((request) => (
                <Link
                  key={request.id}
                  href={`/requests/${request.id}`}
                  className="block p-4 transition hover:bg-white/5"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="line-clamp-1 font-medium text-white">{request.organization}</p>
                      <p className="mt-1 text-sm text-slate-400">{request.contactName}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          request.status === 'NEW'
                            ? 'bg-blue-500/20 text-blue-300'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}
                      >
                        {request.status === 'NEW' ? 'Новая' : 'В работе'}
                      </span>
                      <span className="text-xs text-slate-500">
                        {formatDate(request.createdAt)}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
              {recentRequests.length === 0 && (
                <EmptyState
                  variant="requests"
                  title="Нет активных заявок"
                  description="Новые обращения появятся здесь"
                  action={
                    <Link
                      href="/request"
                      className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-500"
                    >
                      Подать заявку
                    </Link>
                  }
                  className="border-0 bg-transparent shadow-none"
                />
              )}
            </div>
          </div>

          {/* Quick actions */}
          <div className="panel panel-glass rounded-2xl p-6">
            <h3 className="mb-4 flex items-center gap-2 font-semibold text-white">
              <Activity className="h-5 w-5 text-teal-400" />
              Быстрые действия
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/letters/new"
                className="panel-soft panel-glass group flex items-center gap-3 rounded-xl p-4 transition hover:bg-white/10"
              >
                <div className="rounded-lg bg-teal-500/20 p-2 transition-transform duration-200 group-hover:scale-110">
                  <Plus className="h-5 w-5 text-teal-400" />
                </div>
                <div>
                  <p className="font-medium text-white">Новое письмо</p>
                  <p className="text-xs text-slate-400">Добавить входящее</p>
                </div>
              </Link>

              <Link
                href="/request"
                className="panel-soft panel-glass group flex items-center gap-3 rounded-xl p-4 transition hover:bg-white/10"
              >
                <div className="rounded-lg bg-teal-500/20 p-2 transition-transform duration-200 group-hover:scale-110">
                  <Inbox className="h-5 w-5 text-teal-400" />
                </div>
                <div>
                  <p className="font-medium text-white">Подать заявку</p>
                  <p className="text-xs text-slate-400">Новое обращение</p>
                </div>
              </Link>

              <Link
                href="/letters?status=NOT_REVIEWED"
                className="panel-soft panel-glass group flex items-center gap-3 rounded-xl p-4 transition hover:bg-white/10"
              >
                <div className="rounded-lg bg-amber-500/20 p-2 transition-transform duration-200 group-hover:scale-110">
                  <Clock className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <p className="font-medium text-white">Не рассмотренные</p>
                  <p className="text-xs text-slate-400">Требуют внимания</p>
                </div>
              </Link>

              <Link
                href="/letters?filter=favorites"
                className="panel-soft panel-glass group flex items-center gap-3 rounded-xl p-4 transition hover:bg-white/10"
              >
                <div className="rounded-lg bg-yellow-500/20 p-2 transition-transform duration-200 group-hover:scale-110">
                  <Star className="h-5 w-5 text-yellow-400" />
                </div>
                <div>
                  <p className="font-medium text-white">Избранное</p>
                  <p className="text-xs text-slate-400">Отмеченные письма</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
