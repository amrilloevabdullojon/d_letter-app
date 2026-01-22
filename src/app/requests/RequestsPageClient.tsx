'use client'

import { useEffect, useState, useRef } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Header } from '@/components/Header'
import { useAuthRedirect } from '@/hooks/useAuthRedirect'
import { useToast } from '@/components/Toast'
import { formatDate } from '@/lib/utils'
import { PAGE_SIZE } from '@/lib/constants'
import {
  Loader2,
  RefreshCw,
  Search,
  Flag,
  Tag,
  MessageSquare,
  AlertTriangle,
  Download,
  ArrowUpDown,
} from 'lucide-react'
import { RequestListSkeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { RequestStats } from '@/components/RequestStats'
import { RequestSLABadge } from '@/components/RequestSLABadge'
import { ActiveFilters } from '@/components/ActiveFilters'

type RequestStatus = 'NEW' | 'IN_REVIEW' | 'DONE' | 'SPAM' | 'CANCELLED'
type RequestPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
type RequestCategory =
  | 'CONSULTATION'
  | 'TECHNICAL'
  | 'DOCUMENTATION'
  | 'COMPLAINT'
  | 'SUGGESTION'
  | 'OTHER'

interface RequestSummary {
  id: string
  organization: string
  contactName: string
  contactEmail: string
  contactPhone: string
  contactTelegram: string
  description: string
  status: RequestStatus
  priority: RequestPriority
  category: RequestCategory
  createdAt: string
  assignedTo: {
    id: string
    name: string | null
    email: string | null
    image: string | null
  } | null
  _count: {
    files: number
    comments: number
  }
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

type InitialFilters = {
  page: number
  limit: number
  status: RequestStatus | ''
  priority: RequestPriority | ''
  category: RequestCategory | ''
  search: string
  sortOrder: 'asc' | 'desc'
}

type RequestsInitialData = {
  requests: RequestSummary[]
  pagination: Pagination | null
  filters: InitialFilters
  initialCacheKey?: string
}

type RequestsPageClientProps = {
  initialData?: RequestsInitialData
}

const STATUS_LABELS: Record<RequestStatus, string> = {
  NEW: 'Новая',
  IN_REVIEW: 'В работе',
  DONE: 'Завершена',
  SPAM: 'Спам',
  CANCELLED: 'Отменена',
}

const STATUS_STYLES: Record<RequestStatus, string> = {
  NEW: 'bg-sky-500/20 text-sky-200 ring-1 ring-sky-400/30',
  IN_REVIEW: 'bg-amber-500/20 text-amber-200 ring-1 ring-amber-400/40',
  DONE: 'bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-400/40',
  SPAM: 'bg-rose-500/20 text-rose-200 ring-1 ring-rose-400/40',
  CANCELLED: 'bg-gray-500/20 text-gray-300 ring-1 ring-gray-400/40',
}

const PRIORITY_LABELS: Record<RequestPriority, string> = {
  LOW: 'Низкий',
  NORMAL: 'Обычный',
  HIGH: 'Высокий',
  URGENT: 'Срочный',
}

const PRIORITY_STYLES: Record<RequestPriority, string> = {
  LOW: 'bg-gray-500/20 text-gray-300',
  NORMAL: 'bg-blue-500/20 text-blue-300',
  HIGH: 'bg-orange-500/20 text-orange-300',
  URGENT: 'bg-red-500/20 text-red-300 animate-urgent-pulse',
}

const CATEGORY_LABELS: Record<RequestCategory, string> = {
  CONSULTATION: 'Консультация',
  TECHNICAL: 'Техническая поддержка',
  DOCUMENTATION: 'Документация',
  COMPLAINT: 'Жалоба',
  SUGGESTION: 'Предложение',
  OTHER: 'Другое',
}

const REQUESTS_CACHE_TTL = 15 * 1000

export default function RequestsPage({ initialData }: RequestsPageClientProps) {
  const { data: session, status } = useSession()
  useAuthRedirect(status)
  const { error: toastError } = useToast()
  const initialFilters: InitialFilters = initialData?.filters ?? {
    page: 1,
    limit: PAGE_SIZE,
    status: '',
    priority: '',
    category: '',
    search: '',
    sortOrder: 'desc',
  }

  const [requests, setRequests] = useState<RequestSummary[]>(initialData?.requests ?? [])
  const [pagination, setPagination] = useState<Pagination | null>(initialData?.pagination ?? null)
  const [loading, setLoading] = useState(!initialData)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(initialFilters.page)
  const [limit] = useState(initialFilters.limit)
  const [statusFilter, setStatusFilter] = useState<RequestStatus | ''>(initialFilters.status)
  const [priorityFilter, setPriorityFilter] = useState<RequestPriority | ''>(
    initialFilters.priority
  )
  const [categoryFilter, setCategoryFilter] = useState<RequestCategory | ''>(
    initialFilters.category
  )
  const [search, setSearch] = useState(initialFilters.search)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(initialFilters.sortOrder)
  const [refreshKey, setRefreshKey] = useState(0)
  const [exporting, setExporting] = useState(false)
  const skipInitialLoadRef = useRef(Boolean(initialData))
  const initialCacheKey = initialData?.initialCacheKey
  const requestsCacheRef = useRef<
    Map<string, { requests: RequestSummary[]; pagination: Pagination | null; storedAt: number }>
  >(new Map())

  useEffect(() => {
    if (!initialData || !initialCacheKey) return
    if (!requestsCacheRef.current.has(initialCacheKey)) {
      requestsCacheRef.current.set(initialCacheKey, {
        requests: initialData.requests,
        pagination: initialData.pagination,
        storedAt: Date.now(),
      })
    }
  }, [initialData, initialCacheKey])

  useEffect(() => {
    if (!session) return
    let active = true
    if (skipInitialLoadRef.current) {
      skipInitialLoadRef.current = false
      return () => {
        active = false
      }
    }

    const loadRequests = async () => {
      setLoading(true)
      setError(null)
      if (refreshKey > 0) {
        requestsCacheRef.current.clear()
      }
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      })
      if (statusFilter) params.set('status', statusFilter)
      if (priorityFilter) params.set('priority', priorityFilter)
      if (categoryFilter) params.set('category', categoryFilter)
      if (search.trim()) params.set('search', search.trim())

      const cacheKey = params.toString()
      const cached = requestsCacheRef.current.get(cacheKey)
      if (cached && Date.now() - cached.storedAt < REQUESTS_CACHE_TTL) {
        if (!active) return
        setRequests(cached.requests)
        setPagination(cached.pagination)
        setLoading(false)
        return
      }

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000)
      try {
        const response = await fetch(`/api/requests?${params.toString()}`, {
          signal: controller.signal,
        })
        const data = await response.json().catch(() => ({}))

        if (!response.ok) {
          const baseMessage = data.error || 'Failed to load requests'
          const details = data.details ? ` (${data.details})` : ''
          const requestId = data.requestId ? ` [${data.requestId}]` : ''
          throw new Error(`${baseMessage}${details}${requestId}`)
        }

        if (!active) return
        const nextRequests = data.requests || []
        const nextPagination = data.pagination || null
        requestsCacheRef.current.set(cacheKey, {
          requests: nextRequests,
          pagination: nextPagination,
          storedAt: Date.now(),
        })
        setRequests(nextRequests)
        setPagination(nextPagination)
      } catch (error) {
        console.error('Failed to load requests:', error)
        if (active) {
          const message =
            error instanceof DOMException && error.name === 'AbortError'
              ? 'Запрос занимает слишком много времени. Проверьте соединение или базу данных.'
              : error instanceof Error
                ? error.message
                : 'Не удалось загрузить заявки.'
          setError(message)
          toastError(message)
        }
      } finally {
        clearTimeout(timeoutId)
        if (active) setLoading(false)
      }
    }

    loadRequests()
    return () => {
      active = false
    }
  }, [
    session,
    page,
    limit,
    statusFilter,
    priorityFilter,
    categoryFilter,
    search,
    refreshKey,
    toastError,
  ])

  const handleRefresh = () => {
    setPage(1)
    setRefreshKey((prev) => prev + 1)
  }

  const handleExportCSV = async () => {
    setExporting(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      if (priorityFilter) params.set('priority', priorityFilter)
      if (categoryFilter) params.set('category', categoryFilter)
      if (search.trim()) params.set('search', search.trim())

      const response = await fetch(`/api/requests/export?${params.toString()}`)
      if (!response.ok) throw new Error('Ошибка экспорта')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `requests-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (_error) {
      toastError('Не удалось экспортировать данные')
    } finally {
      setExporting(false)
    }
  }

  const activeFilters = [
    statusFilter && {
      key: 'status',
      label: 'Статус',
      value: statusFilter,
      displayValue: STATUS_LABELS[statusFilter],
    },
    priorityFilter && {
      key: 'priority',
      label: 'Приоритет',
      value: priorityFilter,
      displayValue: PRIORITY_LABELS[priorityFilter],
    },
    categoryFilter && {
      key: 'category',
      label: 'Категория',
      value: categoryFilter,
      displayValue: CATEGORY_LABELS[categoryFilter],
    },
    search && {
      key: 'search',
      label: 'Поиск',
      value: search,
      displayValue: search.length > 30 ? search.substring(0, 30) + '...' : search,
    },
  ].filter(Boolean) as Array<{ key: string; label: string; value: string; displayValue: string }>

  const handleRemoveFilter = (key: string) => {
    if (key === 'status') setStatusFilter('')
    if (key === 'priority') setPriorityFilter('')
    if (key === 'category') setCategoryFilter('')
    if (key === 'search') setSearch('')
    setPage(1)
  }

  const handleClearAllFilters = () => {
    setStatusFilter('')
    setPriorityFilter('')
    setCategoryFilter('')
    setSearch('')
    setPage(1)
  }

  if (status === 'loading') {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center bg-gray-900">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    )
  }

  if (!session) return null

  return (
    <div className="app-shell min-h-screen bg-gray-900">
      <Header />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">{'Заявки'}</h1>
            {pagination && (
              <p className="mt-1 text-sm text-slate-400">{`Всего: ${pagination.total}`}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={exporting || loading}
              className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-white transition hover:bg-white/20 disabled:opacity-50"
              title="Экспортировать в CSV"
            >
              {exporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">Экспорт</span>
            </button>
            <button
              type="button"
              onClick={handleRefresh}
              className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-white transition hover:bg-white/20"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Обновить</span>
            </button>
          </div>
        </div>

        {/* Statistics Dashboard */}
        <RequestStats key={refreshKey} />

        {/* Active Filters */}
        <ActiveFilters
          filters={activeFilters}
          onRemove={handleRemoveFilter}
          onClearAll={handleClearAllFilters}
        />

        <div className="panel panel-soft panel-glass mb-6 space-y-3 rounded-2xl p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setPage(1)
                }}
                placeholder="Поиск по организации, контактам, описанию"
                className="w-full rounded-lg border border-gray-700 bg-gray-800 py-2 pl-9 pr-4 text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white transition hover:bg-gray-700"
              title="Изменить порядок сортировки"
            >
              <ArrowUpDown className="h-4 w-4" />
              <span className="hidden md:inline">
                {sortOrder === 'desc' ? 'Новые первые' : 'Старые первые'}
              </span>
            </button>
          </div>
          <div className="flex flex-wrap gap-3">
            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as RequestStatus | '')
                setPage(1)
              }}
              className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
            >
              <option value="">Все статусы</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <select
              value={priorityFilter}
              onChange={(event) => {
                setPriorityFilter(event.target.value as RequestPriority | '')
                setPage(1)
              }}
              className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
            >
              <option value="">Все приоритеты</option>
              {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <select
              value={categoryFilter}
              onChange={(event) => {
                setCategoryFilter(event.target.value as RequestCategory | '')
                setPage(1)
              }}
              className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
            >
              <option value="">Все категории</option>
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            {(statusFilter || priorityFilter || categoryFilter || search) && (
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('')
                  setPriorityFilter('')
                  setCategoryFilter('')
                  setSearch('')
                  setPage(1)
                }}
                className="px-3 py-2 text-sm text-slate-400 transition hover:text-white"
              >
                Сбросить фильтры
              </button>
            )}
          </div>
        </div>

        {error && !loading && (
          <div className="panel panel-glass mb-6 rounded-2xl border border-red-500/30 p-4 text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <RequestListSkeleton count={5} />
        ) : requests.length === 0 ? (
          <EmptyState
            variant={
              statusFilter || priorityFilter || categoryFilter || search ? 'search' : 'requests'
            }
            title={
              statusFilter || priorityFilter || categoryFilter || search
                ? 'Ничего не найдено'
                : undefined
            }
            description={
              statusFilter || priorityFilter || categoryFilter || search
                ? 'Попробуйте изменить параметры поиска или сбросить фильтры'
                : undefined
            }
            action={
              statusFilter || priorityFilter || categoryFilter || search ? (
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('')
                    setPriorityFilter('')
                    setCategoryFilter('')
                    setSearch('')
                    setPage(1)
                  }}
                  className="rounded-lg bg-white/10 px-4 py-2 text-sm text-white transition hover:bg-white/20"
                >
                  Сбросить фильтры
                </button>
              ) : undefined
            }
          />
        ) : (
          <div className="stagger-animation space-y-4">
            {requests.map((request) => (
              <Link
                key={request.id}
                href={`/requests/${request.id}`}
                className={`panel panel-soft panel-glass card-hover block rounded-2xl p-5 ${
                  request.priority === 'URGENT' ? 'urgent-card' : ''
                }`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2">
                    <div className="flex items-start gap-3">
                      {request.priority === 'URGENT' && (
                        <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-400" />
                      )}
                      <span className="text-lg font-semibold text-white transition group-hover:text-emerald-300">
                        {request.organization}
                      </span>
                    </div>
                    <p className="text-sm text-slate-300">
                      {request.contactName}
                      {' • '}
                      {request.contactPhone}
                      {' • '}
                      {request.contactEmail}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${PRIORITY_STYLES[request.priority]}`}
                      >
                        <Flag className="h-3 w-3" />
                        {PRIORITY_LABELS[request.priority]}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded bg-purple-500/20 px-2 py-0.5 text-xs font-medium text-purple-300">
                        <Tag className="h-3 w-3" />
                        {CATEGORY_LABELS[request.category]}
                      </span>
                      <RequestSLABadge
                        createdAt={request.createdAt}
                        status={request.status}
                        compact
                      />
                      {request.status === 'NEW' && (
                        <span className="status-dot-new h-2 w-2 rounded-full bg-sky-400" />
                      )}
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLES[request.status]}`}
                  >
                    {STATUS_LABELS[request.status]}
                  </span>
                </div>

                {request.description && (
                  <p className="mt-3 line-clamp-2 text-sm text-slate-300/90">
                    {request.description}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                  <span>{formatDate(request.createdAt)}</span>
                  <span>{`Файлов: ${request._count?.files ?? 0}`}</span>
                  {(request._count?.comments ?? 0) > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      {request._count.comments}
                    </span>
                  )}
                  <span>
                    {`Ответственный: ${
                      request.assignedTo?.name || request.assignedTo?.email || '—'
                    }`}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {pagination && pagination.totalPages > 1 && (
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-slate-400">
              {`Показаны ${Math.min((page - 1) * limit + 1, pagination.total)}-${Math.min(
                page * limit,
                pagination.total
              )} из ${pagination.total}`}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page <= 1}
                className="rounded-lg bg-white/10 px-3 py-1.5 text-white transition hover:bg-white/20 disabled:opacity-40"
              >
                {'Назад'}
              </button>
              <span className="text-sm text-slate-300">{`${page} / ${pagination.totalPages}`}</span>
              <button
                type="button"
                onClick={() => setPage((prev) => Math.min(pagination.totalPages, prev + 1))}
                disabled={page >= pagination.totalPages}
                className="rounded-lg bg-white/10 px-3 py-1.5 text-white transition hover:bg-white/20 disabled:opacity-40"
              >
                {'Далее'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
