'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Bell } from 'lucide-react'
import { useState } from 'react'

const contactSchema = z
  .object({
    email: z.string().email('Неверный формат email').or(z.literal('')),
    telegramChatId: z.string(),
  })
  .refine((data) => data.email.trim() || data.telegramChatId.trim(), {
    message: 'Заполните email или Telegram ID',
    path: ['email'],
  })

type ContactFormData = z.infer<typeof contactSchema>

type ApplicantContactFormProps = {
  token: string
  initialEmail?: string | null
  initialTelegram?: string | null
  language?: 'ru' | 'uz'
}

export function ApplicantContactForm({
  token,
  initialEmail = '',
  initialTelegram = '',
  language = 'ru',
}: ApplicantContactFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const copy =
    language === 'uz'
      ? {
          required: 'Email yoki Telegram ID kiriting',
          failed: "Kontaktni saqlab bo'lmadi",
          network: "Tarmoq xatosi. Qayta urinib ko'ring.",
          inactive: 'Obuna faol emas',
          update: 'Obunani yangilash',
          subscribe: "Obuna bo'lish",
          updated: 'Obuna yangilandi',
          emailLabel: 'Email',
          telegramLabel: 'Telegram ID',
        }
      : {
          required: 'Заполните email или Telegram ID',
          failed: 'Не удалось сохранить контакт',
          network: 'Ошибка сети. Попробуйте еще раз.',
          inactive: 'Подписка не активна',
          update: 'Обновить подписку',
          subscribe: 'Подписаться',
          updated: 'Подписка обновлена',
          emailLabel: 'Email',
          telegramLabel: 'Telegram ID',
        }

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    mode: 'onChange',
    defaultValues: {
      email: initialEmail || '',
      telegramChatId: initialTelegram || '',
    },
  })

  const emailValue = watch('email')
  const telegramValue = watch('telegramChatId')

  const hasEmail = !!emailValue?.trim()
  const hasTelegram = !!telegramValue?.trim()

  const onSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true)
    setError(null)
    setSuccess(null)

    const payload = {
      email: data.email.trim(),
      telegramChatId: data.telegramChatId.trim(),
    }

    try {
      const response = await fetch(`/api/portal/${token}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const responseData = (await response.json()) as { error?: string; success?: boolean }

      if (!response.ok) {
        setError(responseData.error || copy.failed)
        return
      }

      if (responseData.success) {
        setSuccess(copy.updated)
      }
    } catch {
      setError(copy.network)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <div className="text-muted flex flex-wrap gap-2 text-xs">
        {hasEmail && <span className="app-pill text-xs">Email: {emailValue}</span>}
        {hasTelegram && <span className="app-pill text-xs">Telegram ID: {telegramValue}</span>}
        {!hasEmail && !hasTelegram && <span className="app-pill text-xs">{copy.inactive}</span>}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-muted text-xs">{copy.emailLabel}</label>
          <input
            {...register('email')}
            type="email"
            placeholder="email@example.com"
            className={`w-full rounded-xl border px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none ${
              errors.email
                ? 'border-red-500/50 bg-gray-900/60 focus:border-red-400'
                : 'border-gray-800 bg-gray-900/60 focus:border-emerald-400'
            }`}
            disabled={isSubmitting}
          />
          {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
        </div>
        <div className="space-y-1">
          <label className="text-muted text-xs">{copy.telegramLabel}</label>
          <input
            {...register('telegramChatId')}
            type="text"
            placeholder="123456789"
            className={`w-full rounded-xl border px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none ${
              errors.telegramChatId
                ? 'border-red-500/50 bg-gray-900/60 focus:border-red-400'
                : 'border-gray-800 bg-gray-900/60 focus:border-emerald-400'
            }`}
            disabled={isSubmitting}
          />
          {errors.telegramChatId && (
            <p className="text-xs text-red-400">{errors.telegramChatId.message}</p>
          )}
        </div>
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
            <Bell className="h-4 w-4" />
          )}
          {hasEmail || hasTelegram ? copy.update : copy.subscribe}
        </button>
        {success && <span className="text-xs text-emerald-400">{success}</span>}
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </form>
  )
}
