'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Upload,
  FileText,
  Calendar,
  Building2,
  Hash,
  Clock,
  Check,
  X,
  Loader2,
  AlertTriangle,
  Sparkles,
  Scan,
  MapPin,
  FileCode,
  Bot,
} from 'lucide-react'
import { useToast } from '@/components/Toast'
import {
  parseLetterFilename,
  guessOrganization,
  calculateDeadline,
  formatDateForInput,
} from '@/lib/parseLetterFilename'
import { DEFAULT_DEADLINE_WORKING_DAYS, LETTER_TYPES } from '@/lib/constants'
import { recommendLetterType } from '@/lib/recommendLetterType'
import { quickLetterUploadSchema, type QuickLetterUploadInput } from '@/lib/schemas'

interface ParsedPdfData {
  number: string | null
  date: string | null
  deadline: string | null
  organization: string | null
  content: string | null
  contentRussian: string | null
  region: string | null
  district: string | null
}

interface ParseMeta {
  extractedFrom?: {
    ai?: boolean
    pdf?: boolean
    filename?: boolean
  }
}

interface QuickLetterUploadProps {
  onClose?: () => void
}

export function QuickLetterUpload({ onClose }: QuickLetterUploadProps) {
  const router = useRouter()
  const toast = useToast()
  const [dragOver, setDragOver] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [creating, setCreating] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [parseSource, setParseSource] = useState<'ai' | 'pdf' | 'filename' | null>(null)

  // Дополнительные поля (не в схеме)
  const [contentRussian, setContentRussian] = useState('')
  const [region, setRegion] = useState('')

  // React Hook Form
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset: resetForm,
    formState: { errors, isValid },
  } = useForm<QuickLetterUploadInput>({
    resolver: zodResolver(quickLetterUploadSchema),
    mode: 'onChange',
    defaultValues: {
      number: '',
      org: '',
      date: '',
      deadlineDate: '',
      type: '',
      content: '',
      applicantName: '',
      applicantEmail: '',
      applicantPhone: '',
      applicantTelegramChatId: '',
    },
  })

  const watchDate = watch('date')

  /**
   * Парсит PDF через API
   */
  const parsePdfContent = useCallback(
    async (f: File): Promise<{ data: ParsedPdfData; meta: ParseMeta } | null> => {
      try {
        const formData = new FormData()
        formData.append('file', f)

        const res = await fetch('/api/parse-pdf', {
          method: 'POST',
          body: formData,
        })

        if (!res.ok) {
          const err = await res.json()
          console.error('PDF parse error:', err)
          return null
        }

        const result = await res.json()
        return { data: result.data, meta: result.meta }
      } catch (error) {
        console.error('Failed to parse PDF:', error)
        return null
      }
    },
    []
  )

  const handleFile = useCallback(
    async (f: File) => {
      setFile(f)
      setParsing(true)
      setParseSource(null)

      const isPdf = f.name.toLowerCase().endsWith('.pdf')

      // Сначала пробуем распарсить содержимое PDF
      if (isPdf) {
        toast.loading('Анализ PDF с помощью AI...', { id: 'parsing' })

        const result = await parsePdfContent(f)

        if (result?.data) {
          const { data, meta } = result

          // Определяем источник данных
          if (meta.extractedFrom?.ai) {
            setParseSource('ai')
          } else if (meta.extractedFrom?.pdf) {
            setParseSource('pdf')
          } else if (meta.extractedFrom?.filename) {
            setParseSource('filename')
          }

          if (data.number) setValue('number', data.number)
          if (data.organization) setValue('org', data.organization)
          if (data.date) {
            const dateObj = new Date(data.date)
            setValue('date', formatDateForInput(dateObj))
          }
          if (data.deadline) {
            const deadlineObj = new Date(data.deadline)
            setValue('deadlineDate', formatDateForInput(deadlineObj))
          } else if (data.date) {
            const dateObj = new Date(data.date)
            // +7 рабочих дней
            setValue(
              'deadlineDate',
              formatDateForInput(calculateDeadline(dateObj, DEFAULT_DEADLINE_WORKING_DAYS))
            )
          }
          if (data.content) setValue('content', data.content)
          if (data.contentRussian) setContentRussian(data.contentRussian)
          if (data.region || data.district) {
            setRegion([data.region, data.district].filter(Boolean).join(', '))
          }
          const recommendedType = recommendLetterType({
            content: data.content,
            contentRussian: data.contentRussian,
            organization: data.organization,
            filename: f.name,
          })
          if (recommendedType) {
            setValue('type', recommendedType)
          }

          const sourceText = meta.extractedFrom?.ai
            ? 'AI'
            : meta.extractedFrom?.pdf
              ? 'PDF'
              : 'имени файла'
          toast.success(`Данные извлечены из ${sourceText}`, { id: 'parsing' })
          setParsing(false)
          return
        }
      }

      // Fallback: парсим имя файла
      const result = parseLetterFilename(f.name)

      if (result.isValid) {
        setParseSource('filename')
        setValue('number', result.number)
        setValue('date', formatDateForInput(result.date))
        // +7 рабочих дней
        setValue(
          'deadlineDate',
          formatDateForInput(calculateDeadline(result.date, DEFAULT_DEADLINE_WORKING_DAYS))
        )
        setValue('content', result.content)
        const guessedOrg = guessOrganization(result.content)
        setValue('org', guessedOrg)
        const recommendedType = recommendLetterType({
          content: result.content,
          organization: guessedOrg,
          filename: f.name,
        })
        if (recommendedType) {
          setValue('type', recommendedType)
        }
        toast.success('Данные распознаны из имени файла', { id: 'parsing' })
      } else {
        toast.error('Не удалось распознать данные. Заполните вручную.', { id: 'parsing' })
      }

      setParsing(false)
    },
    [parsePdfContent, toast, setValue]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const f = e.dataTransfer.files?.[0]
      if (f) handleFile(f)
    },
    [handleFile]
  )

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => setDragOver(false)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) handleFile(f)
  }

  const onSubmit = async (data: QuickLetterUploadInput) => {
    setCreating(true)
    const toastId = toast.loading('Создание письма...')

    try {
      // 1. Создаём письмо
      const letterRes = await fetch('/api/letters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          number: data.number,
          org: data.org,
          date: data.date,
          deadlineDate: data.deadlineDate || undefined,
          type: data.type || undefined,
          content: data.content || undefined,
          applicantName: data.applicantName || undefined,
          applicantEmail: data.applicantEmail || undefined,
          applicantPhone: data.applicantPhone || undefined,
          applicantTelegramChatId: data.applicantTelegramChatId || undefined,
        }),
      })

      const letterData = await letterRes.json()

      if (!letterRes.ok) {
        throw new Error(letterData.error || 'Ошибка создания письма')
      }

      const createdLetter = letterData.letter || letterData
      const letterId = createdLetter?.id
      if (!letterId) {
        throw new Error('Missing letter id from server')
      }

      // 2. Загружаем файл, если есть
      if (file) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('letterId', letterId)

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        if (uploadRes.status === 413) {
          toast.error('Файл слишком большой (413)')
        } else if (!uploadRes.ok) {
          const uploadError = await uploadRes.json().catch(() => null)
          const uploadMessage = uploadError?.error || 'Failed to upload file'
          console.error(uploadMessage)
          toast.error(uploadMessage)
        }
      }

      toast.success('Письмо создано!', { id: toastId })
      router.push(`/letters/${letterId}`)
    } catch (error) {
      console.error('Create error:', error)
      toast.error(error instanceof Error ? error.message : 'Ошибка создания', { id: toastId })
    } finally {
      setCreating(false)
    }
  }

  const reset = () => {
    setFile(null)
    setParseSource(null)
    setContentRussian('')
    setRegion('')
    resetForm()
  }

  // Auto-calculate deadline when date changes
  const handleDateChange = (newDate: string) => {
    setValue('date', newDate)
    if (newDate) {
      const dateObj = new Date(newDate)
      setValue(
        'deadlineDate',
        formatDateForInput(calculateDeadline(dateObj, DEFAULT_DEADLINE_WORKING_DAYS))
      )
    }
  }

  return (
    <div className="rounded-xl border border-gray-700 bg-gray-800 p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-yellow-400" />
          <h3 className="text-lg font-semibold text-white">Быстрое создание письма</h3>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-gray-400 hover:text-white" aria-label="Закрыть">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <p className="mb-4 text-sm text-gray-400">
        Перетащите PDF файл письма. Gemini AI автоматически извлечёт данные и переведёт на русский.
      </p>

      {!file ? (
        // Drop zone
        <div
          className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition ${
            dragOver
              ? 'border-emerald-500 bg-emerald-500/10'
              : 'border-gray-600 hover:border-gray-500'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => document.getElementById('quick-upload-input')?.click()}
        >
          <input
            id="quick-upload-input"
            aria-label="Выбрать файл"
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx"
            onChange={handleFileSelect}
          />
          <Upload className="mx-auto mb-3 h-10 w-10 text-gray-500" />
          <p className="text-gray-300">
            Перетащите файл сюда или <span className="text-emerald-400">выберите</span>
          </p>
          <p className="mt-2 text-xs text-gray-500">PDF, DOC, DOCX</p>
        </div>
      ) : (
        // Form
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* File info */}
          <div className="flex items-center gap-3 rounded-lg bg-gray-700/50 p-3">
            <FileText className="h-8 w-8 text-emerald-400" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-white">{file.name}</p>
              <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
            {parsing ? (
              <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
            ) : parseSource === 'ai' ? (
              <div className="flex items-center gap-1 text-purple-400">
                <Bot className="h-4 w-4" />
                <span className="text-xs">AI</span>
              </div>
            ) : parseSource === 'pdf' ? (
              <div className="flex items-center gap-1 text-emerald-400">
                <Scan className="h-4 w-4" />
                <span className="text-xs">PDF</span>
              </div>
            ) : parseSource === 'filename' ? (
              <div className="flex items-center gap-1 text-yellow-400">
                <FileCode className="h-4 w-4" />
                <span className="text-xs">имя</span>
              </div>
            ) : (
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
            )}
            <button
              type="button"
              onClick={reset}
              className="p-1 text-gray-400 hover:text-red-400"
              aria-label="Сбросить файл"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* AI info */}
          {parseSource === 'ai' && (
            <div className="flex items-center gap-2 rounded-lg border border-purple-500/30 bg-purple-500/20 p-3 text-sm text-purple-400">
              <Bot className="h-4 w-4" />
              Данные извлечены и переведены с помощью AI
            </div>
          )}

          {/* Form fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 flex items-center gap-2 text-sm text-gray-400">
                <Hash className="h-4 w-4" />
                Номер письма *
              </label>
              <input
                type="text"
                {...register('number')}
                className={`w-full rounded-lg border ${errors.number ? 'border-red-500' : 'border-gray-600'} bg-gray-700 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none`}
                placeholder="7941"
              />
              {errors.number && (
                <p className="mt-1 text-xs text-red-400">{errors.number.message}</p>
              )}
            </div>

            <div>
              <label className="mb-1 flex items-center gap-2 text-sm text-gray-400">
                <Building2 className="h-4 w-4" />
                Организация *
              </label>
              <input
                type="text"
                {...register('org')}
                className={`w-full rounded-lg border ${errors.org ? 'border-red-500' : 'border-gray-600'} bg-gray-700 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none`}
                placeholder="3-son oilaviy poliklinika"
              />
              {errors.org && <p className="mt-1 text-xs text-red-400">{errors.org.message}</p>}
            </div>

            <div>
              <label className="mb-1 flex items-center gap-2 text-sm text-gray-400">
                <Calendar className="h-4 w-4" />
                Дата письма *
              </label>
              <input
                type="date"
                {...register('date')}
                onChange={(e) => handleDateChange(e.target.value)}
                className={`w-full rounded-lg border ${errors.date ? 'border-red-500' : 'border-gray-600'} bg-gray-700 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none`}
              />
              {errors.date && <p className="mt-1 text-xs text-red-400">{errors.date.message}</p>}
            </div>

            <div>
              <label className="mb-1 flex items-center gap-2 text-sm text-gray-400">
                <Clock className="h-4 w-4" />
                Дедлайн
              </label>
              <input
                type="date"
                {...register('deadlineDate')}
                className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 flex items-center gap-2 text-sm text-gray-400">
              <FileText className="h-4 w-4" />
              Тип запроса
            </label>
            <select
              {...register('type')}
              className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
            >
              <option value="">Выберите тип</option>
              {LETTER_TYPES.filter((item) => item.value !== 'all').map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          {/* Additional fields from PDF */}
          {region && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 flex items-center gap-2 text-sm text-gray-400">
                  <MapPin className="h-4 w-4" />
                  Регион
                </label>
                <input
                  type="text"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label className="mb-1 flex items-center gap-2 text-sm text-gray-400">
              <FileText className="h-4 w-4" />
              Краткое содержание
            </label>
            <textarea
              {...register('content')}
              rows={2}
              className="w-full resize-none rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
              placeholder="Опишите содержание письма..."
            />
          </div>

          <div className="rounded-lg border border-gray-600/60 bg-gray-900/40 p-4">
            <h4 className="mb-3 text-sm font-semibold text-white">Данные заявителя</h4>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs text-gray-400">Имя</label>
                <input
                  type="text"
                  {...register('applicantName')}
                  className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                  placeholder="Имя заявителя"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400">Email</label>
                <input
                  type="email"
                  {...register('applicantEmail')}
                  className={`mt-1 w-full rounded-lg border ${errors.applicantEmail ? 'border-red-500' : 'border-gray-600'} bg-gray-700 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none`}
                  placeholder="email@example.com"
                />
                {errors.applicantEmail && (
                  <p className="mt-1 text-xs text-red-400">{errors.applicantEmail.message}</p>
                )}
              </div>
              <div>
                <label className="text-xs text-gray-400">Телефон</label>
                <input
                  type="tel"
                  {...register('applicantPhone')}
                  className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                  placeholder="+998901234567"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400">Telegram chat id</label>
                <input
                  type="text"
                  {...register('applicantTelegramChatId')}
                  className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                  placeholder="123456789"
                />
              </div>
            </div>
          </div>

          {/* Russian translation */}
          {contentRussian && (
            <div>
              <label className="mb-1 flex items-center gap-2 text-sm text-gray-400">
                <Bot className="h-4 w-4 text-purple-400" />
                Перевод на русский
              </label>
              <div className="max-h-32 w-full overflow-y-auto rounded-lg border border-gray-600 bg-gray-700/50 px-3 py-2 text-sm text-gray-300">
                {contentRussian}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={creating || parsing || !isValid}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-600"
            >
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Создание...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Создать письмо
                </>
              )}
            </button>
            <button
              type="button"
              onClick={reset}
              disabled={creating}
              className="rounded-lg bg-gray-700 px-4 py-2.5 text-white transition hover:bg-gray-600"
            >
              Сбросить
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
