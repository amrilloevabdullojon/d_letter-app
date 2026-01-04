'use client'

import { useMemo } from 'react'
import { Clock, CheckCircle, AlertTriangle, XCircle } from 'lucide-react'

interface SLAIndicatorProps {
  createdAt: string
  deadlineDate: string
  status: string
  closedAt?: string | null
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function SLAIndicator({
  createdAt,
  deadlineDate,
  status,
  closedAt,
  showLabel = true,
  size = 'md',
}: SLAIndicatorProps) {
  const { progress, daysLeft, totalDays, isCompleted, isOverdue, statusInfo } = useMemo(() => {
    const created = new Date(createdAt)
    const deadline = new Date(deadlineDate)
    const now = new Date()
    const closed = closedAt ? new Date(closedAt) : null

    const totalMs = deadline.getTime() - created.getTime()
    const totalDays = Math.max(1, Math.ceil(totalMs / (1000 * 60 * 60 * 24)))

    const isCompleted = status === 'DONE' || status === 'READY'
    const endDate = closed || now
    const elapsedMs = endDate.getTime() - created.getTime()
    const elapsedDays = Math.ceil(elapsedMs / (1000 * 60 * 60 * 24))

    const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    const isOverdue = !isCompleted && daysLeft < 0

    let progress = (elapsedDays / totalDays) * 100
    if (isCompleted && closed) {
      progress = Math.min(100, progress)
    } else if (isOverdue) {
      progress = 100
    }
    progress = Math.min(100, Math.max(0, progress))

    let statusInfo: { color: string; bgColor: string; icon: typeof Clock; label: string }

    if (isCompleted) {
      if (closed && closed <= deadline) {
        statusInfo = {
          color: 'text-emerald-400',
          bgColor: 'bg-emerald-500',
          icon: CheckCircle,
          label: 'Выполнено в срок',
        }
      } else {
        statusInfo = {
          color: 'text-amber-400',
          bgColor: 'bg-amber-500',
          icon: CheckCircle,
          label: 'Выполнено с опозданием',
        }
      }
    } else if (isOverdue) {
      statusInfo = {
        color: 'text-red-400',
        bgColor: 'bg-red-500',
        icon: XCircle,
        label: `Просрочено на ${Math.abs(daysLeft)} дн.`,
      }
    } else if (daysLeft <= 2) {
      statusInfo = {
        color: 'text-amber-400',
        bgColor: 'bg-amber-500',
        icon: AlertTriangle,
        label: daysLeft === 0 ? 'Сегодня дедлайн' : `Осталось ${daysLeft} дн.`,
      }
    } else {
      statusInfo = {
        color: 'text-blue-400',
        bgColor: 'bg-blue-500',
        icon: Clock,
        label: `Осталось ${daysLeft} дн.`,
      }
    }

    return { progress, daysLeft, totalDays, isCompleted, isOverdue, statusInfo }
  }, [createdAt, deadlineDate, status, closedAt])

  const sizeClasses = {
    sm: { bar: 'h-1.5', icon: 'h-3 w-3', text: 'text-xs' },
    md: { bar: 'h-2', icon: 'h-4 w-4', text: 'text-sm' },
    lg: { bar: 'h-3', icon: 'h-5 w-5', text: 'text-base' },
  }

  const Icon = statusInfo.icon

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
          className={`${sizeClasses[size].bar} rounded-full transition-all duration-500 ${statusInfo.bgColor}`}
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
