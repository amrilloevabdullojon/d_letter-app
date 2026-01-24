'use client'

import { memo } from 'react'
import {
  User,
  FileText,
  MessageSquare,
  Calendar,
  Clock,
  AlertTriangle,
  Mail,
  Phone,
  ChevronRight,
  Paperclip,
} from 'lucide-react'
import {
  formatDate,
  getWorkingDaysUntilDeadline,
  getPriorityLabel,
  isDoneStatus,
  pluralizeDays,
} from '@/lib/utils'
import type { Letter } from '../types'

interface LetterQuickSummaryProps {
  letter: Letter
  commentsCount: number
  onScrollToComments: () => void
}

export const LetterQuickSummary = memo(function LetterQuickSummary({
  letter,
  commentsCount,
  onScrollToComments,
}: LetterQuickSummaryProps) {
  const daysLeft = getWorkingDaysUntilDeadline(letter.deadlineDate)
  const isDone = isDoneStatus(letter.status)
  const isOverdue = !isDone && daysLeft < 0
  const isUrgent = !isDone && daysLeft <= 2 && daysLeft >= 0
  const priorityInfo = getPriorityLabel(letter.priority)
  const pendingFiles = letter.files.filter((f) => f.status && f.status !== 'READY').length

  const ownerLabel = letter.owner?.name || letter.owner?.email || 'Не назначен'
  const applicantLabel = letter.applicantName || 'Не указан'

  return (
    <div className="space-y-4">
      {/* Progress/Timeline Card */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-800/60 to-slate-800/40 p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-300">Прогресс</span>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
              isDone
                ? 'bg-emerald-500/15 text-emerald-300'
                : isOverdue
                  ? 'bg-red-500/15 text-red-300'
                  : isUrgent
                    ? 'bg-amber-500/15 text-amber-300'
                    : 'bg-teal-500/15 text-teal-300'
            }`}
          >
            {isDone
              ? 'Завершено'
              : isOverdue
                ? `Просрочено на ${Math.abs(daysLeft)} ${pluralizeDays(Math.abs(daysLeft))}`
                : `${daysLeft} ${pluralizeDays(daysLeft)} до дедлайна`}
          </span>
        </div>

        {/* Timeline progress bar */}
        <div className="relative h-2 overflow-hidden rounded-full bg-slate-700/50">
          <div
            className={`absolute inset-y-0 left-0 rounded-full transition-all ${
              isDone
                ? 'w-full bg-gradient-to-r from-emerald-500 to-emerald-400'
                : isOverdue
                  ? 'w-full bg-gradient-to-r from-red-500 to-red-400'
                  : isUrgent
                    ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                    : 'bg-gradient-to-r from-teal-500 to-teal-400'
            }`}
            style={{
              width:
                isDone || isOverdue ? '100%' : `${Math.max(10, Math.min(95, 100 - daysLeft * 5))}%`,
            }}
          />
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
          <span>{formatDate(letter.date)}</span>
          <span>{formatDate(letter.deadlineDate)}</span>
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid gap-3 sm:grid-cols-2">
        {/* Executor Card */}
        <InfoCard
          icon={User}
          iconBg="bg-teal-500/15"
          iconColor="text-teal-400"
          label="Исполнитель"
          value={ownerLabel}
          subtitle={
            letter.owner?.email && letter.owner?.email !== ownerLabel
              ? letter.owner.email
              : undefined
          }
        />

        {/* Applicant Card */}
        <InfoCard
          icon={User}
          iconBg="bg-indigo-500/15"
          iconColor="text-indigo-400"
          label="Заявитель"
          value={applicantLabel}
          subtitle={letter.applicantEmail || undefined}
        />

        {/* Files Card */}
        <InfoCard
          icon={Paperclip}
          iconBg="bg-amber-500/15"
          iconColor="text-amber-400"
          label="Файлы"
          value={
            <span className="flex items-center gap-2">
              <span className="text-lg font-semibold">{letter.files.length}</span>
              {pendingFiles > 0 && (
                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-300">
                  {pendingFiles} в обработке
                </span>
              )}
            </span>
          }
        />

        {/* Comments Card */}
        <button
          onClick={onScrollToComments}
          className="group flex items-center gap-3 rounded-xl bg-slate-800/40 p-3.5 text-left transition-all hover:bg-slate-800/60"
        >
          <div className="rounded-lg bg-purple-500/15 p-2.5">
            <MessageSquare className="h-5 w-5 text-purple-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs text-slate-500">Комментарии</div>
            <div className="text-lg font-semibold text-white">{commentsCount}</div>
          </div>
          <ChevronRight className="h-5 w-5 text-slate-500 transition-transform group-hover:translate-x-1" />
        </button>
      </div>

      {/* Priority Badge (if high priority) */}
      {letter.priority >= 80 && (
        <div
          className={`flex items-center gap-3 rounded-xl p-3.5 ${
            letter.priority >= 90
              ? 'border border-red-500/20 bg-red-500/10'
              : 'border border-amber-500/20 bg-amber-500/10'
          }`}
        >
          <div
            className={`rounded-lg p-2 ${
              letter.priority >= 90 ? 'bg-red-500/20' : 'bg-amber-500/20'
            }`}
          >
            <AlertTriangle
              className={`h-5 w-5 ${letter.priority >= 90 ? 'text-red-400' : 'text-amber-400'}`}
            />
          </div>
          <div>
            <div
              className={`font-medium ${letter.priority >= 90 ? 'text-red-300' : 'text-amber-300'}`}
            >
              {priorityInfo.label}
            </div>
            <div
              className={`text-sm ${
                letter.priority >= 90 ? 'text-red-300/70' : 'text-amber-300/70'
              }`}
            >
              Приоритет: {letter.priority}
            </div>
          </div>
        </div>
      )}
    </div>
  )
})

interface InfoCardProps {
  icon: React.ComponentType<{ className?: string }>
  iconBg: string
  iconColor: string
  label: string
  value: React.ReactNode
  subtitle?: string
}

function InfoCard({ icon: Icon, iconBg, iconColor, label, value, subtitle }: InfoCardProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-slate-800/40 p-3.5">
      <div className={`rounded-lg p-2.5 ${iconBg}`}>
        <Icon className={`h-5 w-5 ${iconColor}`} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs text-slate-500">{label}</div>
        <div className="truncate text-sm font-medium text-white">{value}</div>
        {subtitle && <div className="truncate text-xs text-slate-500">{subtitle}</div>}
      </div>
    </div>
  )
}
