'use client'

import { useState, useCallback, useEffect, memo } from 'react'
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
  AlertCircle,
  Sparkles,
  Scan,
  MapPin,
  FileCode,
  Bot,
  ExternalLink,
  Plus,
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
import { OrganizationAutocomplete } from '@/components/OrganizationAutocomplete'
import { OwnerSelector, type OwnerOption } from '@/components/OwnerSelector'
import { getWorkingDaysUntilDeadline } from '@/lib/utils'

interface ParsedPdfData {
  number: string | null
  date: string | null
  deadline: string | null
  organization: string | null
  content: string | null
  contentRussian: string | null
  region: string | null
  district: string | null
  type: string | null
  priority: number | null
}

interface ParseMeta {
  extractedFrom?: {
    ai?: boolean
    pdf?: boolean
    filename?: boolean
  }
}

interface SimilarLetter {
  id: string
  number: string
  org: string
  date: string
  status: string
}

interface QuickLetterUploadProps {
  onClose?: () => void
}

const QUICK_UPLOAD_ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx'] as const

export const QuickLetterUpload = memo(function QuickLetterUpload({
  onClose,
}: QuickLetterUploadProps) {
  const router = useRouter()
  const toast = useToast()
  const [dragOver, setDragOver] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [creating, setCreating] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [parseSource, setParseSource] = useState<'ai' | 'pdf' | 'filename' | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const [createdLetterId, setCreatedLetterId] = useState<string | null>(null)
  const [owners, setOwners] = useState<OwnerOption[]>([])
  const [ownersLoading, setOwnersLoading] = useState(true)
  const [ownerLoadError, setOwnerLoadError] = useState<string | null>(null)
  const [selectedOwner, setSelectedOwner] = useState<OwnerOption | null>(null)

  // Дополнительные поля (не в схеме)
  const [contentRussian, setContentRussian] = useState('')
  const [region, setRegion] = useState('')
  const [district, setDistrict] = useState('')
  const [parsedPriority, setParsedPriority] = useState<number | null>(null)
  const [similarLetters, setSimilarLetters] = useState<SimilarLetter[]>([])

  useEffect(() => {
    let cancelled = false

    const loadOwners = async () => {
      try {
        setOwnersLoading(true)
        setOwnerLoadError(null)

        const response = await fetch('/api/letters/owners')
        if (!response.ok) {
          throw new Error('Не удалось загрузить исполнителей')
        }

        const payload = await response.json()
        if (cancelled) return

        setOwners(
          (payload.users || []).map(
            (user: {
              id: string
              name: string | null
              email: string | null
              image?: string | null
              activeLetters?: number
            }) => ({
              id: user.id,
              name: user.name,
              email: user.email,
              image: user.image,
              activeLetters: user.activeLetters ?? 0,
            })
          )
        )
      } catch (error) {
        if (cancelled) return
        console.error('Failed to load owners:', error)
        setOwnerLoadError('Не удалось загрузить исполнителей. Сработает автоназначение.')
      } finally {
        if (!cancelled) {
          setOwnersLoading(false)
        }
      }
    }

    loadOwners()

    return () => {
      cancelled = true
    }
  }, [])

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

  const watchDeadline = watch('deadlineDate')

  const parseDocumentContent = useCallback(
    async (
      f: File
    ): Promise<{ data: ParsedPdfData | null; meta: ParseMeta | null; error?: string }> => {
      try {
        const formData = new FormData()
        formData.append('file', f)

        const res = await fetch('/api/parse-pdf', {
          method: 'POST',
          body: formData,
        })

        if (!res.ok) {
          const err = await res.json().catch(() => null)
          console.error('PDF parse error:', err)
          return {
            data: null,
            meta: null,
            error: err?.error || 'Не удалось выполнить AI-анализ документа',
          }
        }

        const result = await res.json()
        return { data: result.data, meta: result.meta }
      } catch (error) {
        console.error('Failed to parse document:', error)
        return {
          data: null,
          meta: null,
          error:
            error instanceof Error ? error.message : 'Не удалось выполнить AI-анализ документа',
        }
      }
    },
    []
  )

  const handleFile = useCallback(
    async (f: File) => {
      const lowerName = f.name.toLowerCase()
      const isSupportedDocument = QUICK_UPLOAD_ALLOWED_EXTENSIONS.some((extension) =>
        lowerName.endsWith(extension)
      )

      if (!isSupportedDocument) {
        toast.error('Быстрое AI-добавление поддерживает только PDF, DOC и DOCX файлы')
        return
      }

      setFile(f)
      setParsing(true)
      setParseSource(null)
      setServerError(null)
      setCreatedLetterId(null)
      setContentRussian('')
      setRegion('')
      setDistrict('')
      setParsedPriority(null)
      setSimilarLetters([])

      toast.loading('Анализ документа с помощью AI...', { id: 'parsing' })

      const parseResult = await parseDocumentContent(f)

      if (parseResult.data && parseResult.meta) {
        const { data, meta } = parseResult

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
        setRegion(data.region || '')
        setDistrict(data.district || '')
        if (data.type) {
          setValue('type', data.type)
        } else {
          const recommendedType = recommendLetterType({
            content: data.content,
            contentRussian: data.contentRussian,
            organization: data.organization,
            filename: f.name,
          })
          if (recommendedType) {
            setValue('type', recommendedType)
          }
        }

        if (data.priority !== null && data.priority !== undefined) {
          setParsedPriority(data.priority)
        }

        // Поиск похожих писем (семантический поиск)
        if (data.content && data.content.trim().length > 10) {
          try {
            const similarRes = await fetch('/api/letters/similar', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ content: data.content }),
            })
            if (similarRes.ok) {
              const similarData = await similarRes.json()
              if (similarData.success && similarData.similarLetters?.length > 0) {
                setSimilarLetters(similarData.similarLetters)
              }
            }
          } catch (err) {
            console.error('Failed to search similar letters', err)
          }
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

      if (parseResult.error) {
        toast.warning(`${parseResult.error} Используем распознавание по имени файла.`, {
          id: 'parsing',
        })
      }

      // Fallback: парсим имя файла
      const filenameResult = parseLetterFilename(f.name)

      if (filenameResult.isValid) {
        setParseSource('filename')
        setValue('number', filenameResult.number)
        setValue('date', formatDateForInput(filenameResult.date))
        // +7 рабочих дней
        setValue(
          'deadlineDate',
          formatDateForInput(calculateDeadline(filenameResult.date, DEFAULT_DEADLINE_WORKING_DAYS))
        )
        setValue('content', filenameResult.content)
        const guessedOrg = guessOrganization(filenameResult.content)
        setValue('org', guessedOrg)
        const recommendedType = recommendLetterType({
          content: filenameResult.content,
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
    [parseDocumentContent, toast, setValue]
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

  const handleContentBlur = useCallback(() => {
    const content = watch('content')
    const org = watch('org')
    if (content && !watch('type')) {
      const suggested = recommendLetterType({ content, organization: org || '' })
      if (suggested) setValue('type', suggested, { shouldValidate: true })
    }
  }, [watch, setValue])

  const onSubmit = async (data: QuickLetterUploadInput) => {
    setCreating(true)
    setServerError(null)
    const toastId = toast.loading('Создание письма...')

    try {
      const formData = new FormData()
      formData.append('number', data.number)
      formData.append('org', data.org)
      formData.append('date', data.date)
      if (data.deadlineDate) formData.append('deadlineDate', data.deadlineDate)
      if (data.type) formData.append('type', data.type)
      if (data.content) formData.append('content', data.content)
      if (data.applicantName) formData.append('applicantName', data.applicantName)
      if (data.applicantEmail) formData.append('applicantEmail', data.applicantEmail)
      if (data.applicantPhone) formData.append('applicantPhone', data.applicantPhone)
      if (data.applicantTelegramChatId)
        formData.append('applicantTelegramChatId', data.applicantTelegramChatId)
      if (contentRussian) formData.append('contentRussian', contentRussian)
      if (region) formData.append('region', region)
      if (district) formData.append('district', district)
      if (parsedPriority !== null) formData.append('priority', parsedPriority.toString())
      if (selectedOwner?.id) formData.append('ownerId', selectedOwner.id)
      if (file) {
        formData.append('file', file)
      }

      const letterRes = await fetch('/api/letters', {
        method: 'POST',
        body: formData,
      })

      const letterData = await letterRes.json()

      if (!letterRes.ok) {
        const errorMessage = letterData.error || 'Ошибка создания письма'
        setServerError(errorMessage)
        toast.removeToast(toastId)
        return
      }

      const createdLetter = letterData.letter || letterData
      const letterId = createdLetter?.id
      if (!letterId) {
        throw new Error('Missing letter id from server')
      }

      toast.success('Письмо создано!', { id: toastId })
      setCreatedLetterId(letterId)
    } catch (error) {
      console.error('Create error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Ошибка создания'
      setServerError(errorMessage)
      toast.error(errorMessage, { id: toastId })
    } finally {
      setCreating(false)
    }
  }

  const reset = () => {
    setFile(null)
    setParseSource(null)
    setContentRussian('')
    setRegion('')
    setDistrict('')
    setParsedPriority(null)
    setSimilarLetters([])
    setServerError(null)
    setCreatedLetterId(null)
    setSelectedOwner(null)
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

  // Счётчик рабочих дней до дедлайна
  const deadlineDays = watchDeadline ? getWorkingDaysUntilDeadline(watchDeadline) : null

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
        Перетащите PDF, DOC или DOCX файл письма. Gemini AI извлечёт данные, а исходный документ
        будет прикреплён к письму одним серверным запросом.
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
          <p className="mt-2 text-xs text-gray-500">PDF, DOC или DOCX</p>
        </div>
      ) : createdLetterId ? (
        // Баннер успешного создания
        <div className="space-y-4">
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4">
            <div className="mb-3 flex items-center gap-2 text-emerald-400">
              <Check className="h-5 w-5" />
              <span className="font-semibold">Письмо создано!</span>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                onClick={() => router.push(`/letters/${createdLetterId}`)}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 font-medium text-white transition hover:bg-emerald-700"
              >
                <ExternalLink className="h-4 w-4" />
                Открыть письмо
              </button>
              <button
                onClick={reset}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-gray-700 px-4 py-2.5 font-medium text-white transition hover:bg-gray-600"
              >
                <Plus className="h-4 w-4" />
                Создать ещё
              </button>
            </div>
          </div>
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
              Данные извлечены и нормализованы с помощью AI
            </div>
          )}

          {/* Server error */}
          {serverError && (
            <div className="flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-400">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{serverError}</span>
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
              <OrganizationAutocomplete
                value={watch('org')}
                onChange={(value) => setValue('org', value, { shouldValidate: true })}
                placeholder="3-son oilaviy poliklinika"
                className={errors.org ? 'border-red-500' : ''}
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
              {deadlineDays !== null &&
                (deadlineDays < 0 ? (
                  <p className="mt-1 text-xs text-red-400">Дедлайн в прошлом</p>
                ) : (
                  <p className="mt-1 text-xs text-slate-400">{deadlineDays} раб. дн. до дедлайна</p>
                ))}
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

          <div>
            <label className="mb-1 flex items-center gap-2 text-sm text-gray-400">
              <Building2 className="h-4 w-4" />
              Исполнитель
              {ownersLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-500" />}
            </label>
            <OwnerSelector
              currentOwner={selectedOwner}
              users={owners}
              onSelect={async (userId) => {
                const nextOwner = userId
                  ? (owners.find((user) => user.id === userId) ?? null)
                  : null
                setSelectedOwner(nextOwner)
              }}
              disabled={creating || parsing || ownersLoading}
              canEdit={true}
              placeholder="Автоматически назначить исполнителя"
            />
            {ownerLoadError && <p className="mt-2 text-xs text-amber-400">{ownerLoadError}</p>}
            {!ownerLoadError && (
              <p className="mt-2 text-xs text-gray-500">
                Если исполнителя не выбрать, система назначит его автоматически.
              </p>
            )}
          </div>

          {/* Additional fields from PDF */}
          {(region || district) && (
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
              <div>
                <label className="mb-1 flex items-center gap-2 text-sm text-gray-400">
                  <MapPin className="h-4 w-4" />
                  Район
                </label>
                <input
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
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
              onBlur={handleContentBlur}
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
                <label className="flex items-center gap-1 text-xs text-gray-400">
                  Telegram chat id
                  <a
                    href="https://t.me/userinfobot"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-0.5 text-blue-400 hover:text-blue-300"
                    title="Как найти Telegram chat id"
                    onClick={(e) => e.stopPropagation()}
                  >
                    (как найти?)
                  </a>
                </label>
                <input
                  type="text"
                  {...register('applicantTelegramChatId')}
                  className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                  placeholder="123456789"
                />
              </div>
            </div>
          </div>

          {/* Similar Letters Alert */}
          {similarLetters.length > 0 && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
              <div className="mb-2 flex items-center gap-2 text-amber-400">
                <AlertCircle className="h-5 w-5" />
                <h4 className="font-semibold">Внимание! Найдены похожие письма:</h4>
              </div>
              <div className="space-y-2 text-sm text-amber-200/80">
                <p>Возможно, это дубликат. Похожие письма в системе:</p>
                <ul className="list-inside list-disc space-y-1">
                  {similarLetters.map((l) => (
                    <li key={l.id}>
                      Письмо №{l.number} от {l.org} ({new Date(l.date).toLocaleDateString('ru-RU')})
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

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
})
