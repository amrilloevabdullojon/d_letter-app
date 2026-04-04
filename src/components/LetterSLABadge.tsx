'use client'

import { useMemo } from 'react'
import { Clock, CheckCircle2, AlertTriangle, XCircle, Pause } from 'lucide-react'
import { getWorkingDaysUntilDeadline, parseDateValue, pluralizeDays } from '@/lib/utils'

const PAUSED_STATUSES = ['FROZEN', 'REJECTED']
const DONE_STATUSES = ['DONE', 'READY', 'PROCESSED']

export type LetterSLAStatus =
  | 'on_time'
  | 'at_risk'
  | 'breached'
  | 'done_on_time'
  | 'done_late'
  | 'paused'

interface LetterSLABadgeProps {
  createdAt: string | Date
  deadlineDate: string | Date
  status: string
  frozenAt?: string | Date | null
  closeDate?: string | Date | null
  /** compact — shows only icon+color, no text */
  compact?: boolean
  className?: string
}

export function computeLetterSLA(
  createdAt: string | Date,
  deadlineDate: string | Date,
  status: string,
  closeDate?: string | Date | null
): LetterSLAStatus {
  const deadline = parseDateValue(deadlineDate)
  const now = new Date()
  const closed = closeDate ? parseDateValue(closeDate) : null
  if (!deadline) return 'on_time'

  const isCompleted = DONE_STATUSES.includes(status)
  const isPaused = PAUSED_STATUSES.includes(status)

  if (isCompleted) {
    const resolvedAt = closed || now
    return resolvedAt <= deadline ? 'done_on_time' : 'done_late'
  }

  if (isPaused) return 'paused'

  const daysLeft = getWorkingDaysUntilDeadline(deadline, now)
  if (daysLeft < 0) return 'breached'
  if (daysLeft <= 2) return 'at_risk'
  return 'on_time'
}

const SLA_CONFIG: Record<
  LetterSLAStatus,
  {
    label: string
    shortLabel: string
    color: string
    bg: string
    border: string
    icon: typeof Clock
  }
> = {
  on_time: {
    label: 'В срок',
    shortLabel: 'В срок',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    icon: Clock,
  },
  at_risk: {
    label: 'Под угрозой',
    shortLabel: '⚠️ Риск',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    icon: AlertTriangle,
  },
  breached: {
    label: 'Просрочен',
    shortLabel: 'Просрочен',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    icon: XCircle,
  },
  done_on_time: {
    label: 'Закрыто в срок',
    shortLabel: 'В срок ✓',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    icon: CheckCircle2,
  },
  done_late: {
    label: 'Закрыто с опозданием',
    shortLabel: 'С опозданием',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    icon: CheckCircle2,
  },
  paused: {
    label: 'Пауза SLA',
    shortLabel: 'Пауза',
    color: 'text-slate-400',
    bg: 'bg-slate-500/10',
    border: 'border-slate-500/20',
    icon: Pause,
  },
}

export function LetterSLABadge({
  createdAt,
  deadlineDate,
  status,
  frozenAt,
  closeDate,
  compact = false,
  className = '',
}: LetterSLABadgeProps) {
  const { slaStatus, daysLeftLabel } = useMemo(() => {
    const deadline = parseDateValue(deadlineDate)
    const now = new Date()
    const slaStatus = computeLetterSLA(createdAt, deadlineDate, status, closeDate)

    let daysLeftLabel = ''
    if (slaStatus === 'breached' && deadline) {
      const days = Math.abs(getWorkingDaysUntilDeadline(deadline, now))
      daysLeftLabel = `−${days} ${pluralizeDays(days)}`
    } else if (slaStatus === 'at_risk' && deadline) {
      const days = getWorkingDaysUntilDeadline(deadline, now)
      daysLeftLabel = days === 0 ? 'сегодня' : `${days} ${pluralizeDays(days)}`
    }

    return { slaStatus, daysLeftLabel }
  }, [createdAt, deadlineDate, status, closeDate])

  const cfg = SLA_CONFIG[slaStatus]
  const Icon = cfg.icon

  // Don't show badge for on_time letters (not interesting)
  if (slaStatus === 'on_time') return null

  if (compact) {
    return (
      <span
        title={cfg.label}
        className={`inline-flex h-5 w-5 items-center justify-center rounded-full ${cfg.bg} ${className}`}
      >
        <Icon className={`h-3 w-3 ${cfg.color}`} />
      </span>
    )
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${cfg.bg} ${cfg.border} ${cfg.color} ${className}`}
    >
      <Icon className="h-3 w-3 shrink-0" />
      {cfg.shortLabel}
      {daysLeftLabel && <span className="opacity-70">·&nbsp;{daysLeftLabel}</span>}
    </span>
  )
}
