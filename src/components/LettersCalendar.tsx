'use client'

import { useState, useMemo, useRef } from 'react'
import { DayPicker } from 'react-day-picker'
import { ru } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import type { Letter } from '@/app/letters/letters-types'
import { getWorkingDaysUntilDeadline } from '@/lib/utils'
import { STATUS_LABELS } from '@/lib/utils'

interface LettersCalendarProps {
  letters: Letter[]
  onLetterClick: (id: string) => void
}

function toDateKey(dateStr: string): string {
  return dateStr.split('T')[0]
}

export function LettersCalendar({ letters, onLetterClick }: LettersCalendarProps) {
  const [month, setMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const nowRef = useRef(new Date())

  // Group letters by deadline date key
  const lettersByDate = useMemo(() => {
    const map = new Map<string, Letter[]>()
    for (const letter of letters) {
      if (!letter.deadlineDate) continue
      const key = toDateKey(letter.deadlineDate)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(letter)
    }
    return map
  }, [letters])

  const now = nowRef.current

  // Build modifier date sets
  const { overdueModifier, urgentModifier, normalModifier } = useMemo(() => {
    const overdue: Date[] = []
    const urgent: Date[] = []
    const normal: Date[] = []

    for (const [key, dayLetters] of lettersByDate.entries()) {
      const date = new Date(key + 'T00:00:00')
      const hasActive = dayLetters.some(
        (l) =>
          l.status !== 'DONE' &&
          l.status !== 'PROCESSED' &&
          l.status !== 'READY' &&
          l.status !== 'FROZEN' &&
          l.status !== 'REJECTED'
      )
      if (!hasActive) {
        normal.push(date)
        continue
      }
      const daysLeft = getWorkingDaysUntilDeadline(date, now)
      if (daysLeft < 0) {
        overdue.push(date)
      } else if (daysLeft <= 3) {
        urgent.push(date)
      } else {
        normal.push(date)
      }
    }

    return { overdueModifier: overdue, urgentModifier: urgent, normalModifier: normal }
  }, [lettersByDate, now])

  const selectedKey = selectedDay ? toDateKey(selectedDay.toISOString()) : null
  const selectedLetters = selectedKey ? (lettersByDate.get(selectedKey) ?? []) : []

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      {/* Calendar */}
      <div className="panel panel-glass rounded-2xl p-4">
        <DayPicker
          mode="single"
          locale={ru}
          month={month}
          onMonthChange={setMonth}
          selected={selectedDay ?? undefined}
          onSelect={(day: Date | undefined) => setSelectedDay(day ?? null)}
          modifiers={{
            overdue: overdueModifier,
            urgent: urgentModifier,
            normal: normalModifier,
          }}
          modifiersClassNames={{
            overdue: 'rdp-day-overdue',
            urgent: 'rdp-day-urgent',
            normal: 'rdp-day-normal',
          }}
          components={{
            Chevron: ({ orientation, ...props }) => {
              if (orientation === 'left')
                return <ChevronLeft className="h-4 w-4" {...(props as object)} />
              return <ChevronRight className="h-4 w-4" {...(props as object)} />
            },
          }}
          classNames={{
            root: 'w-full',
            months: 'flex flex-col',
            month: 'w-full',
            nav: 'flex items-center justify-between mb-3',
            button_previous:
              'p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition',
            button_next:
              'p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition',
            month_caption: 'text-center text-sm font-semibold text-white capitalize',
            caption_label: 'text-sm font-semibold text-white',
            table: 'w-full border-collapse',
            weekdays: 'flex',
            weekday: 'flex-1 text-center text-xs text-slate-500 py-1 select-none',
            week: 'flex mt-1',
            day: 'flex-1 aspect-square relative',
            day_button: [
              'w-full h-full rounded-lg text-sm transition select-none',
              'hover:bg-slate-700 text-slate-300',
              'aria-selected:bg-teal-500/30 aria-selected:text-teal-200',
            ].join(' '),
            today: 'font-bold text-white',
            outside: 'text-slate-700',
            selected: '',
            hidden: 'invisible',
          }}
          footer={
            <style>{`
              .rdp-day-overdue .rdp-day_button,
              .rdp-day-overdue button { position: relative; }
              .rdp-day-overdue button::after,
              .rdp-day-urgent button::after,
              .rdp-day-normal button::after {
                content: '';
                position: absolute;
                bottom: 3px;
                left: 50%;
                transform: translateX(-50%);
                width: 5px;
                height: 5px;
                border-radius: 50%;
              }
              .rdp-day-overdue button::after { background: #f87171; }
              .rdp-day-urgent button::after { background: #fbbf24; }
              .rdp-day-normal button::after { background: #2dd4bf; }
            `}</style>
          }
        />

        {/* Legend */}
        <div className="mt-3 flex flex-wrap gap-3 border-t border-slate-700/50 pt-3 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-red-400" />
            Просрочено
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
            ≤3 дня
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-teal-400" />В срок
          </span>
        </div>
      </div>

      {/* Day panel */}
      {selectedDay && (
        <div className="panel panel-glass flex-1 rounded-2xl p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">
              {selectedDay.toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}{' '}
              <span className="font-normal text-slate-400">
                ({selectedLetters.length}{' '}
                {selectedLetters.length === 1
                  ? 'письмо'
                  : selectedLetters.length < 5
                    ? 'письма'
                    : 'писем'}
                )
              </span>
            </h3>
            <button
              type="button"
              onClick={() => setSelectedDay(null)}
              className="rounded-lg p-1 text-slate-400 transition hover:text-white"
              aria-label="Закрыть"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {selectedLetters.length === 0 ? (
            <p className="text-sm text-slate-500">Нет писем с дедлайном в этот день</p>
          ) : (
            <ul className="space-y-2">
              {selectedLetters.map((letter) => {
                const daysLeft = getWorkingDaysUntilDeadline(new Date(letter.deadlineDate), now)
                const isTerminal =
                  letter.status === 'DONE' ||
                  letter.status === 'PROCESSED' ||
                  letter.status === 'READY' ||
                  letter.status === 'FROZEN' ||
                  letter.status === 'REJECTED'
                const isOverdue = !isTerminal && daysLeft < 0
                const isUrgent = !isTerminal && !isOverdue && daysLeft <= 3

                return (
                  <li key={letter.id}>
                    <button
                      type="button"
                      onClick={() => onLetterClick(letter.id)}
                      className="w-full overflow-hidden rounded-xl border border-slate-700/50 bg-slate-800/50 p-3 text-left transition hover:border-teal-500/40 hover:bg-slate-700/50"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-white">
                            №{letter.number} — {letter.org}
                          </p>
                          {letter.content && (
                            <p className="mt-0.5 line-clamp-2 text-xs text-slate-400">
                              {letter.content}
                            </p>
                          )}
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <span className="rounded-full bg-slate-700/60 px-2 py-0.5 text-xs text-slate-300">
                            {STATUS_LABELS[letter.status] ?? letter.status}
                          </span>
                          {isOverdue && (
                            <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs text-red-400">
                              просрочено
                            </span>
                          )}
                          {isUrgent && (
                            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-400">
                              срочно
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
