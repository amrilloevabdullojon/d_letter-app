'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/Header'
import { useToast } from '@/components/Toast'
import { Button } from '@/components/ui/button'
import { Loader2, Database, Send, ArrowLeft, ExternalLink, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { Textarea } from '@/components/ui/textarea'

// Мок-типы
type PendingLetter = {
  id: string
  number: string
  org: string
  processing: string | null
  createdAt: string
  applicantName: string | null
}

export default function JiraRequestsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const toast = useToast()

  const [letters, setLetters] = useState<PendingLetter[]>([])
  const [loading, setLoading] = useState(true)
  const [processingState, setProcessingState] = useState<
    Record<string, { text: string; sending: boolean; generating?: boolean }>
  >({})

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }

    if (session && session.user.role !== 'SUPERADMIN') {
      router.push('/')
      return
    }

    if (session) {
      fetchPendingLetters()
    }
  }, [session, status])

  const fetchPendingLetters = async () => {
    try {
      const res = await fetch('/api/letters/search?isPendingJira=true')
      if (res.ok) {
        const data = await res.json()
        setLetters(data.letters || [])

        // Инициализируем стейт для редактирования
        const newState: Record<string, { text: string; sending: boolean; generating?: boolean }> =
          {}
        data.letters?.forEach((l: PendingLetter) => {
          newState[l.id] = { text: l.processing || '', sending: false, generating: false }
        })
        setProcessingState(newState)
      }
    } catch (err) {
      toast.error('Ошибка загрузки заявок')
    } finally {
      setLoading(false)
    }
  }

  const handleSendToJira = async (letterId: string) => {
    setProcessingState((prev) => ({
      ...prev,
      [letterId]: { ...prev[letterId], sending: true },
    }))

    try {
      const text = processingState[letterId]?.text || ''

      const res = await fetch(`/api/letters/${letterId}/jira`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customProcessingText: text }),
      })

      if (res.ok) {
        toast.success('Задача успешно создана в Jira')
        setLetters((prev) => prev.filter((l) => l.id !== letterId))
      } else {
        const error = await res.json()
        toast.error(error.error || 'Ошибка создания задачи в Jira')
      }
    } catch (err) {
      toast.error('Ошибка соединения')
    } finally {
      setProcessingState((prev) => ({
        ...prev,
        [letterId]: { ...prev[letterId], sending: false },
      }))
    }
  }

  const handleGenerateJira = async (letterId: string) => {
    const text = processingState[letterId]?.text || ''
    if (!text.trim()) {
      toast.error('Пустой текст обработки. Нечего улучшать.')
      return
    }

    setProcessingState((prev) => ({
      ...prev,
      [letterId]: { ...prev[letterId], generating: true },
    }))

    try {
      const res = await fetch(`/api/letters/${letterId}/ai-jira-description`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ processingText: text }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        toast.success('Описание успешно сгенерировано')
        setProcessingState((prev) => ({
          ...prev,
          [letterId]: { ...prev[letterId], text: data.description },
        }))
      } else {
        toast.error(data.error || 'Ошибка при генерации')
      }
    } catch (err) {
      toast.error('Ошибка соединения')
    } finally {
      setProcessingState((prev) => ({
        ...prev,
        [letterId]: { ...prev[letterId], generating: false },
      }))
    }
  }

  const handleTextChange = (id: string, text: string) => {
    setProcessingState((prev) => ({
      ...prev,
      [id]: { ...prev[id], text },
    }))
  }

  if (status === 'loading' || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
      </div>
    )
  }

  return (
    <div className="app-shell min-h-screen bg-slate-950">
      <Header />

      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6">
          <Link
            href="/letters"
            className="group inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />К
            списку писем
          </Link>
        </div>

        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-teal-500/10 p-3 ring-1 ring-teal-500/30">
              <Database className="h-6 w-6 text-teal-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Заявки на отправку в Jira</h1>
              <p className="text-slate-400">Требуется модерация суперадмина</p>
            </div>
          </div>
        </div>

        {letters.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-12 text-center">
            <Database className="mx-auto mb-4 h-12 w-12 text-slate-600" />
            <h3 className="text-lg font-medium text-white">Нет заявок</h3>
            <p className="mt-2 text-slate-400">
              В данный момент нет писем, ожидающих отправки в Jira.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {letters.map((letter) => (
              <div
                key={letter.id}
                className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6"
              >
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-white">Письмо №{letter.number}</h3>
                    <p className="text-slate-400">{letter.org}</p>
                    {letter.applicantName && (
                      <p className="mt-1 text-sm text-slate-500">От: {letter.applicantName}</p>
                    )}
                  </div>
                  <Link
                    href={`/letters/${letter.id}`}
                    target="_blank"
                    className="flex items-center gap-2 text-sm text-teal-400 hover:text-teal-300"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Детали
                  </Link>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium text-slate-300">
                    Текст задачи для Jira (обработка)
                  </label>
                  <Textarea
                    value={processingState[letter.id]?.text || ''}
                    onChange={(e) => handleTextChange(letter.id, e.target.value)}
                    className="min-h-[120px] border-slate-700 bg-slate-900/50"
                    placeholder="Описание задачи..."
                  />
                </div>

                <div className="mt-6 flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => handleGenerateJira(letter.id)}
                    disabled={
                      processingState[letter.id]?.generating || !processingState[letter.id]?.text
                    }
                    className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10 hover:text-purple-300"
                  >
                    {processingState[letter.id]?.generating ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="mr-2 h-4 w-4" />
                    )}
                    ✨ Улучшить с AI
                  </Button>

                  <Button
                    onClick={() => handleSendToJira(letter.id)}
                    disabled={processingState[letter.id]?.sending}
                    className="bg-teal-600 hover:bg-teal-500"
                  >
                    {processingState[letter.id]?.sending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="mr-2 h-4 w-4" />
                    )}
                    Опубликовать в Jira
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
