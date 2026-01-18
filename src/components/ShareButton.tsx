'use client'

import { Share2, Loader2 } from 'lucide-react'
import { useWebShare, type ShareData } from '@/hooks/useWebShare'
import { useToast } from '@/components/Toast'
import { useEffect } from 'react'

interface ShareButtonProps {
  shareData: ShareData
  variant?: 'default' | 'icon'
  className?: string
  label?: string
  onShareSuccess?: () => void
  onShareError?: (error: string) => void
}

/**
 * Кнопка для шаринга контента через Web Share API
 * Автоматически скрывается, если API не поддерживается
 */
export function ShareButton({
  shareData,
  variant = 'default',
  className = '',
  label = 'Поделиться',
  onShareSuccess,
  onShareError,
}: ShareButtonProps) {
  const { isSupported, share, isSharing, error } = useWebShare()
  const toast = useToast()

  // Показываем toast при ошибке
  useEffect(() => {
    if (error) {
      toast.error(error)
      onShareError?.(error)
    }
  }, [error, toast, onShareError])

  // Не показываем кнопку, если API не поддерживается
  if (!isSupported) {
    return null
  }

  const handleShare = async () => {
    const success = await share(shareData)
    if (success) {
      toast.success('Успешно поделились')
      onShareSuccess?.()
    }
  }

  if (variant === 'icon') {
    return (
      <button
        onClick={handleShare}
        disabled={isSharing}
        className={`tap-highlight touch-target rounded-lg p-2 text-slate-400 transition hover:bg-white/5 hover:text-white disabled:opacity-50 ${className}`}
        title={label}
        aria-label={label}
      >
        {isSharing ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Share2 className="h-5 w-5" />
        )}
      </button>
    )
  }

  return (
    <button
      onClick={handleShare}
      disabled={isSharing}
      className={`tap-highlight touch-target inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10 disabled:opacity-50 ${className}`}
      aria-label={label}
    >
      {isSharing ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Share2 className="h-4 w-4" />
      )}
      {label}
    </button>
  )
}
