'use client'

import { useState, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  RefreshCw,
  Upload,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  FileSpreadsheet,
  ArrowRightLeft,
} from 'lucide-react'

interface SyncResult {
  added: number
  skipped: number
  total: number
  timestamp: string
  error?: string
}

interface StatusResponse {
  lastSync: SyncResult | null
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getCsrfToken(): string {
  const match = document.cookie.match(/(?:^|;\s*)next-auth\.csrf-token=([^;]+)/)
  if (!match) return ''
  return decodeURIComponent(match[1]).split('|')[0]
}

export default function IntegrationPageClient() {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadResult, setUploadResult] = useState<{ appended: number; timestamp: string } | null>(
    null
  )
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  // Статус последней синхронизации
  const { data: statusData, isLoading: statusLoading } = useQuery<StatusResponse>({
    queryKey: ['integration', 'status'],
    queryFn: async () => {
      const res = await fetch('/api/integration/status')
      if (!res.ok) throw new Error('Не удалось загрузить статус')
      return res.json()
    },
    refetchInterval: 30000,
  })

  // Ручная синхронизация
  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/integration/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': getCsrfToken(),
        },
        body: JSON.stringify({}),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Ошибка синхронизации')
      }
      return res.json() as Promise<SyncResult>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integration', 'status'] })
    },
  })

  // Загрузка Excel
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      setUploadError(null)
      setUploadResult(null)
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/integration/upload-tokens', {
        method: 'POST',
        headers: {
          'x-csrf-token': getCsrfToken(),
        },
        body: formData,
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Ошибка загрузки')
      }
      return res.json() as Promise<{ appended: number; timestamp: string }>
    },
    onSuccess: (data) => {
      setUploadResult(data)
    },
    onError: (err) => {
      setUploadError(err instanceof Error ? err.message : String(err))
    },
  })

  const handleFileChange = useCallback(
    (file: File | null) => {
      if (!file) return
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        setUploadError('Поддерживаются только файлы .xlsx и .xls')
        return
      }
      uploadMutation.mutate(file)
    },
    [uploadMutation]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      handleFileChange(file || null)
    },
    [handleFileChange]
  )

  const lastSync = statusData?.lastSync

  return (
    <div className="min-h-screen bg-[var(--app-bg)] p-4 md:p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Заголовок */}
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Интеграция</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Автоматизация переноса данных между таблицами Google Sheets
          </p>
        </div>

        {/* Секция 1: Синхронизация T1 → T2 */}
        <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-6">
          <div className="mb-4 flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-[var(--accent)]" />
            <h2 className="font-semibold text-[var(--text-primary)]">Синхронизация заявок</h2>
          </div>
          <p className="mb-4 text-sm text-[var(--text-muted)]">
            Переносит строки со статусом{' '}
            <span className="font-medium text-[var(--text-primary)]">«Утверждена МЗ»</span> из
            таблицы «Заявки интеграция» в реестр «INT - Заявки». Дедупликация по ID заявки.
          </p>

          {/* Последняя синхронизация */}
          <div className="mb-4 rounded-lg bg-[var(--panel-2)] p-4">
            {statusLoading ? (
              <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                <Loader2 className="h-4 w-4 animate-spin" />
                Загрузка...
              </div>
            ) : lastSync ? (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm">
                  {lastSync.error ? (
                    <XCircle className="h-4 w-4 text-red-400" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-emerald-400" />
                  )}
                  <span className="text-[var(--text-muted)]">Последняя синхронизация:</span>
                  <span className="font-medium text-[var(--text-primary)]">
                    {formatDate(lastSync.timestamp)}
                  </span>
                </div>
                {!lastSync.error && (
                  <div className="text-sm text-[var(--text-muted)]">
                    Добавлено:{' '}
                    <span className="font-medium text-[var(--text-primary)]">{lastSync.added}</span>
                    {' · '}Пропущено (дубли):{' '}
                    <span className="font-medium text-[var(--text-primary)]">
                      {lastSync.skipped}
                    </span>
                    {' · '}Всего одобрено:{' '}
                    <span className="font-medium text-[var(--text-primary)]">{lastSync.total}</span>
                  </div>
                )}
                {lastSync.error && <p className="text-sm text-red-400">{lastSync.error}</p>}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                <Clock className="h-4 w-4" />
                Синхронизация ещё не запускалась
              </div>
            )}
          </div>

          {/* Результат текущей синхронизации */}
          {syncMutation.isSuccess && syncMutation.data && (
            <div className="mb-4 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3">
              <div className="flex items-center gap-2 text-sm text-emerald-400">
                <CheckCircle className="h-4 w-4" />
                <span>
                  Готово — добавлено <strong>{syncMutation.data.added}</strong>{' '}
                  {syncMutation.data.added === 1 ? 'строка' : 'строк'}
                  {syncMutation.data.skipped > 0 &&
                    `, пропущено дублей: ${syncMutation.data.skipped}`}
                </span>
              </div>
            </div>
          )}
          {syncMutation.isError && (
            <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3">
              <div className="flex items-center gap-2 text-sm text-red-400">
                <XCircle className="h-4 w-4" />
                <span>
                  {syncMutation.error instanceof Error ? syncMutation.error.message : 'Ошибка'}
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center gap-4">
            <button
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
              className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {syncMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Синхронизация...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Синхронизировать сейчас
                </>
              )}
            </button>
            <span className="text-xs text-[var(--text-muted)]">Авто-синхронизация: каждый час</span>
          </div>
        </div>

        {/* Секция 2: Загрузка токенов */}
        <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-6">
          <div className="mb-4 flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-[var(--accent)]" />
            <h2 className="font-semibold text-[var(--text-primary)]">Загрузка токенов</h2>
          </div>
          <p className="mb-4 text-sm text-[var(--text-muted)]">
            Загрузите Excel-файл от разработчика с токенами. Данные будут дописаны в таблицу{' '}
            <span className="font-medium text-[var(--text-primary)]">INT_Transfer</span>.
          </p>

          {/* Drag & drop зона */}
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`mb-4 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
              isDragging
                ? 'bg-[var(--accent)]/10 border-[var(--accent)]'
                : 'hover:border-[var(--accent)]/50 border-[var(--panel-border)] hover:bg-[var(--panel-2)]'
            }`}
          >
            <Upload className="mb-2 h-8 w-8 text-[var(--text-muted)]" />
            <p className="text-sm font-medium text-[var(--text-primary)]">
              Перетащите .xlsx файл или нажмите для выбора
            </p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">Поддерживаются .xlsx и .xls</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
            />
          </div>

          {/* Состояние загрузки */}
          {uploadMutation.isPending && (
            <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Обрабатываем файл...
            </div>
          )}
          {uploadResult && (
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3">
              <div className="flex items-center gap-2 text-sm text-emerald-400">
                <CheckCircle className="h-4 w-4" />
                <span>
                  Добавлено <strong>{uploadResult.appended}</strong>{' '}
                  {uploadResult.appended === 1 ? 'строка' : 'строк'} в INT_Transfer
                  {' · '}
                  {formatDate(uploadResult.timestamp)}
                </span>
              </div>
            </div>
          )}
          {uploadError && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3">
              <div className="flex items-center gap-2 text-sm text-red-400">
                <XCircle className="h-4 w-4" />
                <span>{uploadError}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
