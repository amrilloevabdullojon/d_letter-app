'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Send } from 'lucide-react'
import { useState } from 'react'

const commentSchema = z.object({
  text: z.string().min(1, 'Введите комментарий').max(2000, 'Максимум 2000 символов'),
})

type CommentFormData = z.infer<typeof commentSchema>

type ApplicantCommentFormProps = {
  token: string
  language?: 'ru' | 'uz'
}

export function ApplicantCommentForm({ token, language = 'ru' }: ApplicantCommentFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const copy =
    language === 'uz'
      ? {
          required: 'Izoh kiriting',
          failed: "Izohni yuborib bo'lmadi",
          network: "Tarmoq xatosi. Qayta urinib ko'ring.",
          placeholder: 'Savol yoki aniqlashtirishni yozing...',
          limit: '2000 belgigacha',
          sending: 'Yuborilmoqda...',
          send: 'Yuborish',
          sent: 'Izoh yuborildi',
        }
      : {
          required: 'Введите комментарий',
          failed: 'Не удалось отправить комментарий',
          network: 'Ошибка сети. Попробуйте еще раз.',
          placeholder: 'Опишите вопрос или уточнение...',
          limit: 'До 2000 символов',
          sending: 'Отправка...',
          send: 'Отправить',
          sent: 'Комментарий отправлен',
        }

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isValid },
  } = useForm<CommentFormData>({
    resolver: zodResolver(commentSchema),
    mode: 'onChange',
    defaultValues: {
      text: '',
    },
  })

  const textValue = watch('text')

  const scrollToComments = () => {
    const element = document.getElementById('comments')
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const onSubmit = async (data: CommentFormData) => {
    setIsSubmitting(true)
    setError(null)
    setSuccess(false)

    try {
      const response = await fetch(`/api/portal/${token}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: data.text.trim() }),
      })

      const responseData = (await response.json()) as { error?: string }

      if (!response.ok) {
        setError(responseData.error || copy.failed)
        return
      }

      reset()
      setSuccess(true)
      router.refresh()
      setTimeout(() => scrollToComments(), 150)
      setTimeout(() => setSuccess(false), 2500)
    } catch {
      setError(copy.network)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <textarea
        {...register('text')}
        rows={4}
        maxLength={2000}
        placeholder={copy.placeholder}
        className={`w-full rounded-xl border px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none ${
          errors.text
            ? 'border-red-500/50 bg-gray-900/60 focus:border-red-400'
            : 'border-gray-800 bg-gray-900/60 focus:border-emerald-400'
        }`}
        disabled={isSubmitting}
      />
      {errors.text && <p className="text-xs text-red-400">{errors.text.message}</p>}
      <div className="text-muted flex items-center justify-between text-xs">
        <span>{copy.limit}</span>
        <span>{textValue?.length || 0}/2000</span>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          className="btn-primary inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
          disabled={isSubmitting || !isValid}
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          {isSubmitting ? copy.sending : copy.send}
        </button>
        {success && <span className="text-xs text-emerald-400">{copy.sent}</span>}
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </form>
  )
}
