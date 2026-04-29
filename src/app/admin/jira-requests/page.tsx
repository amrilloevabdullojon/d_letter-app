'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/Header'
import { useToast } from '@/components/Toast'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Loader2,
  Send,
  ArrowLeft,
  ExternalLink,
  Sparkles,
  CheckCheck,
  XCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  CalendarDays,
  Building2,
  User,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'

type PendingLetter = {
  id: string
  number: string
  org: string
  processing: string | null
  content: string | null
  createdAt: string
  date: string
  applicantName: string | null
  owner: { name: string | null } | null
}

type CardState = {
  text: string
  sending: boolean
  generating: boolean
  rejecting: boolean
  expanded: boolean
  rejected: boolean
  approved: boolean
  rejectReason: string
  showRejectForm: boolean
  charCount: number
}

export default function JiraRequestsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const toast = useToast()

  const [letters, setLetters] = useState<PendingLetter[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [approveAll, setApproveAll] = useState(false)
  const [approvedCount, setApprovedCount] = useState(0)
  const [cardStates, setCardStates] = useState<Record<string, CardState>>({})

  const initCardStates = useCallback((data: PendingLetter[]) => {
    const newState: Record<string, CardState> = {}
    data.forEach((l) => {
      newState[l.id] = {
        text: l.processing || '',
        sending: false,
        generating: false,
        rejecting: false,
        expanded: false,
        rejected: false,
        approved: false,
        rejectReason: '',
        showRejectForm: false,
        charCount: (l.processing || '').length,
      }
    })
    setCardStates(newState)
  }, [])

  const fetchPendingLetters = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true)
      else setLoading(true)
      try {
        const res = await fetch('/api/letters/search?isPendingJira=true&limit=50')
        if (res.ok) {
          const data = await res.json()
          const fetched: PendingLetter[] = data.letters || []
          setLetters(fetched)
          initCardStates(fetched)
          setApprovedCount(0)
        }
      } catch {
        toast.error('Ошибка загрузки заявок')
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [initCardStates, toast]
  )

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }
    if (session && session.user.role !== 'SUPERADMIN') {
      router.push('/')
      return
    }
    if (session) fetchPendingLetters()
  }, [session, status, router, fetchPendingLetters])

  const patchCard = (id: string, patch: Partial<CardState>) => {
    setCardStates((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }))
  }

  const handleTextChange = (id: string, text: string) => {
    patchCard(id, { text, charCount: text.length })
  }

  const handleSendToJira = async (letterId: string) => {
    const text = cardStates[letterId]?.text || ''
    if (!text.trim()) {
      toast.error('Заполните описание задачи перед публикацией')
      return
    }
    patchCard(letterId, { sending: true })
    try {
      const res = await fetch(`/api/letters/${letterId}/jira`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customProcessingText: text }),
      })
      if (res.ok) {
        toast.success('Задача успешно создана в Jira ✓')
        patchCard(letterId, { approved: true, sending: false })
        setApprovedCount((c) => c + 1)
        setTimeout(() => setLetters((prev) => prev.filter((l) => l.id !== letterId)), 600)
      } else {
        const error = await res.json()
        toast.error(error.error || 'Ошибка создания задачи в Jira')
        patchCard(letterId, { sending: false })
      }
    } catch {
      toast.error('Ошибка соединения')
      patchCard(letterId, { sending: false })
    }
  }

  const handleReject = async (letterId: string) => {
    const reason = cardStates[letterId]?.rejectReason || ''
    patchCard(letterId, { rejecting: true })
    try {
      const res = await fetch(`/api/letters/${letterId}/pending-jira/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })
      if (res.ok) {
        toast.success('Заявка отклонена, пользователь уведомлён')
        patchCard(letterId, { rejected: true, rejecting: false })
        setTimeout(() => setLetters((prev) => prev.filter((l) => l.id !== letterId)), 600)
      } else {
        toast.error('Ошибка при отклонении')
        patchCard(letterId, { rejecting: false })
      }
    } catch {
      toast.error('Ошибка соединения')
      patchCard(letterId, { rejecting: false })
    }
  }

  const handleGenerateJira = async (letterId: string) => {
    const text = cardStates[letterId]?.text || ''
    if (!text.trim()) {
      toast.error('Введите текст для улучшения с AI')
      return
    }
    patchCard(letterId, { generating: true })
    try {
      const res = await fetch(`/api/letters/${letterId}/ai-jira-description`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ processingText: text }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        toast.success('Описание улучшено с помощью AI ✨')
        patchCard(letterId, {
          text: data.description,
          charCount: data.description.length,
          generating: false,
        })
      } else {
        toast.error(data.error || 'Ошибка при генерации')
        patchCard(letterId, { generating: false })
      }
    } catch {
      toast.error('Ошибка соединения')
      patchCard(letterId, { generating: false })
    }
  }

  const handleApproveAll = async () => {
    const pending = letters.filter(
      (l) => !cardStates[l.id]?.approved && !cardStates[l.id]?.rejected
    )
    const noText = pending.filter((l) => !cardStates[l.id]?.text?.trim())
    if (noText.length > 0) {
      toast.error(
        `${noText.length} ${noText.length === 1 ? 'письмо не имеет' : 'письма не имеют'} описания. Заполните все поля.`
      )
      return
    }

    setApproveAll(true)
    for (const letter of pending) {
      await handleSendToJira(letter.id)
      await new Promise((r) => setTimeout(r, 300))
    }
    setApproveAll(false)
  }

  const pendingCount = letters.filter(
    (l) => !cardStates[l.id]?.approved && !cardStates[l.id]?.rejected
  ).length
  const totalCount = letters.length

  if (status === 'loading' || loading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
        <p className="text-sm text-slate-400">Загрузка заявок...</p>
      </div>
    )
  }

  return (
    <div className="app-shell min-h-screen bg-slate-950">
      <Header />

      <main className="mx-auto max-w-5xl px-4 py-8">
        {/* Назад */}
        <div className="mb-6">
          <Link
            href="/letters"
            className="group inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />К
            списку писем
          </Link>
        </div>

        {/* Шапка */}
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-teal-500/10 p-3 ring-1 ring-teal-500/30">
              <Send className="h-6 w-6 text-teal-400" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-white">Заявки на отправку в Jira</h1>
                {pendingCount > 0 && (
                  <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-sm font-semibold text-amber-400 ring-1 ring-amber-500/30">
                    {pendingCount}
                  </span>
                )}
              </div>
              <p className="text-slate-400">
                Требуется модерация суперадмина
                {approvedCount > 0 && (
                  <span className="ml-2 text-teal-400">· Одобрено {approvedCount}</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchPendingLetters(true)}
              disabled={refreshing}
              className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Обновить
            </Button>

            {pendingCount > 1 && (
              <Button
                size="sm"
                onClick={handleApproveAll}
                disabled={approveAll}
                className="bg-teal-600 hover:bg-teal-500"
              >
                {approveAll ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCheck className="mr-2 h-4 w-4" />
                )}
                Одобрить все ({pendingCount})
              </Button>
            )}
          </div>
        </div>

        {/* Прогресс-бар (если были одобрения) */}
        {approvedCount > 0 && totalCount > 0 && (
          <div className="mb-6 rounded-xl border border-teal-500/20 bg-teal-500/5 p-4">
            <div className="mb-2 flex justify-between text-sm">
              <span className="text-teal-300">Прогресс обработки</span>
              <span className="font-semibold text-teal-400">
                {approvedCount} из {totalCount}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-700">
              <motion.div
                className="h-2 rounded-full bg-gradient-to-r from-teal-500 to-emerald-400"
                initial={{ width: 0 }}
                animate={{ width: `${(approvedCount / totalCount) * 100}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
          </div>
        )}

        {/* Пустое состояние */}
        {letters.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-slate-800 bg-slate-900/50 p-16 text-center"
          >
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 ring-1 ring-emerald-500/30">
              <CheckCircle2 className="h-8 w-8 text-emerald-400" />
            </div>
            <h3 className="text-lg font-semibold text-white">Очередь пуста</h3>
            <p className="mt-2 text-slate-400">
              {approvedCount > 0
                ? `Отлично! Все ${approvedCount} заявок обработаны.`
                : 'В данный момент нет писем, ожидающих отправки в Jira.'}
            </p>
          </motion.div>
        )}

        {/* Карточки */}
        <div className="space-y-5">
          <AnimatePresence mode="popLayout">
            {letters.map((letter) => {
              const state = cardStates[letter.id]
              if (!state) return null
              const isEmpty = !state.text.trim()

              return (
                <motion.div
                  key={letter.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{
                    opacity: state.approved || state.rejected ? 0.5 : 1,
                    y: 0,
                    scale: state.approved || state.rejected ? 0.98 : 1,
                  }}
                  exit={{ opacity: 0, scale: 0.95, y: -8 }}
                  transition={{ duration: 0.35, ease: 'easeInOut' }}
                  className={`rounded-2xl border bg-slate-800/50 p-6 transition-colors ${
                    state.approved
                      ? 'border-emerald-500/40 bg-emerald-500/5'
                      : state.rejected
                        ? 'border-red-500/40 bg-red-500/5'
                        : 'border-slate-700 hover:border-slate-600'
                  }`}
                >
                  {/* Заголовок карточки */}
                  <div className="mb-5 flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-bold text-white">Письмо №{letter.number}</h3>
                        {state.approved && (
                          <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-400">
                            <CheckCircle2 className="h-3 w-3" /> Опубликовано
                          </span>
                        )}
                        {state.rejected && (
                          <span className="flex items-center gap-1 rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-400">
                            <XCircle className="h-3 w-3" /> Отклонено
                          </span>
                        )}
                        {isEmpty && !state.approved && !state.rejected && (
                          <span className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-400">
                            <AlertCircle className="h-3 w-3" /> Нужно описание
                          </span>
                        )}
                      </div>

                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                        <span className="flex items-center gap-1.5 text-sm text-slate-400">
                          <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
                          {letter.org}
                        </span>
                        {letter.owner?.name && (
                          <span className="flex items-center gap-1.5 text-sm text-slate-500">
                            <User className="h-3.5 w-3.5 flex-shrink-0" />
                            {letter.owner.name}
                          </span>
                        )}
                        <span className="flex items-center gap-1.5 text-sm text-slate-500">
                          <CalendarDays className="h-3.5 w-3.5 flex-shrink-0" />
                          {new Date(letter.date || letter.createdAt).toLocaleDateString('ru-RU', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>

                    <Link
                      href={`/letters/${letter.id}`}
                      target="_blank"
                      className="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-teal-400 transition-colors hover:bg-teal-500/10 hover:text-teal-300"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Детали
                    </Link>
                  </div>

                  {/* Превью содержимого письма */}
                  {letter.content && (
                    <div className="mb-5">
                      <button
                        onClick={() => patchCard(letter.id, { expanded: !state.expanded })}
                        className="flex w-full items-center justify-between rounded-lg border border-slate-700/60 bg-slate-900/40 px-4 py-2.5 text-left text-sm text-slate-400 transition-colors hover:border-slate-600 hover:text-slate-300"
                      >
                        <span className="font-medium">Содержание письма</span>
                        {state.expanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>

                      <AnimatePresence>
                        {state.expanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-2 rounded-lg border border-slate-700/40 bg-slate-900/60 px-4 py-3 text-sm leading-relaxed text-slate-300">
                              {letter.content.length > 500
                                ? letter.content.substring(0, 500) + '...'
                                : letter.content}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* Textarea с описанием */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-slate-300">
                        Текст задачи для Jira
                      </label>
                      <span
                        className={`text-xs tabular-nums ${
                          state.charCount > 2000
                            ? 'text-red-400'
                            : state.charCount > 1000
                              ? 'text-amber-400'
                              : 'text-slate-500'
                        }`}
                      >
                        {state.charCount} символов
                      </span>
                    </div>
                    <div className="relative">
                      <Textarea
                        value={state.text}
                        onChange={(e) => handleTextChange(letter.id, e.target.value)}
                        disabled={state.approved || state.rejected}
                        className={`min-h-[130px] border-slate-700 bg-slate-900/50 transition-colors focus:border-teal-500/60 ${
                          isEmpty && !state.approved && !state.rejected
                            ? 'border-amber-500/40 focus:border-amber-500/60'
                            : ''
                        }`}
                        placeholder="Опишите задачу для Jira: что нужно сделать, какое письмо, от кого..."
                      />
                      {isEmpty && !state.approved && !state.rejected && (
                        <div className="absolute right-3 top-3 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-400">
                          Обязательно
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Форма отклонения */}
                  <AnimatePresence>
                    {state.showRejectForm && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-4 rounded-xl border border-red-500/25 bg-red-500/5 p-4">
                          <p className="mb-2 text-sm font-medium text-red-400">
                            Причина отклонения (будет отправлена пользователю)
                          </p>
                          <Textarea
                            value={state.rejectReason}
                            onChange={(e) => patchCard(letter.id, { rejectReason: e.target.value })}
                            className="min-h-[80px] border-red-500/30 bg-slate-900/50 text-sm focus:border-red-500/50"
                            placeholder="Например: недостаточно информации, неверное описание задачи..."
                          />
                          <div className="mt-3 flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleReject(letter.id)}
                              disabled={state.rejecting}
                              className="bg-red-600 hover:bg-red-500"
                            >
                              {state.rejecting ? (
                                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <XCircle className="mr-2 h-3.5 w-3.5" />
                              )}
                              Подтвердить отклонение
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => patchCard(letter.id, { showRejectForm: false })}
                              className="text-slate-400 hover:text-white"
                            >
                              Отмена
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Кнопки действий */}
                  {!state.approved && !state.rejected && (
                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleGenerateJira(letter.id)}
                          disabled={state.generating || isEmpty}
                          className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10 hover:text-purple-300 disabled:opacity-40"
                        >
                          {state.generating ? (
                            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Sparkles className="mr-2 h-3.5 w-3.5" />
                          )}
                          Улучшить с AI
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            patchCard(letter.id, {
                              showRejectForm: !state.showRejectForm,
                            })
                          }
                          className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                        >
                          <XCircle className="mr-2 h-3.5 w-3.5" />
                          Отклонить
                        </Button>
                      </div>

                      <Button
                        onClick={() => handleSendToJira(letter.id)}
                        disabled={state.sending || isEmpty}
                        className="bg-teal-600 hover:bg-teal-500 disabled:opacity-50"
                        title={isEmpty ? 'Заполните описание задачи' : undefined}
                      >
                        {state.sending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="mr-2 h-4 w-4" />
                        )}
                        Опубликовать в Jira
                      </Button>
                    </div>
                  )}
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}
