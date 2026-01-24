'use client'

import { memo } from 'react'
import {
  Calendar,
  Clock,
  User,
  AlertTriangle,
  Send,
  CheckCircle2,
  Bell,
  Loader2,
} from 'lucide-react'
import { SLAIndicator } from '@/components/SLAIndicator'
import {
  formatDate,
  getPriorityLabel,
  getWorkingDaysUntilDeadline,
  isDoneStatus,
} from '@/lib/utils'
import type { Letter } from '../types'

interface LetterInfoProps {
  letter: Letter
  updating: boolean
  notifyingOwner: boolean
  canManageLetters: boolean
  onPostponeDeadline: () => void
  onEscalate: () => void
  onNotifyOwner: () => void
}

export const LetterInfo = memo(function LetterInfo({
  letter,
  updating,
  notifyingOwner,
  canManageLetters,
  onPostponeDeadline,
  onEscalate,
  onNotifyOwner,
}: LetterInfoProps) {
  const daysLeft = getWorkingDaysUntilDeadline(letter.deadlineDate)
  const isDone = isDoneStatus(letter.status)
  const isOverdue = !isDone && daysLeft < 0
  const priorityInfo = getPriorityLabel(letter.priority)

  const notifyDisabledReason = !canManageLetters
    ? 'Недостаточно прав для уведомлений'
    : !letter.owner?.id
      ? 'Нет назначенного сотрудника'
      : !letter.owner?.telegramChatId
        ? 'У исполнителя нет Telegram ID'
        : null

  const notifyDisabled = notifyingOwner || !!notifyDisabledReason

  return (
    <div className="panel panel-glass rounded-2xl p-4 md:p-5">
      <h3 className="mb-4 font-semibold text-white">Информация</h3>

      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-slate-500" />
          <div>
            <div className="text-xs text-slate-500">Дата письма</div>
            <div className="text-white">{formatDate(letter.date)}</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Clock className="h-5 w-5 text-slate-500" />
          <div>
            <div className="text-xs text-slate-500">Дедлайн</div>
            <div className={isOverdue ? 'text-red-400' : isDone ? 'text-teal-400' : 'text-white'}>
              {formatDate(letter.deadlineDate)}
            </div>
          </div>
        </div>

        <div className="border-t border-slate-700/50 pt-2">
          <SLAIndicator
            createdAt={letter.date}
            deadlineDate={letter.deadlineDate}
            status={letter.status}
            closedAt={letter.closeDate}
            size="md"
          />
        </div>

        {!isDone && (
          <div className="flex flex-wrap gap-2 border-t border-slate-700/50 pt-3">
            <button
              onClick={onPostponeDeadline}
              disabled={updating}
              className="btn-secondary inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition disabled:opacity-50"
            >
              <Clock className="h-4 w-4" />
              Перенести дедлайн
            </button>
            <button
              onClick={onEscalate}
              disabled={updating}
              className="btn-secondary inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-amber-300 transition disabled:opacity-50"
            >
              <AlertTriangle className="h-4 w-4" />
              Эскалировать
            </button>
          </div>
        )}

        <div className="flex items-center gap-3">
          <User className="h-5 w-5 text-slate-500" />
          <div>
            <div className="text-xs text-slate-500">Исполнитель</div>
            <div className="text-white">
              {letter.owner?.name || letter.owner?.email || 'Не назначен'}
            </div>
          </div>
        </div>

        <button
          onClick={onNotifyOwner}
          disabled={notifyDisabled}
          title={notifyDisabledReason || 'Отправить уведомление'}
          className="btn-secondary inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition disabled:opacity-50"
        >
          {notifyingOwner ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Bell className="h-4 w-4" />
          )}
          Уведомить исполнителя
        </button>
        {notifyDisabledReason && (
          <div className="text-xs text-slate-500">{notifyDisabledReason}</div>
        )}

        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-slate-500" />
          <div>
            <div className="mb-1 text-xs text-slate-500">Приоритет</div>
            <div className={`font-medium ${priorityInfo.color}`}>
              {priorityInfo.label} ({letter.priority})
            </div>
          </div>
        </div>

        {letter.ijroDate && (
          <div className="flex items-center gap-3">
            <Send className="h-5 w-5 text-slate-500" />
            <div>
              <div className="text-xs text-slate-500">Дата ответа в IJRO</div>
              <div className="text-white">{formatDate(letter.ijroDate)}</div>
            </div>
          </div>
        )}

        {letter.closeDate && (
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-teal-500" />
            <div>
              <div className="text-xs text-slate-500">Дата закрытия</div>
              <div className="text-teal-400">{formatDate(letter.closeDate)}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
})
