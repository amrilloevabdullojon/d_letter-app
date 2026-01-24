'use client'

import { memo } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Star,
  Printer,
  Copy,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Hash,
  Building2,
} from 'lucide-react'
import { StatusBadge } from '@/components/StatusBadge'
import {
  formatDate,
  getWorkingDaysUntilDeadline,
  pluralizeDays,
  isDoneStatus,
  getPriorityLabel,
} from '@/lib/utils'
import type { Letter } from '../types'

interface LetterHeaderProps {
  letter: Letter
  togglingFavorite: boolean
  duplicating: boolean
  deleting: boolean
  onToggleFavorite: () => void
  onDuplicate: () => void
  onDelete: () => void
  onPrint: () => void
}

export const LetterHeader = memo(function LetterHeader({
  letter,
  togglingFavorite,
  duplicating,
  deleting,
  onToggleFavorite,
  onDuplicate,
  onDelete,
  onPrint,
}: LetterHeaderProps) {
  const daysLeft = getWorkingDaysUntilDeadline(letter.deadlineDate)
  const isDone = isDoneStatus(letter.status)
  const isOverdue = !isDone && daysLeft < 0
  const isUrgent = !isDone && daysLeft <= 2 && daysLeft >= 0
  const priorityInfo = getPriorityLabel(letter.priority)

  return (
    <div className="print:hidden">
      {/* Breadcrumb */}
      <div className="mb-4 flex items-center justify-between">
        <Link
          href="/letters"
          className="group inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          <span>Письма</span>
          <span className="text-slate-600">/</span>
          <span className="font-mono text-teal-400">#{letter.number}</span>
        </Link>

        {/* Action buttons - always visible */}
        <div className="flex items-center gap-1">
          <button
            onClick={onToggleFavorite}
            disabled={togglingFavorite}
            className={`group relative rounded-lg p-2 transition-all hover:bg-white/5 ${
              letter.isFavorite ? 'text-amber-400' : 'text-slate-400 hover:text-amber-400'
            }`}
            title={letter.isFavorite ? 'Убрать из избранного' : 'В избранное'}
          >
            {togglingFavorite ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Star
                className={`h-5 w-5 transition-transform group-hover:scale-110 ${letter.isFavorite ? 'fill-current' : ''}`}
              />
            )}
          </button>

          <button
            onClick={onPrint}
            className="rounded-lg p-2 text-slate-400 transition-all hover:bg-white/5 hover:text-white"
            title="Печать"
          >
            <Printer className="h-5 w-5" />
          </button>

          <button
            onClick={onDuplicate}
            disabled={duplicating}
            className="rounded-lg p-2 text-slate-400 transition-all hover:bg-white/5 hover:text-white"
            title="Дублировать"
          >
            {duplicating ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Copy className="h-5 w-5" />
            )}
          </button>

          <button
            onClick={onDelete}
            disabled={deleting}
            className="rounded-lg p-2 text-slate-400 transition-all hover:bg-red-500/10 hover:text-red-400"
            title="Удалить"
          >
            {deleting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Trash2 className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Main Header Card with gradient */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800/80 via-slate-800/60 to-slate-900/80 p-5 backdrop-blur-sm">
        {/* Decorative gradient orb */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full bg-teal-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-indigo-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          {/* Left side - Letter info */}
          <div className="min-w-0 flex-1 space-y-3">
            {/* Number and type */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-1.5 rounded-lg bg-teal-500/15 px-3 py-1.5">
                <Hash className="h-4 w-4 text-teal-400" />
                <span className="font-mono text-sm font-semibold text-teal-300">
                  {letter.number}
                </span>
              </div>

              {letter.type && (
                <span className="rounded-lg border border-slate-600/50 bg-slate-700/30 px-2.5 py-1 text-xs font-medium text-slate-300">
                  {letter.type}
                </span>
              )}

              {letter.priority >= 80 && (
                <span
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                    letter.priority >= 90
                      ? 'bg-red-500/15 text-red-300'
                      : 'bg-amber-500/15 text-amber-300'
                  }`}
                >
                  {priorityInfo.label}
                </span>
              )}
            </div>

            {/* Organization name */}
            <div className="flex items-start gap-3">
              <div className="mt-1 rounded-lg bg-slate-700/50 p-2">
                <Building2 className="h-5 w-5 text-slate-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold leading-tight text-white md:text-2xl">
                  {letter.org}
                </h1>
                <p className="mt-1 text-sm text-slate-400">от {formatDate(letter.date)}</p>
              </div>
            </div>
          </div>

          {/* Right side - Status and deadline */}
          <div className="flex flex-row items-center gap-4 lg:flex-col lg:items-end lg:gap-3">
            <StatusBadge status={letter.status} size="lg" />

            <div
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm ${
                isOverdue
                  ? 'bg-red-500/15 text-red-300'
                  : isUrgent
                    ? 'bg-amber-500/15 text-amber-300'
                    : isDone
                      ? 'bg-emerald-500/15 text-emerald-300'
                      : 'bg-slate-700/50 text-slate-300'
              }`}
            >
              <Clock className="h-4 w-4" />
              <span className="font-medium">{formatDate(letter.deadlineDate)}</span>
            </div>
          </div>
        </div>

        {/* Status alert bar */}
        {(isOverdue || isUrgent || isDone) && (
          <div
            className={`mt-4 flex items-center gap-3 rounded-xl px-4 py-3 ${
              isOverdue
                ? 'border border-red-500/20 bg-red-500/10'
                : isUrgent
                  ? 'border border-amber-500/20 bg-amber-500/10'
                  : 'border border-emerald-500/20 bg-emerald-500/10'
            }`}
          >
            {isOverdue ? (
              <>
                <div className="rounded-full bg-red-500/20 p-1.5">
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                </div>
                <div>
                  <p className="font-medium text-red-300">Просрочено</p>
                  <p className="text-sm text-red-300/70">
                    на {Math.abs(daysLeft)} раб. {pluralizeDays(Math.abs(daysLeft))}
                  </p>
                </div>
              </>
            ) : isUrgent ? (
              <>
                <div className="rounded-full bg-amber-500/20 p-1.5">
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                </div>
                <div>
                  <p className="font-medium text-amber-300">Срочно</p>
                  <p className="text-sm text-amber-300/70">
                    осталось {daysLeft} раб. {pluralizeDays(daysLeft)}
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="rounded-full bg-emerald-500/20 p-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                </div>
                <div>
                  <p className="font-medium text-emerald-300">Выполнено</p>
                  <p className="text-sm text-emerald-300/70">
                    {letter.closeDate
                      ? `закрыто ${formatDate(letter.closeDate)}`
                      : 'задача завершена'}
                  </p>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
})
