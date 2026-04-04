'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'
import {
  Plus,
  Edit,
  Trash2,
  User,
  MessageSquare,
  ArrowRight,
  FileText,
  Clock,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

interface HistoryItem {
  id: string
  field: string
  oldValue: string | null
  newValue: string | null
  createdAt: string
  user: {
    id: string
    name: string | null
    image: string | null
  }
}

interface ActivityFeedProps {
  letterId: string
  maxItems?: number
  title?: string
  showTitle?: boolean
  compact?: boolean
}

const fieldLabels: Record<string, string> = {
  created: 'Создано',
  status: 'Статус',
  owner: 'Исполнитель',
  content: 'Содержание',
  answer: 'Ответ',
  comment: 'Комментарий',
  deadlineDate: 'Дедлайн',
  priority: 'Приоритет',
  deleted: 'Удалено',
  date: 'Дата письма',
  number: 'Номер',
  org: 'Организация',
  type: 'Тип',
  frozenAt: 'Дата заморозки',
  ijroDate: 'Дата IJRO',
  processing: 'Обработка',
  zordoc: 'ZorDoc',
  jiraLink: 'Jira',
  contacts: 'Контакты',
  sendStatus: 'Статус отправки',
  closeDate: 'Дата закрытия',
}

const statusLabels: Record<string, string> = {
  NOT_REVIEWED: 'Не рассмотрено',
  ACCEPTED: 'Принято',
  IN_PROGRESS: 'В работе',
  CLARIFICATION: 'На уточнении',
  FROZEN: 'Заморожено',
  REJECTED: 'Отклонено',
  READY: 'Готово',
  PROCESSED: 'Обработано',
  DONE: 'Завершено',
}

function getIcon(field: string) {
  switch (field) {
    case 'created':
      return Plus
    case 'status':
      return ArrowRight
    case 'owner':
      return User
    case 'comment':
      return MessageSquare
    case 'deleted':
      return Trash2
    case 'deadlineDate':
      return Clock
    default:
      return Edit
  }
}

const decodeUnicodeEscapes = (value: string) =>
  value.replace(/\\u([0-9a-fA-F]{4})/g, (_, code) => String.fromCharCode(Number.parseInt(code, 16)))

const normalizeHistoryText = (value: string) => decodeUnicodeEscapes(value).replace(/\\n/g, '\n')

// Fields where we want to show expandable diff (long text)
const TEXT_FIELDS = new Set(['content', 'answer', 'processing', 'comment', 'contacts'])

function formatValue(field: string, value: string | null): string {
  if (!value) return '—'

  if (field === 'status') {
    return statusLabels[value] || value
  }

  if (field === 'created') {
    try {
      const data = JSON.parse(value)
      const orgValue = data.org ? normalizeHistoryText(String(data.org)) : ''
      return `\u2116${data.number} \u0438 ${orgValue}`.trim()
    } catch {
      return normalizeHistoryText(value)
    }
  }

  if (field === 'deadlineDate' || field === 'date') {
    try {
      return new Date(value).toLocaleDateString('ru-RU')
    } catch {
      return normalizeHistoryText(value)
    }
  }

  const normalized = normalizeHistoryText(value)
  if (normalized.length > 100) {
    return normalized.slice(0, 100) + '...'
  }

  return normalized
}

function formatValueFull(field: string, value: string | null): string {
  if (!value) return '—'
  if (field === 'status') return statusLabels[value] || value
  if (field === 'deadlineDate' || field === 'date') {
    try {
      return new Date(value).toLocaleDateString('ru-RU')
    } catch {
      return value
    }
  }
  return normalizeHistoryText(value)
}

export function ActivityFeed({
  letterId,
  maxItems = 10,
  title = 'История изменений',
  showTitle = true,
  compact = false,
}: ActivityFeedProps) {
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)
  const [expandedDiffIds, setExpandedDiffIds] = useState<Set<string>>(new Set())

  const toggleDiff = useCallback((id: string) => {
    setExpandedDiffIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    const fetchHistory = async () => {
      try {
        const res = await fetch(`/api/letters/${letterId}/history?limit=${maxItems}`, {
          signal: controller.signal,
        })
        if (res.ok) {
          const data = await res.json()
          setHistory(data.history || [])
        }
      } catch (error) {
        if ((error as DOMException).name === 'AbortError') {
          return
        }
        console.error('Failed to fetch history:', error)
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    fetchHistory()
    return () => controller.abort()
  }, [letterId, maxItems])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
      </div>
    )
  }

  if (history.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-gray-500">
        <FileText className="mx-auto mb-2 h-8 w-8 opacity-50" />
        История изменений пока пустая
      </div>
    )
  }

  const visibleHistory = showAll ? history : history.slice(0, maxItems)

  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      {showTitle && (
        <h3 className="flex items-center gap-2 text-sm font-medium text-gray-400">
          <Clock className="h-4 w-4" />
          {title}
        </h3>
      )}

      <div className={compact ? 'space-y-2' : 'space-y-2'}>
        {visibleHistory.map((item) => {
          const Icon = getIcon(item.field)
          const label = fieldLabels[item.field] || item.field
          const isLongText =
            TEXT_FIELDS.has(item.field) &&
            ((item.oldValue?.length ?? 0) > 80 || (item.newValue?.length ?? 0) > 80)
          const isDiffExpanded = expandedDiffIds.has(item.id)

          return (
            <div
              key={item.id}
              className={`panel-soft panel-glass flex gap-3 rounded-xl ${compact ? 'p-3' : 'p-3'}`}
            >
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-700/50">
                <Icon className="h-4 w-4 text-gray-400" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {item.user.image ? (
                    <Image
                      src={item.user.image}
                      alt={item.user.name || 'User'}
                      width={20}
                      height={20}
                      className="h-5 w-5 rounded-full"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-600 text-xs text-white">
                      {item.user.name?.[0] || '?'}
                    </div>
                  )}
                  <span className="text-sm font-medium text-white">
                    {item.user.name || 'Пользователь'}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(item.createdAt), {
                      addSuffix: true,
                      locale: ru,
                    })}
                  </span>
                </div>

                <div className="mt-1 text-sm text-gray-400">
                  <span className="font-medium text-gray-300">{label}</span>
                  {item.field !== 'created' && item.oldValue && !isLongText && (
                    <>
                      {': '}
                      <span className="text-red-400/70 line-through">
                        {formatValue(item.field, item.oldValue)}
                      </span>
                      {' → '}
                    </>
                  )}
                  {item.field !== 'created' && !isLongText && (
                    <span className="text-emerald-400">
                      {formatValue(item.field, item.newValue)}
                    </span>
                  )}
                  {item.field === 'created' && (
                    <span className="text-gray-400">
                      {': '}
                      {formatValue(item.field, item.newValue)}
                    </span>
                  )}
                </div>

                {/* Expandable diff for long text fields */}
                {isLongText && (
                  <div className="mt-2">
                    <button
                      onClick={() => toggleDiff(item.id)}
                      className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-400 transition hover:bg-slate-700/50 hover:text-slate-200"
                    >
                      {isDiffExpanded ? (
                        <>
                          <ChevronUp className="h-3 w-3" />
                          Скрыть изменение
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-3 w-3" />
                          Показать изменение
                        </>
                      )}
                    </button>

                    {isDiffExpanded && (
                      <div className="mt-2 space-y-2 rounded-xl border border-slate-700/50 p-3">
                        {item.oldValue && (
                          <div>
                            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-red-400/60">
                              Было
                            </div>
                            <p className="whitespace-pre-wrap break-words text-xs text-red-300/80 line-through">
                              {formatValueFull(item.field, item.oldValue)}
                            </p>
                          </div>
                        )}
                        <div>
                          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-400/60">
                            Стало
                          </div>
                          <p className="whitespace-pre-wrap break-words text-xs text-emerald-300/80">
                            {formatValueFull(item.field, item.newValue)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {history.length > maxItems && (
        <button
          onClick={() => setShowAll((v) => !v)}
          className="w-full rounded-xl border border-slate-700/40 bg-slate-800/30 py-2 text-xs text-slate-400 transition hover:bg-slate-800/60 hover:text-slate-200"
        >
          {showAll ? 'Скрыть' : `Показать все ${history.length} изменений`}
        </button>
      )}
    </div>
  )
}
