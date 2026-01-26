'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  X,
  Save,
  Loader2,
  Bell,
  Shield,
  Crown,
  Mail,
  MessageSquare,
  User as UserIcon,
  Clock,
} from 'lucide-react'
import type { User } from '@/lib/settings-types'
import {
  ROLE_OPTIONS,
  ROLE_BADGE_CLASSES,
  DIGEST_OPTIONS,
  fieldCompact,
} from '@/lib/settings-types'

// Zod валидация схема
const userEditSchema = z.object({
  name: z.string().min(1, 'Имя обязательно').max(100, 'Имя слишком длинное'),
  email: z.string().email('Некорректный email').min(1, 'Email обязателен'),
  role: z.enum(['SUPERADMIN', 'ADMIN', 'MANAGER', 'AUDITOR', 'EMPLOYEE', 'VIEWER']),
  canLogin: z.boolean(),
  telegramChatId: z.string(),
  notifyEmail: z.boolean(),
  notifyTelegram: z.boolean(),
  notifySms: z.boolean(),
  notifyInApp: z.boolean(),
  digestFrequency: z.enum(['NONE', 'DAILY', 'WEEKLY']),
  quietHoursStart: z.string(),
  quietHoursEnd: z.string(),
})

type UserEditFormData = z.infer<typeof userEditSchema>

interface UserEditModalProps {
  user: User
  editData: UserEditFormData
  saving: boolean
  isSuperAdmin: boolean
  isLastAdmin: boolean
  isLastSuperAdmin: boolean
  onSave: (data: UserEditFormData) => void
  onCancel: () => void
}

const controlBase =
  'h-4 w-4 rounded border-white/20 bg-white/5 text-teal-500 focus:ring-teal-400/50'

export function UserEditModal({
  user,
  editData,
  saving,
  isSuperAdmin,
  isLastAdmin,
  isLastSuperAdmin,
  onSave,
  onCancel,
}: UserEditModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)

  const roleChangeLocked = !isSuperAdmin || isLastAdmin || isLastSuperAdmin
  const accessChangeLocked = user.role === 'ADMIN' || user.role === 'SUPERADMIN'

  // React Hook Form с Zod валидацией
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty, isValid },
    watch,
  } = useForm<UserEditFormData>({
    resolver: zodResolver(userEditSchema),
    defaultValues: editData,
    mode: 'onChange',
  })

  const selectedRole = watch('role')

  // Focus trap and escape handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onCancel])

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onCancel()
    }
  }

  const onSubmit = (data: UserEditFormData) => {
    onSave(data)
  }

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-modal-title"
    >
      <div className="flex min-h-full items-start justify-center p-4">
        <div
          ref={modalRef}
          className="panel panel-glass relative w-full max-w-lg rounded-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4 border-b border-white/10 p-6">
            <div className="flex items-center gap-3">
              {user.image ? (
                <Image
                  src={user.image}
                  alt={user.name || user.email || 'User'}
                  width={48}
                  height={48}
                  className="h-12 w-12 rounded-full"
                  unoptimized
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
                  <UserIcon className="h-6 w-6 text-gray-400" />
                </div>
              )}
              <div>
                <h2 id="edit-modal-title" className="text-lg font-semibold text-white">
                  Редактирование
                </h2>
                <p className="text-sm text-gray-400">{user.email || 'Без email'}</p>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="rounded-lg p-2 text-gray-400 transition hover:bg-white/5 hover:text-white"
              aria-label="Закрыть"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-6">
            {/* Basic Info Section */}
            <section>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-300">
                <UserIcon className="h-4 w-4 text-teal-400" />
                Основная информация
              </h3>
              <div className="space-y-3">
                {/* Name */}
                <div className="grid gap-1">
                  <label htmlFor="edit-name" className="text-xs text-gray-400">
                    Имя
                  </label>
                  <input
                    {...register('name')}
                    id="edit-name"
                    type="text"
                    className={`${fieldCompact} w-full px-3 py-2 ${
                      errors.name ? 'border-red-500/50 ring-red-500/20' : ''
                    }`}
                    placeholder="Имя пользователя"
                    autoFocus
                  />
                  {errors.name && <p className="text-xs text-red-400">{errors.name.message}</p>}
                </div>

                {/* Email */}
                <div className="grid gap-1">
                  <label htmlFor="edit-email" className="text-xs text-gray-400">
                    Email
                  </label>
                  <input
                    {...register('email')}
                    id="edit-email"
                    type="email"
                    className={`${fieldCompact} w-full px-3 py-2 ${
                      errors.email ? 'border-red-500/50 ring-red-500/20' : ''
                    }`}
                    placeholder="email@example.com"
                  />
                  {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
                </div>

                {/* Role */}
                <div className="grid gap-1">
                  <label htmlFor="edit-role" className="text-xs text-gray-400">
                    Роль
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      {...register('role')}
                      id="edit-role"
                      disabled={roleChangeLocked}
                      className={`${fieldCompact} flex-1 px-3 py-2 disabled:opacity-60`}
                    >
                      {ROLE_OPTIONS.map((role) => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                    <span
                      className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs ${ROLE_BADGE_CLASSES[selectedRole]}`}
                    >
                      {selectedRole === 'SUPERADMIN' ? (
                        <Crown className="h-3 w-3" />
                      ) : (
                        <Shield className="h-3 w-3" />
                      )}
                    </span>
                  </div>
                  {!isSuperAdmin && (
                    <p className="text-xs text-amber-400">Роли меняет только суперадмин</p>
                  )}
                  {isSuperAdmin && isLastAdmin && (
                    <p className="text-xs text-amber-400">
                      Единственный админ не может быть понижен
                    </p>
                  )}
                  {isSuperAdmin && isLastSuperAdmin && (
                    <p className="text-xs text-amber-400">
                      Единственный суперадмин не может быть понижен
                    </p>
                  )}
                </div>

                {/* Can Login */}
                <div className="grid gap-1">
                  <label htmlFor="edit-access" className="text-xs text-gray-400">
                    Доступ в систему
                  </label>
                  <select
                    {...register('canLogin', {
                      setValueAs: (v) => {
                        if (typeof v === 'boolean') return v
                        return v === 'true'
                      },
                    })}
                    id="edit-access"
                    disabled={accessChangeLocked}
                    className={`${fieldCompact} w-full px-3 py-2 disabled:opacity-60`}
                    defaultValue={editData.canLogin ? 'true' : 'false'}
                  >
                    <option value="true">Открыт</option>
                    <option value="false">Закрыт</option>
                  </select>
                  {accessChangeLocked && (
                    <p className="text-xs text-amber-400">
                      Нельзя блокировать админа или суперадмина
                    </p>
                  )}
                </div>

                {/* Telegram Chat ID */}
                <div className="grid gap-1">
                  <label htmlFor="edit-telegram" className="text-xs text-gray-400">
                    Telegram Chat ID
                  </label>
                  <div className="relative">
                    <MessageSquare className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-400" />
                    <input
                      {...register('telegramChatId')}
                      id="edit-telegram"
                      type="text"
                      className={`${fieldCompact} w-full py-2 pl-10 pr-3`}
                      placeholder="123456789"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Notifications Section */}
            <section className="border-t border-white/10 pt-4">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-300">
                <Bell className="h-4 w-4 text-teal-400" />
                Уведомления
              </h3>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-gray-300">
                    <input {...register('notifyEmail')} type="checkbox" className={controlBase} />
                    <Mail className="h-4 w-4 text-gray-500" />
                    Email
                  </label>
                  <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-gray-300">
                    <input
                      {...register('notifyTelegram')}
                      type="checkbox"
                      className={controlBase}
                    />
                    <MessageSquare className="h-4 w-4 text-gray-500" />
                    Telegram
                  </label>
                  <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-gray-300">
                    <input {...register('notifySms')} type="checkbox" className={controlBase} />
                    SMS
                  </label>
                  <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-gray-300">
                    <input {...register('notifyInApp')} type="checkbox" className={controlBase} />В
                    системе
                  </label>
                </div>

                {/* Digest Frequency */}
                <div className="grid gap-1">
                  <label htmlFor="edit-digest" className="text-xs text-gray-400">
                    Дайджест
                  </label>
                  <select
                    {...register('digestFrequency')}
                    id="edit-digest"
                    className={`${fieldCompact} w-full px-3 py-2`}
                  >
                    {DIGEST_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            {/* Quiet Hours Section */}
            <section className="border-t border-white/10 pt-4">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-300">
                <Clock className="h-4 w-4 text-teal-400" />
                Тихие часы
              </h3>
              <p className="mb-3 text-xs text-gray-500">
                В это время уведомления не будут отправляться
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1">
                  <label htmlFor="edit-quiet-start" className="text-xs text-gray-400">
                    Начало
                  </label>
                  <input
                    {...register('quietHoursStart')}
                    id="edit-quiet-start"
                    type="time"
                    className={`${fieldCompact} w-full px-3 py-2 ${
                      errors.quietHoursStart ? 'border-red-500/50 ring-red-500/20' : ''
                    }`}
                  />
                  {errors.quietHoursStart && (
                    <p className="text-xs text-red-400">{errors.quietHoursStart.message}</p>
                  )}
                </div>
                <div className="grid gap-1">
                  <label htmlFor="edit-quiet-end" className="text-xs text-gray-400">
                    Конец
                  </label>
                  <input
                    {...register('quietHoursEnd')}
                    id="edit-quiet-end"
                    type="time"
                    className={`${fieldCompact} w-full px-3 py-2 ${
                      errors.quietHoursEnd ? 'border-red-500/50 ring-red-500/20' : ''
                    }`}
                  />
                  {errors.quietHoursEnd && (
                    <p className="text-xs text-red-400">{errors.quietHoursEnd.message}</p>
                  )}
                </div>
              </div>
            </section>

            {/* Footer */}
            <div className="-mx-6 -mb-6 mt-6 flex items-center justify-between rounded-b-2xl border-t border-white/10 bg-slate-900/50 p-4">
              <span className="text-xs text-gray-500">
                {saving
                  ? 'Сохранение...'
                  : isDirty
                    ? 'Есть несохранённые изменения'
                    : 'Нет изменений'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={saving}
                  className="rounded-lg border border-white/10 px-4 py-2 text-sm text-gray-300 transition hover:bg-white/5 hover:text-white disabled:opacity-50"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={!isDirty || !isValid || saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm text-white transition hover:bg-teal-500 disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Сохранить
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
