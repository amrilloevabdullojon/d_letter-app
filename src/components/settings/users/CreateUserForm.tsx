'use client'

import { useState } from 'react'
import { UserPlus, Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { ROLE_OPTIONS, fieldBase } from '@/lib/settings-types'
import type { UserRole } from '@/lib/settings-types'

const userFormSchema = z.object({
  name: z.string().min(2, 'Минимум 2 символа').max(100),
  email: z.string().email('Некорректный email адрес'),
  role: z.string(),
  telegramChatId: z.string().optional().or(z.literal('')),
})

type UserFormValues = z.infer<typeof userFormSchema>

interface CreateUserFormProps {
  isSuperAdmin: boolean
  roleOptions: typeof ROLE_OPTIONS
  onSuccess: (message: string) => void
  onError: (message: string) => void
  onUserCreated: () => void
}

export function CreateUserForm({
  isSuperAdmin,
  roleOptions,
  onSuccess,
  onError,
  onUserCreated,
}: CreateUserFormProps) {
  const [creating, setCreating] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: '',
      email: '',
      role: isSuperAdmin ? 'ADMIN' : 'MANAGER',
      telegramChatId: '',
    },
  })

  const onSubmit = async (data: UserFormValues) => {
    setCreating(true)
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (res.ok) {
        onSuccess('Пользователь добавлен. Email с приглашением отправлен.')
        reset()
        onUserCreated()
      } else {
        const errData = await res.json().catch(() => ({}))
        onError(errData.error || 'Ошибка добавления пользователя')
      }
    } catch (error) {
      console.error('Create user failed:', error)
      onError('Ошибка добавления пользователя')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="panel-soft panel-glass mb-6 rounded-2xl p-4">
      <div className="mb-4 flex items-center gap-2 text-sm text-slate-400">
        <UserPlus className="h-4 w-4 text-teal-400" />
        Добавить пользователя
      </div>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <input
              {...register('name')}
              className={`${fieldBase} w-full px-3 py-2 ${errors.name ? 'border-red-500 ring-red-500/20 focus:border-red-500' : ''}`}
              placeholder="Имя"
            />
            {errors.name && <p className="text-[10px] text-red-400">{errors.name.message}</p>}
          </div>

          <div className="space-y-1">
            <input
              {...register('email')}
              className={`${fieldBase} w-full px-3 py-2 ${errors.email ? 'border-red-500 ring-red-500/20 focus:border-red-500' : ''}`}
              placeholder="email@example.com"
            />
            {errors.email && <p className="text-[10px] text-red-400">{errors.email.message}</p>}
          </div>

          <div className="space-y-1">
            <select
              {...register('role')}
              disabled={!isSuperAdmin}
              className={`${fieldBase} w-full px-3 py-2 disabled:opacity-60`}
            >
              {roleOptions.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <input
              {...register('telegramChatId')}
              className={`${fieldBase} w-full px-3 py-2`}
              placeholder="Telegram Chat ID"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1 text-xs text-slate-500">
            <p>Для входа через Google требуется email.</p>
            {!isSuperAdmin && <p className="text-amber-400">Роли назначает только суперадмин.</p>}
          </div>
          <button
            type="submit"
            disabled={creating}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-white transition hover:bg-teal-500 disabled:opacity-50"
          >
            {creating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}
            Добавить
          </button>
        </div>
      </form>
    </div>
  )
}
