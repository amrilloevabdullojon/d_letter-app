'use client'

import { memo } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  Info,
  MessageSquare,
  UserPlus,
} from 'lucide-react'
import { formatDate, pluralizeDays } from '@/lib/utils'
import { hapticLight, hapticMedium } from '@/lib/haptic'

type UnifiedKind =
  | 'NEW_LETTER'
  | 'COMMENT'
  | 'STATUS'
  | 'ASSIGNMENT'
  | 'SYSTEM'
  | 'DEADLINE_OVERDUE'
  | 'DEADLINE_URGENT'

interface NotificationLetter {
  id: string
  number: string
  org: string
  deadlineDate?: string
  owner?: { id: string; name: string | null; email: string | null } | null
}

export interface NotificationGroupItem {
  id: string
  kind: UnifiedKind
  title: string
  body?: string | null
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL' | null
  createdAt: string
  isRead?: boolean
  letter?: NotificationLetter | null
  daysLeft?: number
  count: number
  ids: string[]
  unreadCount: number
}

interface NotificationCardProps {
  notif: NotificationGroupItem
  showPreviews: boolean
  showOrganizations: boolean
  canManageLetters: boolean
  currentUserId?: string
  onMarkRead: (ids: string[]) => void
  onSnooze: (letterId: string) => void
  onAssignToMe: (letterId: string) => void
  onClose: () => void
  normalizeText: (value?: string | null) => string
  isCorruptedText: (value: string) => boolean
}

const isDeadlineKind = (kind: UnifiedKind) =>
  kind === 'DEADLINE_OVERDUE' || kind === 'DEADLINE_URGENT'

const getKindLabel = (kind: UnifiedKind) => {
  switch (kind) {
    case 'NEW_LETTER':
      return 'Новые письма'
    case 'COMMENT':
      return 'Комментарий'
    case 'STATUS':
      return 'Статус'
    case 'ASSIGNMENT':
      return 'Назначение'
    case 'SYSTEM':
      return 'Системное'
    case 'DEADLINE_OVERDUE':
      return 'Просрочено'
    case 'DEADLINE_URGENT':
      return 'Скоро дедлайн'
    default:
      return ''
  }
}

const getIcon = (kind: UnifiedKind) => {
  const cls = 'w-4 h-4'
  switch (kind) {
    case 'NEW_LETTER':
      return { icon: FileText, color: 'text-emerald-300', bg: 'bg-emerald-500/20', cls }
    case 'COMMENT':
      return { icon: MessageSquare, color: 'text-sky-400', bg: 'bg-sky-500/20', cls }
    case 'STATUS':
      return { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/20', cls }
    case 'ASSIGNMENT':
      return { icon: UserPlus, color: 'text-purple-400', bg: 'bg-purple-500/20', cls }
    case 'SYSTEM':
      return { icon: Info, color: 'text-slate-300', bg: 'bg-slate-800/80', cls }
    case 'DEADLINE_OVERDUE':
      return { icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/20', cls }
    case 'DEADLINE_URGENT':
      return { icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/20', cls }
    default:
      return { icon: Bell, color: 'text-slate-300', bg: 'bg-slate-800/80', cls }
  }
}

function NotificationCardInner({
  notif,
  showPreviews,
  showOrganizations,
  canManageLetters,
  currentUserId,
  onMarkRead,
  onSnooze,
  onAssignToMe,
  onClose,
  normalizeText,
  isCorruptedText,
}: NotificationCardProps) {
  const iconConfig = getIcon(notif.kind)
  const Icon = iconConfig.icon
  const isUnread = !isDeadlineKind(notif.kind) && notif.unreadCount > 0
  const linkTarget = notif.letter?.id ? `/letters/${notif.letter.id}` : '/letters'

  const bodyRaw = normalizeText(notif.body)
  const body = bodyRaw && !isCorruptedText(bodyRaw) ? bodyRaw : ''
  const orgRaw = normalizeText(notif.letter?.org)
  const org = orgRaw && !isCorruptedText(orgRaw) ? orgRaw : ''

  const accentTone = isDeadlineKind(notif.kind)
    ? notif.kind === 'DEADLINE_OVERDUE'
      ? 'bg-red-500/70'
      : 'bg-yellow-400/70'
    : isUnread
      ? 'bg-emerald-400/70'
      : 'bg-slate-700/60'

  const cardTone = isDeadlineKind(notif.kind)
    ? notif.kind === 'DEADLINE_OVERDUE'
      ? 'border-red-500/35 bg-red-500/10 shadow-[0_12px_30px_-20px_rgba(248,113,113,0.4)]'
      : 'border-yellow-500/35 bg-yellow-500/10 shadow-[0_12px_30px_-20px_rgba(250,204,21,0.35)]'
    : isUnread
      ? 'border-emerald-500/35 bg-emerald-500/10 shadow-[0_12px_30px_-22px_rgba(16,185,129,0.35)]'
      : 'border-slate-800/70 bg-slate-900/50'

  const priorityBadge = isDeadlineKind(notif.kind)
    ? {
        label: notif.kind === 'DEADLINE_OVERDUE' ? 'Критично' : 'Срочно',
        className:
          notif.kind === 'DEADLINE_OVERDUE'
            ? 'border-red-500/40 bg-red-500/15 text-red-200'
            : 'border-yellow-500/40 bg-yellow-500/15 text-yellow-200',
      }
    : isUnread && notif.kind === 'ASSIGNMENT'
      ? {
          label: 'Важное',
          className: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200',
        }
      : null

  const renderTitle = () => {
    if (!isDeadlineKind(notif.kind)) {
      const normalizedTitle = normalizeText(notif.title)
      if (!normalizedTitle || isCorruptedText(normalizedTitle)) {
        const number = notif.letter?.number ? `№${notif.letter.number}` : ''
        const suffix = number ? ` ${number}` : ''
        switch (notif.kind) {
          case 'COMMENT':
            return `Новый комментарий к письму${suffix}`
          case 'STATUS':
            return `Статус письма${suffix} изменен`
          case 'ASSIGNMENT':
            return `Вам назначено письмо${suffix}`
          case 'SYSTEM':
            return 'Системное уведомление'
          default:
            return notif.title || 'Уведомление'
        }
      }
      return normalizedTitle
    }
    const days = notif.daysLeft ?? 0
    if (notif.kind === 'DEADLINE_OVERDUE') {
      const absDays = Math.abs(days)
      return `Просрочено на ${absDays} раб. ${pluralizeDays(absDays)}`
    }
    return `До дедлайна ${days} раб. ${pluralizeDays(days)}`
  }

  const renderMeta = () => {
    if (isDeadlineKind(notif.kind)) {
      return <span>Дедлайн: {formatDate(notif.letter?.deadlineDate || '')}</span>
    }
    return <span>{new Date(notif.createdAt).toLocaleString('ru-RU')}</span>
  }

  return (
    <Link
      href={linkTarget}
      onClick={() => {
        hapticLight()
        if (!isDeadlineKind(notif.kind)) {
          onMarkRead(notif.ids)
        }
        onClose()
      }}
      className={`tap-highlight group relative flex items-start gap-3 overflow-hidden rounded-2xl border px-4 py-3 transition ${cardTone} hover:-translate-y-0.5 hover:border-slate-600/70 hover:bg-slate-800/70`}
    >
      <span className={`absolute left-0 top-0 h-full w-1 ${accentTone}`} />
      <div className={`rounded-lg p-2 ring-1 ring-white/10 ${iconConfig.bg} ${iconConfig.color}`}>
        <Icon className={iconConfig.cls} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">{renderTitle()}</span>
          {notif.count > 1 && (
            <span className="rounded-full border border-slate-700/70 bg-slate-800/80 px-2 py-0.5 text-[10px] text-slate-200">
              x{notif.count}
            </span>
          )}
          {isUnread && <span className="h-2 w-2 rounded-full bg-emerald-400" />}
        </div>
        {showPreviews && body && (
          <div className="mt-1 line-clamp-2 text-xs text-slate-300">{body}</div>
        )}
        {showOrganizations && org && (
          <div className="mt-1 truncate text-xs text-slate-400">{org}</div>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span>{getKindLabel(notif.kind)}</span>
          <span className="text-slate-600">•</span>
          {renderMeta()}
          {priorityBadge && (
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] ${priorityBadge.className}`}
            >
              {priorityBadge.label}
            </span>
          )}
          {notif.letter?.number && (
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] text-emerald-200">
              №{notif.letter.number}
            </span>
          )}
        </div>
        <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
          {!isDeadlineKind(notif.kind) && notif.unreadCount > 0 && (
            <button
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                hapticLight()
                onMarkRead(notif.ids)
              }}
              className="tap-highlight rounded-full bg-slate-800/80 px-2.5 py-1 text-slate-200 transition hover:bg-slate-700"
            >
              Отметить прочитанным
            </button>
          )}
          {isDeadlineKind(notif.kind) && notif.letter?.id && (
            <button
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                hapticLight()
                if (notif.letter?.id) {
                  onSnooze(notif.letter.id)
                }
              }}
              className="tap-highlight rounded-full bg-slate-800/80 px-2.5 py-1 text-slate-200 transition hover:bg-slate-700"
            >
              Скрыть до завтра
            </button>
          )}
          {canManageLetters && currentUserId && notif.letter?.id && !notif.letter?.owner && (
            <button
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                hapticMedium()
                onAssignToMe(notif.letter!.id)
              }}
              className="tap-highlight rounded-full bg-emerald-500/15 px-2.5 py-1 text-emerald-200 transition hover:bg-emerald-500/25"
            >
              Назначить меня
            </button>
          )}
        </div>
      </div>
      <ChevronRight className="h-4 w-4 flex-shrink-0 text-slate-500 transition group-hover:text-slate-300" />
    </Link>
  )
}

export const NotificationCard = memo(NotificationCardInner)
