'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Clock, Loader2 } from 'lucide-react'
import { createFocusTrap } from '@/lib/a11y'
import { useIsMobile } from '@/hooks/useIsMobile'

// Пресеты переноса в рабочих днях
const PRESETS = [
  { label: '+1 день', value: 1 },
  { label: '+3 дня', value: 3 },
  { label: '+5 дней', value: 5 },
  { label: '+10 дней', value: 10 },
]

interface PostponeDialogProps {
  isOpen: boolean
  loading: boolean
  onClose: () => void
  onConfirm: (days: number) => void
}

export function PostponeDialog({ isOpen, loading, onClose, onConfirm }: PostponeDialogProps) {
  const [inputValue, setInputValue] = useState('3')
  const dialogRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const isMobile = useIsMobile()

  // Focus trap
  useEffect(() => {
    if (!isOpen || !dialogRef.current) return
    const cleanup = createFocusTrap(dialogRef.current)
    return cleanup
  }, [isOpen])

  // Фокус на инпуте при открытии
  useEffect(() => {
    if (isOpen) {
      setInputValue('3')
      setTimeout(() => inputRef.current?.select(), 50)
    }
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  // Prevent body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const handleSubmit = useCallback(() => {
    const days = Number.parseInt(inputValue, 10)
    if (!Number.isFinite(days) || days === 0) return
    onConfirm(days)
  }, [inputValue, onConfirm])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit()
  }

  const parsedDays = Number.parseInt(inputValue, 10)
  const isValid = Number.isFinite(parsedDays) && parsedDays !== 0

  if (!isOpen) return null

  return (
    <div
      className={`fixed inset-0 z-50 flex ${isMobile ? 'items-end' : 'items-center'} justify-center`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="postpone-dialog-title"
        className={`relative z-10 w-full max-w-sm border border-gray-700 bg-gray-800 p-6 shadow-2xl ${
          isMobile ? 'animate-slideUp rounded-t-2xl' : 'rounded-xl'
        }`}
        style={
          isMobile ? { paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)' } : undefined
        }
      >
        {/* Close button */}
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute right-4 top-4 p-1 text-gray-400 transition hover:text-white disabled:opacity-50"
          aria-label="Закрыть"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Icon */}
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/20">
          <Clock className="h-6 w-6 text-amber-400" />
        </div>

        {/* Content */}
        <h2 id="postpone-dialog-title" className="mb-1 text-lg font-semibold text-white">
          Перенести дедлайн
        </h2>
        <p className="mb-5 text-sm text-gray-400">На сколько рабочих дней перенести дедлайн?</p>

        {/* Presets */}
        <div className="mb-4 flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              onClick={() => setInputValue(String(preset.value))}
              disabled={loading}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition disabled:opacity-50 ${
                parsedDays === preset.value
                  ? 'bg-amber-500/30 text-amber-300 ring-1 ring-amber-500/40'
                  : 'bg-gray-700/60 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Custom input */}
        <div className="mb-6">
          <label htmlFor="postpone-days" className="mb-1.5 block text-xs text-gray-400">
            Или введите количество дней
          </label>
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              id="postpone-days"
              type="number"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              min="-365"
              max="365"
              className="w-full rounded-lg border border-slate-600 bg-slate-700/50 px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/30 disabled:opacity-50"
              placeholder="3"
            />
            <span className="shrink-0 text-sm text-gray-400">раб. дн.</span>
          </div>
          {inputValue && !isValid && (
            <p className="mt-1 text-xs text-red-400">Введите ненулевое целое число</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 rounded-lg bg-gray-700 px-4 py-2.5 font-medium text-white transition hover:bg-gray-600 disabled:opacity-50"
          >
            Отмена
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !isValid}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 font-medium text-white transition hover:bg-amber-500 disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Перенести
          </button>
        </div>
      </div>
    </div>
  )
}

// Hook for easy usage
interface UsePostponeDialogOptions {
  onConfirm: (days: number) => Promise<void>
}

export function usePostponeDialog({ onConfirm }: UsePostponeDialogOptions) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => {
    if (!loading) setIsOpen(false)
  }, [loading])

  const handleConfirm = useCallback(
    async (days: number) => {
      setLoading(true)
      try {
        await onConfirm(days)
        setIsOpen(false)
      } catch {
        // Error handled by caller
      } finally {
        setLoading(false)
      }
    },
    [onConfirm]
  )

  const Dialog = (
    <PostponeDialog isOpen={isOpen} loading={loading} onClose={close} onConfirm={handleConfirm} />
  )

  return { open, Dialog }
}
