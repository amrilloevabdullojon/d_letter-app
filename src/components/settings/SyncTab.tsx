'use client'

import { useState, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  ArrowUpFromLine,
  ArrowDownToLine,
  Search,
} from 'lucide-react'
import type { SyncLog } from '@/lib/settings-types'

interface SyncTabProps {
  onSuccess?: (message: string) => void
  onError?: (message: string) => void
}

function formatDate(date: string): string {
  return new Date(date).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getStatusBadge(status: SyncLog['status']) {
  switch (status) {
    case 'COMPLETED':
      return (
        <span className="inline-flex items-center gap-1 rounded bg-emerald-500/20 px-2 py-1 text-xs text-emerald-400">
          <CheckCircle className="h-3 w-3" />
          Успешно
        </span>
      )
    case 'FAILED':
      return (
        <span className="inline-flex items-center gap-1 rounded bg-red-500/20 px-2 py-1 text-xs text-red-400">
          <XCircle className="h-3 w-3" />
          Ошибка
        </span>
      )
    case 'IN_PROGRESS':
      return (
        <span className="inline-flex items-center gap-1 rounded bg-blue-500/20 px-2 py-1 text-xs text-blue-400">
          <Loader2 className="h-3 w-3 animate-spin" />В процессе
        </span>
      )
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded bg-slate-500/20 px-2 py-1 text-xs text-slate-400">
          <Clock className="h-3 w-3" />
          Ожидание
        </span>
      )
  }
}

export function SyncTab({ onSuccess, onError }: SyncTabProps) {
  const queryClient = useQueryClient()
  const [syncing, setSyncing] = useState(false)

  // Smart Polling query
  const { data, isLoading, refetch, isFetching } = useQuery<{ logs: SyncLog[] }>({
    queryKey: ['settings', 'sync-logs'],
    queryFn: async () => {
      const res = await fetch('/api/sync')
      if (!res.ok) throw new Error('Не удалось загрузить логи')
      return res.json()
    },
    // Poll every 2 seconds if any log is IN_PROGRESS
    refetchInterval: (query) => {
      const logs = query.state.data?.logs || []
      const hasInProgress = logs.some((l) => l.status === 'IN_PROGRESS')
      return hasInProgress ? 2000 : false
    },
  })

  const syncLogs = data?.logs || []

  const triggerSync = useCallback(
    async (direction: 'to_sheets' | 'from_sheets') => {
      setSyncing(true)
      try {
        const res = await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ direction }),
        })
        if (res.ok) {
          onSuccess?.(
            direction === 'to_sheets'
              ? 'Синхронизация в Sheets запущена'
              : 'Синхронизация из Sheets запущена'
          )
          refetch()
        } else {
          const resData = await res.json().catch(() => ({}))
          onError?.(resData.error || 'Ошибка запуска синхронизации')
        }
      } catch (error) {
        console.error('Sync trigger failed:', error)
        onError?.('Ошибка запуска синхронизации')
      } finally {
        setSyncing(false)
      }
    },
    [refetch, onSuccess, onError]
  )

  return (
    <div className="panel panel-glass mb-8 rounded-2xl p-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <RefreshCw className="h-6 w-6 text-teal-400" />
          <h2 className="text-xl font-semibold text-white">Логи синхронизации</h2>
          <span className="inline-flex items-center gap-1 rounded-full border border-teal-400/20 bg-teal-500/15 px-2 py-0.5 text-[10px] uppercase tracking-wide text-teal-300">
            Интеграции
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => triggerSync('to_sheets')}
            disabled={syncing}
            className="inline-flex items-center gap-2 rounded-lg border border-blue-400/30 bg-blue-500/10 px-3 py-2 text-sm text-blue-300 transition hover:bg-blue-500/20 disabled:opacity-50"
            title="Синхронизировать в Sheets"
          >
            {syncing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowUpFromLine className="h-4 w-4" />
            )}
            В Sheets
          </button>
          <button
            onClick={() => triggerSync('from_sheets')}
            disabled={syncing}
            className="inline-flex items-center gap-2 rounded-lg border border-purple-400/30 bg-purple-500/10 px-3 py-2 text-sm text-purple-300 transition hover:bg-purple-500/20 disabled:opacity-50"
            title="Синхронизировать из Sheets"
          >
            {syncing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowDownToLine className="h-4 w-4" />
            )}
            Из Sheets
          </button>
          <button
            onClick={() => refetch()}
            disabled={isLoading || isFetching}
            aria-label="Обновить логи"
            className="p-2 text-slate-400 transition hover:text-white disabled:opacity-50"
            title="Обновить"
          >
            <RefreshCw className={`h-5 w-5 ${isLoading || isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton h-16 rounded-xl" />
          ))}
        </div>
      ) : syncLogs.length > 0 ? (
        <div className="space-y-3">
          {/* Responsive CSS Grid Approach instead of two separate mapped lists */}
          <div className="hidden gap-4 border-b border-white/10 px-4 py-3 text-xs font-medium text-slate-400 sm:grid sm:grid-cols-6">
            <div className="col-span-2">Время</div>
            <div>Направление</div>
            <div>Статус</div>
            <div>Записей / Время</div>
            <div>Детали</div>
          </div>

          {syncLogs.map((log) => {
            const duration = log.finishedAt
              ? Math.round(
                  (new Date(log.finishedAt).getTime() - new Date(log.startedAt).getTime()) / 1000
                )
              : null

            return (
              <div
                key={log.id}
                className="panel-soft panel-glass flex flex-col gap-4 rounded-xl p-4 transition hover:bg-white/5 sm:grid sm:grid-cols-6 sm:px-4 sm:py-3"
              >
                {/* Mobile: Top Row | Desktop: Col 1-2 */}
                <div className="flex items-center justify-between sm:col-span-2 sm:block">
                  <div className="text-sm text-slate-300">{formatDate(log.startedAt)}</div>
                  <div className="sm:hidden">{getStatusBadge(log.status)}</div>
                </div>

                {/* Direction */}
                <div className="flex items-center gap-2 text-sm">
                  {log.direction === 'TO_SHEETS' ? (
                    <>
                      <ArrowUpFromLine className="h-4 w-4 text-blue-400" />
                      <span className="text-blue-400">В Sheets</span>
                    </>
                  ) : (
                    <>
                      <ArrowDownToLine className="h-4 w-4 text-purple-400" />
                      <span className="text-purple-400">Из Sheets</span>
                    </>
                  )}
                </div>

                {/* Status (Desktop only, mobile shows top row) */}
                <div className="hidden items-center sm:flex">{getStatusBadge(log.status)}</div>

                {/* Stats */}
                <div className="grid grid-cols-2 text-xs text-slate-400 sm:flex sm:flex-col sm:gap-1">
                  <div className="sm:text-[13px] sm:text-white">Записей: {log.rowsAffected}</div>
                  <div>Время: {duration !== null ? `${duration} сек` : '-'}</div>
                </div>

                {/* Error details */}
                <div className="sm:flex sm:items-center">
                  {log.error ? (
                    <span
                      className="block max-w-xs truncate text-xs text-red-400"
                      title={log.error}
                    >
                      {log.error.substring(0, 80)}
                      {log.error.length > 80 ? '...' : ''}
                    </span>
                  ) : (
                    <span className="hidden text-xs text-slate-500 sm:block">-</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 py-12 text-slate-500">
          <Search className="mb-3 h-8 w-8 opacity-20" />
          <p>Нет записей синхронизации</p>
        </div>
      )}
    </div>
  )
}
