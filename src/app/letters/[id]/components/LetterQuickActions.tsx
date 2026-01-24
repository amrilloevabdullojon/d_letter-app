'use client'

import { memo } from 'react'
import { RefreshCw, Copy, Link2, Bell, Printer, Loader2, Zap, BellOff } from 'lucide-react'
import { useToast } from '@/components/Toast'

interface LetterQuickActionsProps {
  letterNumber: string
  isWatching: boolean
  togglingWatch: boolean
  onRefresh: () => void
  onToggleWatch: () => void
  onPrint: () => void
}

export const LetterQuickActions = memo(function LetterQuickActions({
  letterNumber,
  isWatching,
  togglingWatch,
  onRefresh,
  onToggleWatch,
  onPrint,
}: LetterQuickActionsProps) {
  const toast = useToast()

  const copyText = async (value: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(value)
      toast.success(successMessage)
    } catch (error) {
      console.error('Failed to copy text:', error)
      toast.error('Не удалось скопировать')
    }
  }

  const handleCopyNumber = () => {
    void copyText(letterNumber, 'Номер скопирован')
  }

  const handleCopyLink = () => {
    if (typeof window === 'undefined') return
    void copyText(window.location.href, 'Ссылка скопирована')
  }

  return (
    <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Zap className="h-4 w-4 text-amber-400" />
        <h3 className="text-sm font-medium text-slate-300">Быстрые действия</h3>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <ActionButton icon={RefreshCw} label="Обновить" shortcut="r" onClick={onRefresh} />
        <ActionButton icon={Printer} label="Печать" shortcut="p" onClick={onPrint} />
        <ActionButton icon={Copy} label="Номер" onClick={handleCopyNumber} />
        <ActionButton icon={Link2} label="Ссылка" onClick={handleCopyLink} />
      </div>

      {/* Watch toggle - full width */}
      <button
        type="button"
        onClick={onToggleWatch}
        disabled={togglingWatch}
        className={`mt-2 flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
          isWatching
            ? 'bg-teal-500/15 text-teal-300 ring-1 ring-teal-500/30'
            : 'bg-slate-800/40 text-slate-300 hover:bg-slate-700/50'
        } disabled:opacity-50`}
      >
        {togglingWatch ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isWatching ? (
          <BellOff className="h-4 w-4" />
        ) : (
          <Bell className="h-4 w-4" />
        )}
        {isWatching ? 'Отписаться от уведомлений' : 'Подписаться на уведомления'}
      </button>

      {/* Keyboard hints */}
      <div className="mt-3 flex flex-wrap gap-2">
        <KbdHint keys="f" label="избранное" />
        <KbdHint keys="r" label="обновить" />
        <KbdHint keys="p" label="печать" />
      </div>
    </div>
  )
})

interface ActionButtonProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  shortcut?: string
  onClick: () => void
  disabled?: boolean
}

function ActionButton({ icon: Icon, label, shortcut, onClick, disabled }: ActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group flex flex-col items-center gap-1.5 rounded-xl bg-slate-800/40 px-3 py-3 text-center transition hover:bg-slate-700/50 disabled:opacity-50"
    >
      <Icon className="h-5 w-5 text-slate-400 transition group-hover:text-teal-400" />
      <span className="text-xs text-slate-300">{label}</span>
    </button>
  )
}

function KbdHint({ keys, label }: { keys: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-slate-500">
      <kbd className="rounded bg-slate-700/50 px-1.5 py-0.5 font-mono">{keys}</kbd>
      <span>{label}</span>
    </span>
  )
}
