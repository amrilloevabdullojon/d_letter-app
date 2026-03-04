'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, Clock, FileText, UserMinus, ArrowRight } from 'lucide-react'
import { StatusBadge } from '@/components/StatusBadge'
import { formatDate, getWorkingDaysUntilDeadline, pluralizeDays } from '@/lib/utils'
import type { LetterStatus } from '@/types/prisma'

type Letter = {
  id: string
  number: string
  org: string
  date: Date | string
  deadlineDate: Date | string
  status: LetterStatus
  type: string | null
  owner: { name: string | null; email: string | null } | null
}

interface DashboardLetterTabsProps {
  overdueLetters: Letter[]
  urgentLetters: Letter[]
  recentLetters: Letter[]
  unassignedLetters: Letter[]
  isAdmin: boolean
}

interface TabDef {
  id: string
  label: string
  count?: number
  Icon: React.ElementType
  textColor: string
  bgColor: string
  borderColor: string
  badgeBg: string
  href: string
  letters: Letter[]
  emptyText: string
}

export function DashboardLetterTabs({
  overdueLetters,
  urgentLetters,
  recentLetters,
  unassignedLetters,
  isAdmin,
}: DashboardLetterTabsProps) {
  const allTabs: (TabDef | null)[] = [
    overdueLetters.length > 0
      ? {
          id: 'overdue',
          label: 'Просрочено',
          count: overdueLetters.length,
          Icon: AlertTriangle,
          textColor: 'text-red-400',
          bgColor: 'bg-red-500/10',
          borderColor: 'bg-red-400',
          badgeBg: 'bg-red-500/20 text-red-400',
          href: '/letters?filter=overdue',
          letters: overdueLetters,
          emptyText: 'Просроченных нет',
        }
      : null,
    urgentLetters.length > 0
      ? {
          id: 'urgent',
          label: 'Срочные',
          count: urgentLetters.length,
          Icon: Clock,
          textColor: 'text-amber-400',
          bgColor: 'bg-amber-500/10',
          borderColor: 'bg-amber-400',
          badgeBg: 'bg-amber-500/20 text-amber-400',
          href: '/letters?filter=urgent',
          letters: urgentLetters,
          emptyText: 'Срочных нет',
        }
      : null,
    {
      id: 'recent',
      label: 'Последние',
      Icon: FileText,
      textColor: 'text-teal-400',
      bgColor: 'bg-teal-500/10',
      borderColor: 'bg-teal-400',
      badgeBg: 'bg-teal-500/20 text-teal-400',
      href: '/letters',
      letters: recentLetters,
      emptyText: 'Нет писем',
    },
    isAdmin && unassignedLetters.length > 0
      ? {
          id: 'unassigned',
          label: 'Без исполнителя',
          count: unassignedLetters.length,
          Icon: UserMinus,
          textColor: 'text-sky-400',
          bgColor: 'bg-sky-500/10',
          borderColor: 'bg-sky-400',
          badgeBg: 'bg-sky-500/20 text-sky-400',
          href: '/letters?filter=unassigned',
          letters: unassignedLetters,
          emptyText: 'Все письма назначены',
        }
      : null,
  ]

  const tabs = allTabs.filter(Boolean) as TabDef[]

  // Дефолтный таб — первый с проблемами, иначе «Последние»
  const defaultId =
    tabs.find((t) => t.id === 'overdue')?.id ||
    tabs.find((t) => t.id === 'urgent')?.id ||
    tabs[0]?.id ||
    'recent'

  const [activeId, setActiveId] = useState(defaultId)

  const active = tabs.find((t) => t.id === activeId) ?? tabs[0]

  if (!active) return null

  return (
    <div className="panel panel-glass overflow-hidden rounded-2xl">
      {/* Tab bar */}
      <div className="flex items-center border-b border-white/10 px-2">
        {tabs.map((tab) => {
          const isActive = tab.id === activeId
          const { Icon } = tab
          return (
            <button
              key={tab.id}
              onClick={() => setActiveId(tab.id)}
              className={`relative flex items-center gap-2 px-3 py-3.5 text-sm font-medium transition-colors ${
                isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon
                className={`h-4 w-4 transition-colors ${isActive ? tab.textColor : 'text-slate-500'}`}
              />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-xs font-semibold transition-colors ${
                    isActive ? tab.badgeBg : 'bg-white/10 text-slate-500'
                  }`}
                >
                  {tab.count}
                </span>
              )}
              {/* Active underline */}
              {isActive && (
                <span
                  className={`absolute bottom-0 left-2 right-2 h-0.5 rounded-full ${tab.borderColor}`}
                />
              )}
            </button>
          )
        })}

        {/* "All" link aligned right */}
        <Link
          href={active.href}
          className="ml-auto flex items-center gap-1 px-3 py-3.5 text-xs text-slate-400 transition-colors hover:text-slate-200"
        >
          Все <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Letter list */}
      <div className="divide-y divide-white/5">
        {active.letters.length > 0 ? (
          active.letters.map((letter) => {
            const days = getWorkingDaysUntilDeadline(letter.deadlineDate)
            const isOverdue = days < 0
            const absDays = Math.abs(days)

            return (
              <Link
                key={letter.id}
                href={`/letters/${letter.id}`}
                className="group flex items-center justify-between gap-3 p-4 transition hover:bg-white/5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="shrink-0 font-mono text-sm text-teal-400">№{letter.number}</span>
                  <StatusBadge status={letter.status} size="sm" />
                  <p className="truncate text-sm text-slate-200 group-hover:text-white">
                    {letter.org}
                  </p>
                </div>
                <span
                  className={`shrink-0 text-xs tabular-nums ${
                    isOverdue
                      ? 'text-red-400'
                      : days <= 1
                        ? 'text-amber-400'
                        : activeId === 'recent' || activeId === 'unassigned'
                          ? 'text-slate-500'
                          : 'text-slate-400'
                  }`}
                >
                  {isOverdue
                    ? `−${absDays} раб. ${pluralizeDays(absDays)}`
                    : activeId === 'recent' || activeId === 'unassigned'
                      ? formatDate(letter.date)
                      : `${days} раб. ${pluralizeDays(days)}`}
                </span>
              </Link>
            )
          })
        ) : (
          <div className="py-10 text-center text-sm text-slate-500">{active.emptyText}</div>
        )}
      </div>
    </div>
  )
}
