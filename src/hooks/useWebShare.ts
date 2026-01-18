'use client'

import { useState, useCallback } from 'react'

export interface ShareData {
  title?: string
  text?: string
  url?: string
  files?: File[]
}

export interface UseWebShareReturn {
  isSupported: boolean
  canShareFiles: boolean
  share: (data: ShareData) => Promise<boolean>
  isSharing: boolean
  error: string | null
}

/**
 * Hook для работы с Web Share API
 * Позволяет делиться контентом через нативный диалог шаринга
 */
export function useWebShare(): UseWebShareReturn {
  const [isSharing, setIsSharing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Проверка поддержки Web Share API
  const isSupported = typeof window !== 'undefined' && 'share' in navigator

  // Проверка поддержки шаринга файлов
  const canShareFiles =
    typeof window !== 'undefined' && navigator.canShare && navigator.canShare({ files: [] })

  const share = useCallback(
    async (data: ShareData): Promise<boolean> => {
      setError(null)

      if (!isSupported) {
        setError('Web Share API не поддерживается в этом браузере')
        return false
      }

      // Проверка наличия данных
      if (!data.title && !data.text && !data.url && !data.files?.length) {
        setError('Необходимо указать хотя бы одно поле для шаринга')
        return false
      }

      // Проверка поддержки файлов
      if (data.files && data.files.length > 0 && !canShareFiles) {
        setError('Шаринг файлов не поддерживается в этом браузере')
        return false
      }

      // Валидация URL
      if (data.url) {
        try {
          new URL(data.url)
        } catch {
          setError('Некорректный URL')
          return false
        }
      }

      setIsSharing(true)

      try {
        // Подготовка данных для шаринга
        const shareData: ShareData = {}

        if (data.title) shareData.title = data.title
        if (data.text) shareData.text = data.text
        if (data.url) shareData.url = data.url
        if (data.files && data.files.length > 0) shareData.files = data.files

        // Проверка возможности шаринга (некоторые браузеры требуют проверку)
        if (navigator.canShare && !navigator.canShare(shareData)) {
          setError('Невозможно поделиться этими данными')
          return false
        }

        // Вызов нативного диалога шаринга
        await navigator.share(shareData)
        return true
      } catch (err: unknown) {
        // Пользователь отменил шаринг - не считается ошибкой
        if (err instanceof Error && err.name === 'AbortError') {
          return false
        }

        // Реальная ошибка
        const errorMessage = err instanceof Error ? err.message : 'Ошибка при попытке поделиться'
        setError(errorMessage)
        console.error('Web Share error:', err)
        return false
      } finally {
        setIsSharing(false)
      }
    },
    [isSupported, canShareFiles]
  )

  return {
    isSupported,
    canShareFiles,
    share,
    isSharing,
    error,
  }
}

/**
 * Утилита для создания share data для письма
 */
export function createLetterShareData(letter: {
  number: string
  org: string
  subject?: string | null
  id: string
}): ShareData {
  const url = `${window.location.origin}/letters/${letter.id}`
  const title = `Письмо №${letter.number}`
  const text = letter.subject
    ? `${letter.org} - ${letter.subject}`
    : `Письмо от ${letter.org}`

  return { title, text, url }
}
