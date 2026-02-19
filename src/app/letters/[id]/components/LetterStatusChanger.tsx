'use client'

import { memo, useState, useRef, useEffect, useCallback } from 'react'
import {
  CircleDot,
  CircleCheck,
  Clock,
  HelpCircle,
  CheckCircle2,
  CheckCheck,
  Loader2,
  Snowflake,
  XCircle,
  ClipboardCheck,
  Undo2,
} from 'lucide-react'
import type { LetterStatus } from '@/types/prisma'
import { STATUS_LABELS } from '@/lib/utils'

const STATUS_CONFIG: Record<
  LetterStatus,
  {
    icon: React.ComponentType<{ className?: string }>
    color: string
    bgColor: string
    ringColor: string
  }
> = {
  NOT_REVIEWED: {
    icon: CircleDot,
    color: 'text-slate-400',
    bgColor: 'bg-slate-500/10',
    ringColor: 'ring-slate-500/30',
  },
  ACCEPTED: {
    icon: CircleCheck,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    ringColor: 'ring-blue-500/30',
  },
  IN_PROGRESS: {
    icon: Clock,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    ringColor: 'ring-amber-500/30',
  },
  CLARIFICATION: {
    icon: HelpCircle,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    ringColor: 'ring-purple-500/30',
  },
  FROZEN: {
    icon: Snowflake,
    color: 'text-blue-300',
    bgColor: 'bg-blue-500/10',
    ringColor: 'ring-blue-500/30',
  },
  REJECTED: {
    icon: XCircle,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    ringColor: 'ring-red-500/30',
  },
  READY: {
    icon: CheckCircle2,
    color: 'text-teal-400',
    bgColor: 'bg-teal-500/10',
    ringColor: 'ring-teal-500/30',
  },
  PROCESSED: {
    icon: ClipboardCheck,
    color: 'text-indigo-400',
    bgColor: 'bg-indigo-500/10',
    ringColor: 'ring-indigo-500/30',
  },
  DONE: {
    icon: CheckCheck,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    ringColor: 'ring-emerald-500/30',
  },
}

const STATUSES: LetterStatus[] = [
  'NOT_REVIEWED',
  'ACCEPTED',
  'IN_PROGRESS',
  'CLARIFICATION',
  'FROZEN',
  'REJECTED',
  'READY',
  'PROCESSED',
  'DONE',
]

const UNDO_DELAY = 5000 // ms

interface LetterStatusChangerProps {
  currentStatus: LetterStatus
  updating: boolean
  onStatusChange: (status: LetterStatus) => void
}

export const LetterStatusChanger = memo(function LetterStatusChanger({
  currentStatus,
  updating,
  onStatusChange,
}: LetterStatusChangerProps) {
  // pending — статус, который ожидает подтверждения (ещё не отправлен на сервер)
  const [pendingStatus, setPendingStatus] = useState<LetterStatus | null>(null)
  const [countdown, setCountdown] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Очистка таймеров при размонтировании
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  const commitChange = useCallback(
    (status: LetterStatus) => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (intervalRef.current) clearInterval(intervalRef.current)
      setPendingStatus(null)
      setCountdown(0)
      onStatusChange(status)
    },
    [onStatusChange]
  )

  const handleStatusClick = useCallback(
    (status: LetterStatus) => {
      if (status === currentStatus) return

      // Если уже ждём другого — сбросить и немедленно применить предыдущий pending
      if (pendingStatus !== null && pendingStatus !== status) {
        commitChange(pendingStatus)
      }

      // Запустить новый undo-таймер
      setPendingStatus(status)
      setCountdown(Math.ceil(UNDO_DELAY / 1000))

      if (intervalRef.current) clearInterval(intervalRef.current)
      intervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (intervalRef.current) clearInterval(intervalRef.current)
            return 0
          }
          return prev - 1
        })
      }, 1000)

      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        commitChange(status)
      }, UNDO_DELAY)
    },
    [currentStatus, pendingStatus, commitChange]
  )

  const handleUndo = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (intervalRef.current) clearInterval(intervalRef.current)
    setPendingStatus(null)
    setCountdown(0)
  }, [])

  // Отображаемый «текущий» статус — pending (если есть) или реальный
  const displayStatus = pendingStatus ?? currentStatus

  return (
    <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-300">Статус</h3>
        {updating && <Loader2 className="h-4 w-4 animate-spin text-teal-400" />}
      </div>

      {/* Undo-баннер */}
      {pendingStatus && (
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs">
          <span className="flex-1 text-amber-200">
            Статус изменится через <span className="font-semibold tabular-nums">{countdown}с</span>
          </span>
          <button
            onClick={handleUndo}
            className="inline-flex items-center gap-1 rounded-lg bg-amber-500/20 px-2 py-1 font-medium text-amber-300 transition hover:bg-amber-500/30"
          >
            <Undo2 className="h-3.5 w-3.5" />
            Отменить
          </button>
        </div>
      )}

      <div className="space-y-1.5">
        {STATUSES.map((status) => {
          const config = STATUS_CONFIG[status]
          const Icon = config.icon
          const isActive = displayStatus === status
          const isPending = pendingStatus === status

          return (
            <button
              key={status}
              onClick={() => handleStatusClick(status)}
              disabled={updating || (isActive && !isPending)}
              className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${
                isActive
                  ? `${config.bgColor} ${config.color} ring-1 ${config.ringColor}`
                  : 'bg-slate-800/40 text-slate-300 hover:bg-slate-700/50'
              } disabled:cursor-default`}
            >
              <Icon
                className={`h-4 w-4 shrink-0 ${isActive ? config.color : 'text-slate-500 group-hover:text-slate-400'}`}
              />
              <span className="flex-1">{STATUS_LABELS[status]}</span>
              {isPending ? (
                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-medium text-amber-300">
                  Ожидает
                </span>
              ) : isActive ? (
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium">
                  Текущий
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
})
