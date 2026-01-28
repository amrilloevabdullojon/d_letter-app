'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/Toast'
import { useConfirmDialog } from '@/components/ConfirmDialog'
import { addWorkingDays, parseDateValue } from '@/lib/utils'
import type { Letter } from '../types'

interface UseLetterActionsOptions {
  letter: Letter | null
  onUpdate: () => Promise<void>
  onLetterChange: (updates: Partial<Letter>) => void
  canManageLetters: boolean
}

interface UseLetterActionsReturn {
  updating: boolean
  deleting: boolean
  duplicating: boolean
  togglingFavorite: boolean
  togglingWatch: boolean
  notifyingOwner: boolean
  portalLoading: boolean
  portalLink: string
  updateField: (field: string, value: string) => Promise<void>
  saveField: (field: string, value: string) => Promise<void>
  changeOwner: (ownerId: string | null) => Promise<void>
  deleteLetter: () => void
  duplicateLetter: () => Promise<void>
  toggleFavorite: () => Promise<void>
  toggleWatch: () => Promise<void>
  notifyOwner: () => Promise<void>
  postponeDeadline: () => Promise<void>
  escalate: () => Promise<void>
  generatePortalLink: () => Promise<void>
  copyPortalLink: () => Promise<void>
  copyLetterNumber: () => Promise<void>
  copyPageLink: () => Promise<void>
  printPage: () => void
  ConfirmDialog: React.ReactNode
}

export function useLetterActions({
  letter,
  onUpdate,
  onLetterChange,
  canManageLetters,
}: UseLetterActionsOptions): UseLetterActionsReturn {
  const router = useRouter()
  const toast = useToast()
  const { confirm: confirmDialog, Dialog } = useConfirmDialog()

  const [updating, setUpdating] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [duplicating, setDuplicating] = useState(false)
  const [togglingFavorite, setTogglingFavorite] = useState(false)
  const [togglingWatch, setTogglingWatch] = useState(false)
  const [notifyingOwner, setNotifyingOwner] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)
  const [portalLink, setPortalLink] = useState(() => {
    if (letter?.applicantAccessToken && typeof window !== 'undefined') {
      return `${window.location.origin}/portal/${letter.applicantAccessToken}`
    }
    return ''
  })

  const updateField = useCallback(
    async (field: string, value: string) => {
      if (!letter) return
      setUpdating(true)
      try {
        const res = await fetch(`/api/letters/${letter.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ field, value }),
        })
        const data = await res.json().catch(() => null)
        if (!res.ok) {
          toast.error(data?.error || 'Не удалось обновить поле')
          return
        }
        await onUpdate()
      } catch (err) {
        console.error('Failed to update:', err)
      } finally {
        setUpdating(false)
      }
    },
    [letter, onUpdate, toast]
  )

  const saveField = useCallback(
    async (field: string, value: string) => {
      if (!letter) return
      setUpdating(true)
      try {
        const res = await fetch(`/api/letters/${letter.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ field, value }),
        })
        const data = await res.json().catch(() => null)
        if (!res.ok) {
          toast.error(data?.error || 'Не удалось обновить поле')
          throw new Error(data?.error || 'Failed to update')
        }
        await onUpdate()
      } catch (err) {
        console.error('Failed to save:', err)
        throw err
      } finally {
        setUpdating(false)
      }
    },
    [letter, onUpdate, toast]
  )

  const changeOwner = useCallback(
    async (ownerId: string | null) => {
      if (!letter) return
      setUpdating(true)
      try {
        const res = await fetch(`/api/letters/${letter.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ field: 'ownerId', value: ownerId }),
        })
        const data = await res.json().catch(() => null)
        if (!res.ok) {
          toast.error(data?.error || 'Не удалось изменить исполнителя')
          throw new Error(data?.error || 'Failed to change owner')
        }
        toast.success(ownerId ? 'Исполнитель назначен' : 'Исполнитель снят')
        await onUpdate()
      } catch (err) {
        console.error('Failed to change owner:', err)
        throw err
      } finally {
        setUpdating(false)
      }
    },
    [letter, onUpdate, toast]
  )

  const handleDelete = useCallback(async () => {
    if (!letter) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/letters/${letter.id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Письмо удалено')
        router.push('/letters')
      } else {
        toast.error('Не удалось удалить письмо')
      }
    } catch (err) {
      console.error('Failed to delete:', err)
      toast.error('Ошибка при удалении письма')
    } finally {
      setDeleting(false)
    }
  }, [letter, router, toast])

  const deleteLetter = useCallback(() => {
    if (!letter) return
    confirmDialog({
      title: 'Удалить письмо?',
      message: 'Вы уверены, что хотите удалить это письмо? Это действие нельзя отменить.',
      confirmText: 'Удалить',
      variant: 'danger',
      onConfirm: handleDelete,
    })
  }, [confirmDialog, handleDelete, letter])

  const duplicateLetter = useCallback(async () => {
    if (!letter) return
    setDuplicating(true)
    try {
      const res = await fetch(`/api/letters/${letter.id}/duplicate`, { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        toast.success('Письмо скопировано')
        router.push(`/letters/${data.id}`)
      } else {
        toast.error(data.error || 'Не удалось дублировать письмо')
      }
    } catch (err) {
      console.error('Failed to duplicate:', err)
      toast.error('Ошибка при дублировании письма')
    } finally {
      setDuplicating(false)
    }
  }, [letter, router, toast])

  const toggleFavorite = useCallback(async () => {
    if (!letter) return
    setTogglingFavorite(true)
    try {
      const res = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ letterId: letter.id }),
      })
      if (res.ok) {
        onLetterChange({ isFavorite: !letter.isFavorite })
      }
    } catch (err) {
      console.error('Failed to toggle favorite:', err)
    } finally {
      setTogglingFavorite(false)
    }
  }, [letter, onLetterChange])

  const toggleWatch = useCallback(async () => {
    if (!letter) return
    setTogglingWatch(true)
    try {
      const res = await fetch(`/api/letters/${letter.id}/watch`, {
        method: letter.isWatching ? 'DELETE' : 'POST',
      })
      if (res.ok) {
        onLetterChange({ isWatching: !letter.isWatching })
      }
    } catch (err) {
      console.error('Failed to toggle watch:', err)
    } finally {
      setTogglingWatch(false)
    }
  }, [letter, onLetterChange])

  const notifyOwner = useCallback(async () => {
    if (!letter) return
    if (!canManageLetters) {
      toast.error('Недостаточно прав для отправки уведомления')
      return
    }
    if (!letter.owner?.id) {
      toast.error('Нет назначенного сотрудника')
      return
    }
    if (!letter.owner?.telegramChatId) {
      toast.error('У исполнителя нет Telegram ID')
      return
    }

    setNotifyingOwner(true)
    const toastId = toast.loading('Отправляем уведомление...')

    try {
      const res = await fetch(`/api/letters/${letter.id}/notify`, { method: 'POST' })
      const data = await res.json()
      if (res.ok && data.success) {
        toast.success('Уведомление отправлено', { id: toastId })
      } else {
        toast.error(data.error || 'Не удалось отправить уведомление', { id: toastId })
      }
    } catch (err) {
      console.error('Failed to notify owner:', err)
      toast.error('Ошибка отправки уведомления', { id: toastId })
    } finally {
      setNotifyingOwner(false)
    }
  }, [letter, canManageLetters, toast])

  const postponeDeadline = useCallback(async () => {
    if (!letter) return
    const input = window.prompt('На сколько рабочих дней перенести дедлайн?', '3')
    if (!input) return

    const delta = Number.parseInt(input, 10)
    if (!Number.isFinite(delta) || delta === 0) {
      toast.error('Введите число рабочих дней')
      return
    }

    const currentDeadline = parseDateValue(letter.deadlineDate)
    if (!currentDeadline) {
      toast.error('Не удалось прочитать дату дедлайна')
      return
    }

    const nextDeadline = addWorkingDays(currentDeadline, delta)
    try {
      await saveField('deadlineDate', nextDeadline.toISOString())
      toast.success('Дедлайн обновлён')
    } catch {
      // saveField already notifies on error
    }
  }, [letter, saveField, toast])

  const escalate = useCallback(async () => {
    if (!letter) return
    if (letter.priority >= 90) {
      toast.success('Приоритет уже высокий')
      return
    }

    try {
      await saveField('priority', '100')
      toast.success('Приоритет повышен')
      if (letter.owner?.id) {
        await notifyOwner()
      }
    } catch {
      // saveField already notifies on error
    }
  }, [letter, saveField, toast, notifyOwner])

  const generatePortalLink = useCallback(async () => {
    if (!letter) return
    setPortalLoading(true)
    try {
      const res = await fetch(`/api/letters/${letter.id}/portal`, { method: 'POST' })
      const data = await res.json()
      if (res.ok && data.link) {
        setPortalLink(data.link)
        await onUpdate()
        toast.success(data.notified ? 'Ссылка отправлена заявителю' : 'Ссылка создана')
      } else {
        toast.error(data.error || 'Не удалось создать ссылку')
      }
    } catch (err) {
      console.error('Failed to create portal link:', err)
      toast.error('Ошибка создания ссылки')
    } finally {
      setPortalLoading(false)
    }
  }, [letter, onUpdate, toast])

  const copyText = useCallback(
    async (value: string, successMessage: string) => {
      try {
        await navigator.clipboard.writeText(value)
        toast.success(successMessage)
      } catch (err) {
        console.error('Failed to copy text:', err)
        toast.error('Не удалось скопировать')
      }
    },
    [toast]
  )

  const copyPortalLink = useCallback(async () => {
    if (!portalLink) return
    await copyText(portalLink, 'Ссылка скопирована')
  }, [portalLink, copyText])

  const copyLetterNumber = useCallback(async () => {
    if (!letter) return
    await copyText(letter.number, 'Номер скопирован')
  }, [letter, copyText])

  const copyPageLink = useCallback(async () => {
    if (typeof window === 'undefined') return
    await copyText(window.location.href, 'Ссылка скопирована')
  }, [copyText])

  const printPage = useCallback(() => {
    window.print()
  }, [])

  return {
    updating,
    deleting,
    duplicating,
    togglingFavorite,
    togglingWatch,
    notifyingOwner,
    portalLoading,
    portalLink,
    updateField,
    saveField,
    changeOwner,
    deleteLetter,
    duplicateLetter,
    toggleFavorite,
    toggleWatch,
    notifyOwner,
    postponeDeadline,
    escalate,
    generatePortalLink,
    copyPortalLink,
    copyLetterNumber,
    copyPageLink,
    printPage,
    ConfirmDialog: Dialog,
  }
}
