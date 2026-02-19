'use client'

import { useMemo } from 'react'
import { Clock, CheckCircle, AlertTriangle, XCircle, Pause } from 'lucide-react'
import { getWorkingDaysUntilDeadline, parseDateValue, pluralizeDays } from '@/lib/utils'

const PAUSE_STATUSES = ['FROZEN', 'REJECTED']

interface SLAIndicatorProps {
  createdAt: string
  deadlineDate: string
  status: string
  closedAt?: string | null
  frozenAt?: string | null
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function SLAIndicator({
  createdAt,
  deadlineDate,
  status,
  closedAt,
  frozenAt,
  showLabel = true,
  size = 'md',
}: SLAIndicatorProps) {
  const { progress, statusInfo } = useMemo(() => {
    const created = parseDateValue(createdAt)
    const deadline = parseDateValue(deadlineDate)
    const now = new Date()
    const closed = closedAt ? parseDateValue(closedAt) : null

    if (!created || !deadline) {
      return {
        progress: 0,
        statusInfo: {
          color: 'text-slate-400',
          bgColor: 'bg-slate-500',
          icon: Clock,
          label: 'Нет данных',
        },
      }
    }

    const totalDaysRaw = getWorkingDaysUntilDeadline(deadline, created)
    const totalDays = Math.max(1, Math.abs(totalDaysRaw))

    const isCompleted = status === 'DONE' || status === 'READY' || status === 'PROCESSED'
    const isPaused = PAUSE_STATUSES.includes(status)

    const endDate = closed || now
    const elapsedDaysRaw = getWorkingDaysUntilDeadline(endDate, created)
    const elapsedDays = Math.min(totalDays, Math.max(0, Math.abs(elapsedDaysRaw)))

    const daysLeft = getWorkingDaysUntilDeadline(deadline, now)
    // Пауза защищает от просрочки — FROZEN/REJECTED не считаются просроченными
    const isOverdue = !isCompleted && !isPaused && daysLeft < 0

    let progress = (elapsedDays / totalDays) * 100
    if (isCompleted && closed) {
      progress = Math.min(100, progress)
    } else if (isOverdue) {
      progress = 100
    } else if (isPaused) {
      // Прогресс зафиксирован в момент заморозки
      progress = Math.min(100, progress)
    }
    progress = Math.min(100, Math.max(0, progress))

    let statusInfo: { color: string; bgColor: string; icon: typeof Clock; label: string }

    if (isCompleted) {
      if (closed && closed <= deadline) {
        statusInfo = {
          color: 'text-emerald-400',
          bgColor: 'bg-emerald-500',
          icon: CheckCircle,
          label: 'Закрыто в срок',
        }
      } else {
        statusInfo = {
          color: 'text-amber-400',
          bgColor: 'bg-amber-500',
          icon: CheckCircle,
          label: 'Закрыто с опозданием',
        }
      }
    } else if (isPaused) {
      // Показать сколько дней письмо заморожено
      const frozenDate = frozenAt ? parseDateValue(frozenAt) : null
      const frozenDays = frozenDate ? Math.abs(getWorkingDaysUntilDeadline(now, frozenDate)) : 0
      const statusLabel = status === 'FROZEN' ? 'Заморожено' : 'Отклонено'
      statusInfo = {
        color: 'text-blue-300',
        bgColor: 'bg-blue-500/50',
        icon: Pause,
        label:
          frozenDays > 0
            ? `${statusLabel} (${frozenDays} раб. ${pluralizeDays(frozenDays)})`
            : statusLabel,
      }
    } else if (isOverdue) {
      const absDays = Math.abs(daysLeft)
      statusInfo = {
        color: 'text-red-400',
        bgColor: 'bg-red-500',
        icon: XCircle,
        label: `Просрочено на ${absDays} раб. ${pluralizeDays(absDays)}`,
      }
    } else if (daysLeft <= 2) {
      statusInfo = {
        color: 'text-amber-400',
        bgColor: 'bg-amber-500',
        icon: AlertTriangle,
        label:
          daysLeft === 0
            ? 'Дедлайн сегодня'
            : `До дедлайна ${daysLeft} раб. ${pluralizeDays(daysLeft)}`,
      }
    } else {
      statusInfo = {
        color: 'text-blue-400',
        bgColor: 'bg-blue-500',
        icon: Clock,
        label: `До дедлайна ${daysLeft} раб. ${pluralizeDays(daysLeft)}`,
      }
    }

    return { progress, statusInfo }
  }, [createdAt, deadlineDate, status, closedAt, frozenAt])

  const sizeClasses = {
    sm: { bar: 'h-1.5', icon: 'h-3 w-3', text: 'text-xs' },
    md: { bar: 'h-2', icon: 'h-4 w-4', text: 'text-sm' },
    lg: { bar: 'h-3', icon: 'h-5 w-5', text: 'text-base' },
  }

  const Icon = statusInfo.icon
  const isPaused = PAUSE_STATUSES.includes(status)

  return (
    <div className="w-full">
      {showLabel && (
        <div className="mb-2 flex items-center justify-between">
          <div className={`flex items-center gap-2 ${statusInfo.color}`}>
            <Icon className={sizeClasses[size].icon} />
            <span className={`font-medium ${sizeClasses[size].text}`}>{statusInfo.label}</span>
          </div>
          <span className={`text-gray-400 ${sizeClasses[size].text}`}>{Math.round(progress)}%</span>
        </div>
      )}

      <div className={`overflow-hidden rounded-full bg-gray-700 ${sizeClasses[size].bar}`}>
        <div
          className={`${sizeClasses[size].bar} rounded-full transition-all duration-500 ${statusInfo.bgColor} ${isPaused ? 'opacity-60' : ''}`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {showLabel && (
        <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
          <span>Создано: {new Date(createdAt).toLocaleDateString('ru-RU')}</span>
          <span>Дедлайн: {new Date(deadlineDate).toLocaleDateString('ru-RU')}</span>
        </div>
      )}
    </div>
  )
}
