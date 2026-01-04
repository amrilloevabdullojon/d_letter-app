'use client'

import { useSession } from 'next-auth/react'
import { Header } from '@/components/Header'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Loader2,
  Save,
  Sparkles,
  FileText,
  Clock,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { QuickLetterUpload } from '@/components/QuickLetterUpload'
import { OrganizationAutocomplete } from '@/components/OrganizationAutocomplete'
import { useToast } from '@/components/Toast'
import {
  ALLOWED_FILE_EXTENSIONS,
  LETTER_TYPES,
  MAX_FILE_SIZE,
  MAX_FILE_SIZE_LABEL,
} from '@/lib/constants'
import { useAuthRedirect } from '@/hooks/useAuthRedirect'
import { useForm } from '@/hooks/useForm'
import { createLetterSchema } from '@/lib/schemas'
import { z, type ZodSchema } from 'zod'

type CreateLetterFormValues = Omit<z.input<typeof createLetterSchema>, 'date' | 'deadlineDate'> & {
  date: string
  deadlineDate: string
}

export default function NewLetterPage() {
  const { data: session, status } = useSession()
  useAuthRedirect(status)
  const router = useRouter()
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [mode, setMode] = useState<'quick' | 'manual'>('quick')
  const [attachment, setAttachment] = useState<File | null>(null)
  const [draftSaved, setDraftSaved] = useState(false)
  const [draftRestored, setDraftRestored] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const DRAFT_KEY = 'letter-draft'

  const form = useForm<CreateLetterFormValues>({
    initialValues: {
      number: '',
      org: '',
      date: new Date().toISOString().split('T')[0],
      deadlineDate: '',
      type: '',
      content: '',
      comment: '',
      contacts: '',
      jiraLink: '',
      applicantName: '',
      applicantEmail: '',
      applicantPhone: '',
      applicantTelegramChatId: '',
    },
    schema: createLetterSchema as unknown as ZodSchema<CreateLetterFormValues>,
    validateOnChange: false,
    validateOnBlur: false,
    onError: () => setError('Проверьте обязательные поля.'),
    onSubmit: async (values) => {
      setLoading(true)
      setError('')

      try {
        const res = await fetch('/api/letters', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        })

        const data = await res.json()

        if (data.success) {
          if (attachment) {
            const formData = new FormData()
            formData.append('file', attachment)
            formData.append('letterId', data.letter.id)

            const uploadRes = await fetch('/api/upload', {
              method: 'POST',
              body: formData,
            })

            if (!uploadRes.ok) {
              toast.error('Письмо создано, но файл не загрузился.')
            }
          }

          // Clear draft on success
          try {
            localStorage.removeItem(DRAFT_KEY)
          } catch {
            // Ignore
          }

          router.push(`/letters/${data.letter.id}`)
        } else {
          setError(data.error || 'Ошибка при создании письма')
        }
      } catch (err) {
        setError('Ошибка соединения с сервером')
      } finally {
        setLoading(false)
      }
    },
  })
  const handleSubmit = form.handleSubmit

  // Load draft on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(DRAFT_KEY)
      if (stored) {
        const draft = JSON.parse(stored)
        if (draft.values && Date.now() - draft.savedAt < 24 * 60 * 60 * 1000) {
          // 24 hours
          Object.entries(draft.values).forEach(([key, value]) => {
            if (value && key in form.values) {
              form.setValue(key as keyof CreateLetterFormValues, value as string)
            }
          })
          setDraftRestored(true)
          setTimeout(() => setDraftRestored(false), 3000)
        }
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Save draft on form change
  useEffect(() => {
    const hasData = Object.entries(form.values).some(
      ([key, value]) => key !== 'date' && value && value.trim() !== ''
    )

    if (hasData && mode === 'manual') {
      try {
        localStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({
            values: form.values,
            savedAt: Date.now(),
          })
        )
        setDraftSaved(true)
        setTimeout(() => setDraftSaved(false), 2000)
      } catch {
        // Ignore localStorage errors
      }
    }
  }, [form.values, mode])

  // Clear draft on successful submission
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(DRAFT_KEY)
    } catch {
      // Ignore
    }
  }, [])

  const handleClearDraft = () => {
    clearDraft()
    form.reset()
    toast.success('Черновик очищен')
  }

  const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    if (file && file.size > MAX_FILE_SIZE) {
      toast.error(`Файл слишком большой. Максимум ${MAX_FILE_SIZE_LABEL}.`)
      e.target.value = ''
      return
    }
    setAttachment(file)
  }

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.currentTarget === e.target) {
      setIsDragging(false)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      const file = e.dataTransfer.files?.[0]
      if (file) {
        if (file.size > MAX_FILE_SIZE) {
          toast.error(`Файл слишком большой. Максимум ${MAX_FILE_SIZE_LABEL}.`)
          return
        }
        setAttachment(file)
      }
    },
    [toast]
  )

  const removeAttachment = useCallback(() => {
    setAttachment(null)
  }, [])

  if (status === 'loading') {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center bg-gray-900">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="app-shell min-h-screen bg-gray-900">
      <Header />

      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <Link
          href="/letters"
          className="mb-6 inline-flex items-center gap-2 text-gray-400 transition hover:text-white"
        >
          <ArrowLeft className="h-5 w-5" />
          Назад к списку
        </Link>

        <div className="mb-6 flex flex-col gap-2 sm:flex-row">
          <button
            onClick={() => setMode('quick')}
            className={`flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 transition sm:w-auto ${
              mode === 'quick'
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <Sparkles className="h-4 w-4" />
            Быстрое создание
          </button>
          <button
            onClick={() => setMode('manual')}
            className={`flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 transition sm:w-auto ${
              mode === 'manual'
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <FileText className="h-4 w-4" />
            Ручной ввод
          </button>
        </div>

        {mode === 'quick' ? (
          <QuickLetterUpload />
        ) : (
          <div className="rounded-lg border border-gray-700 bg-gray-800 p-4 sm:p-6">
            <div className="mb-6 flex items-center justify-between">
              <h1 className="text-2xl font-bold text-white">Новое письмо</h1>
              <div className="flex items-center gap-3">
                {draftRestored && (
                  <span className="animate-fadeIn inline-flex items-center gap-1.5 text-sm text-blue-400">
                    <Clock className="h-4 w-4" />
                    Черновик восстановлен
                  </span>
                )}
                {draftSaved && !draftRestored && (
                  <span className="animate-fadeIn inline-flex items-center gap-1.5 text-xs text-gray-500">
                    <Clock className="h-3 w-3" />
                    Сохранено
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleClearDraft}
                  className="inline-flex items-center gap-1.5 text-sm text-gray-400 transition hover:text-gray-300"
                  title="Очистить черновик"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Очистить</span>
                </button>
              </div>
            </div>

            {error && (
              <div className="mb-6 rounded-lg border border-red-500/50 bg-red-500/20 p-4 text-red-400">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-300">
                    Номер письма *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.values.number}
                    aria-label="Номер письма"
                    onChange={(e) => form.setValue('number', e.target.value)}
                    className="w-full rounded-lg border border-gray-600 bg-gray-700 px-4 py-2 text-white placeholder-gray-400 focus:border-emerald-500 focus:outline-none"
                    placeholder="Например: 01-15/1234"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-300">
                    Дата письма *
                  </label>
                  <input
                    type="date"
                    required
                    value={form.values.date}
                    aria-label="Дата письма"
                    onChange={(e) => form.setValue('date', e.target.value)}
                    className="w-full rounded-lg border border-gray-600 bg-gray-700 px-4 py-2 text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-300">Дедлайн</label>
                  <input
                    type="date"
                    value={form.values.deadlineDate}
                    aria-label="Дедлайн"
                    onChange={(e) => form.setValue('deadlineDate', e.target.value)}
                    className="w-full rounded-lg border border-gray-600 bg-gray-700 px-4 py-2 text-white focus:border-emerald-500 focus:outline-none"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Если не указано, будет рассчитано автоматически (+7 рабочих дней)
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-300">
                    Ссылка на Jira
                  </label>
                  <input
                    type="url"
                    value={form.values.jiraLink}
                    aria-label="Ссылка на Jira"
                    onChange={(e) => form.setValue('jiraLink', e.target.value)}
                    className="w-full rounded-lg border border-gray-600 bg-gray-700 px-4 py-2 text-white placeholder-gray-400 focus:border-emerald-500 focus:outline-none"
                    placeholder="https://jira.example.com/browse/..."
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">
                  Организация *
                </label>
                <OrganizationAutocomplete
                  value={form.values.org}
                  onChange={(value) => form.setValue('org', value)}
                  placeholder="Название организации"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">
                  Файл (опционально)
                </label>
                <div
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  className={`relative rounded-lg border-2 border-dashed p-6 text-center transition ${
                    isDragging
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : 'border-gray-600 hover:border-gray-500'
                  }`}
                >
                  <input
                    type="file"
                    aria-label="Файл"
                    accept={ALLOWED_FILE_EXTENSIONS}
                    onChange={handleAttachmentChange}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  />
                  {attachment ? (
                    <div className="flex items-center justify-center gap-3">
                      <FileText className="h-8 w-8 text-emerald-400" />
                      <div className="text-left">
                        <p className="font-medium text-white">{attachment.name}</p>
                        <p className="text-xs text-gray-400">
                          {(attachment.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={removeAttachment}
                        className="ml-2 rounded-lg p-1.5 text-gray-400 transition hover:bg-red-500/10 hover:text-red-400"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Upload
                        className={`h-8 w-8 ${isDragging ? 'text-emerald-400' : 'text-gray-500'}`}
                      />
                      <p className="text-gray-400">
                        {isDragging
                          ? 'Отпустите файл'
                          : 'Перетащите файл сюда или нажмите для выбора'}
                      </p>
                      <p className="text-xs text-gray-500">
                        PDF, DOC, DOCX, XLS, XLSX, JPG, PNG (макс. {MAX_FILE_SIZE_LABEL})
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">Тип запроса</label>
                <select
                  value={form.values.type}
                  aria-label="Тип запроса"
                  onChange={(e) => form.setValue('type', e.target.value)}
                  className="w-full rounded-lg border border-gray-600 bg-gray-700 px-4 py-2 text-white focus:border-emerald-500 focus:outline-none"
                >
                  <option value="">Выберите тип</option>
                  {LETTER_TYPES.filter((item) => item.value !== 'all').map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">Содержание</label>
                <textarea
                  rows={4}
                  value={form.values.content}
                  aria-label="Содержание"
                  onChange={(e) => form.setValue('content', e.target.value)}
                  className="w-full resize-none rounded-lg border border-gray-600 bg-gray-700 px-4 py-2 text-white placeholder-gray-400 focus:border-emerald-500 focus:outline-none"
                  placeholder="Краткое описание содержания письма"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">Контакты</label>
                <input
                  type="text"
                  value={form.values.contacts}
                  aria-label="Контакты"
                  onChange={(e) => form.setValue('contacts', e.target.value)}
                  className="w-full rounded-lg border border-gray-600 bg-gray-700 px-4 py-2 text-white placeholder-gray-400 focus:border-emerald-500 focus:outline-none"
                  placeholder="Телефон, email контактного лица"
                />
              </div>

              <div className="rounded-lg border border-gray-700 bg-gray-800/40 p-4">
                <h4 className="mb-4 text-sm font-semibold text-white">Данные заявителя</h4>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-300">Имя</label>
                    <input
                      type="text"
                      value={form.values.applicantName}
                      aria-label="Имя заявителя"
                      onChange={(e) => form.setValue('applicantName', e.target.value)}
                      className="w-full rounded-lg border border-gray-600 bg-gray-700 px-4 py-2 text-white placeholder-gray-400 focus:border-emerald-500 focus:outline-none"
                      placeholder="Имя заявителя"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-300">Email</label>
                    <input
                      type="email"
                      value={form.values.applicantEmail}
                      aria-label="Email заявителя"
                      onChange={(e) => form.setValue('applicantEmail', e.target.value)}
                      className="w-full rounded-lg border border-gray-600 bg-gray-700 px-4 py-2 text-white placeholder-gray-400 focus:border-emerald-500 focus:outline-none"
                      placeholder="email@example.com"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-300">Телефон</label>
                    <input
                      type="tel"
                      value={form.values.applicantPhone}
                      aria-label="Телефон заявителя"
                      onChange={(e) => form.setValue('applicantPhone', e.target.value)}
                      className="w-full rounded-lg border border-gray-600 bg-gray-700 px-4 py-2 text-white placeholder-gray-400 focus:border-emerald-500 focus:outline-none"
                      placeholder="+998901234567"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-300">
                      Telegram chat id
                    </label>
                    <input
                      type="text"
                      value={form.values.applicantTelegramChatId}
                      aria-label="Telegram chat id заявителя"
                      onChange={(e) => form.setValue('applicantTelegramChatId', e.target.value)}
                      className="w-full rounded-lg border border-gray-600 bg-gray-700 px-4 py-2 text-white placeholder-gray-400 focus:border-emerald-500 focus:outline-none"
                      placeholder="123456789"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">Комментарий</label>
                <textarea
                  rows={2}
                  value={form.values.comment}
                  aria-label="Комментарий"
                  onChange={(e) => form.setValue('comment', e.target.value)}
                  className="w-full resize-none rounded-lg border border-gray-600 bg-gray-700 px-4 py-2 text-white placeholder-gray-400 focus:border-emerald-500 focus:outline-none"
                  placeholder="Внутренний комментарий"
                />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <Link
                  href="/letters"
                  className="px-4 py-2 text-gray-400 transition hover:text-white"
                >
                  Отмена
                </Link>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-6 py-2 text-white transition hover:bg-emerald-600 disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Save className="h-5 w-5" />
                  )}
                  {loading ? 'Сохранение...' : 'Создать письмо'}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  )
}
