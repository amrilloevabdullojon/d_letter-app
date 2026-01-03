'use client'

import { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { LetterCard } from './LetterCard'
import { StatusBadge } from './StatusBadge'
import type { LetterStatus } from '@prisma/client'
import { ArrowDown, ArrowUp, ArrowUpDown, CheckSquare, Eye, Square } from 'lucide-react'
import { formatDate, getDaysUntilDeadline, isDoneStatus } from '@/lib/utils'

interface Letter {
  id: string
  number: string
  org: string
  date: Date | string
  deadlineDate: Date | string
  status: LetterStatus
  type?: string | null
  content?: string | null
  priority: number
  isFavorite?: boolean
  owner?: {
    name?: string | null
    email?: string | null
  } | null
  _count?: {
    comments: number
    watchers: number
  }
}

interface VirtualLetterListProps {
  letters: Letter[]
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  onToggleFavorite?: (id: string) => void
}

export function VirtualLetterList({
  letters,
  selectedIds,
  onToggleSelect,
  onToggleFavorite,
}: VirtualLetterListProps) {
  const parentRef = useRef<HTMLDivElement>(null)

  // ╨á╨░╤ü╤ç╤æ╤é ╨║╨╛╨╗╨╕╤ç╨╡╤ü╤é╨▓╨░ ╨║╨╛╨╗╨╛╨╜╨╛╨║ ╨▓ ╨╖╨░╨▓╨╕╤ü╨╕╨╝╨╛╤ü╤é╨╕ ╨╛╤é ╤ê╨╕╤Ç╨╕╨╜╤ï
  const getColumnCount = () => {
    if (typeof window === 'undefined') return 3
    if (window.innerWidth < 768) return 1
    if (window.innerWidth < 1024) return 2
    return 3
  }

  const columnCount = getColumnCount()
  const rowCount = Math.ceil(letters.length / columnCount)

  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 320, // ╨ƒ╤Ç╨╕╨╝╨╡╤Ç╨╜╨░╤Å ╨▓╤ï╤ü╨╛╤é╨░ ╨║╨░╤Ç╤é╨╛╤ç╨║╨╕
    overscan: 3,
  })

  return (
    <div
      ref={parentRef}
      className="h-[calc(100vh-320px)] sm:h-[calc(100vh-300px)] overflow-auto pr-1 sm:pr-2 virtual-scroll"
    >
      <div
        className="virtual-rows"
        style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const startIndex = virtualRow.index * columnCount
          const rowLetters = letters.slice(startIndex, startIndex + columnCount)

          return (
            <div
              key={virtualRow.key}
              className="virtual-row"
              style={{
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 px-0 sm:px-2 stagger-animation">
                {rowLetters.map((letter) => (
                  <div key={letter.id} className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onToggleSelect(letter.id)
                      }}
                      className={`absolute top-3 left-3 z-10 p-1 rounded ${
                        selectedIds.has(letter.id)
                          ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/30'
                          : 'bg-white/10 text-slate-300 opacity-0 group-hover:opacity-100'
                      }`}
                      aria-label={`╨Æ╤ï╨▒╤Ç╨░╤é╤î ╨┐╨╕╤ü╤î╨╝╨╛ ${letter.number}`}
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                    <LetterCard
                      letter={letter}
                      onToggleFavorite={onToggleFavorite}
                    />
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ╨Æ╨╕╤Ç╤é╤â╨░╨╗╨╕╨╖╨╛╨▓╨░╨╜╨╜╨░╤Å ╤é╨░╨▒╨╗╨╕╤å╨░
interface VirtualLetterTableProps {
  letters: Letter[]
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  onToggleSelectAll: () => void
  onSort: (field: string) => void
  sortField: string
  sortDirection: 'asc' | 'desc'
  focusedIndex: number
  onRowClick: (id: string) => void
  onPreview: (id: string) => void
}

export function VirtualLetterTable({
  letters,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onSort,
  sortField,
  sortDirection,
  focusedIndex,
  onRowClick,
  onPreview,
}: VirtualLetterTableProps) {
  const parentRef = useRef<HTMLDivElement>(null)

  const rowVirtualizer = useVirtualizer({
    count: letters.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60,
    overscan: 10,
  })

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <ArrowUpDown className="w-4 h-4 text-slate-400/70" />
    return sortDirection === 'asc'
      ? <ArrowUp className="w-4 h-4 text-teal-300" />
      : <ArrowDown className="w-4 h-4 text-teal-300" />
  }

  const formatDayLabel = (value: number) => (Math.abs(value) === 1 ? 'day' : 'days')

  const getDeadlineInfo = (letter: Letter) => {
    const daysLeft = getDaysUntilDeadline(letter.deadlineDate)
    const isDone = isDoneStatus(letter.status)

    if (isDone) {
      return { text: 'Done', className: 'text-teal-300' }
    }
    if (daysLeft < 0) {
      return {
        text: `Overdue by ${Math.abs(daysLeft)} ${formatDayLabel(daysLeft)}`,
        className: 'text-red-400',
      }
    }
    if (daysLeft <= 2) {
      return { text: `${daysLeft} ${formatDayLabel(daysLeft)}`, className: 'text-yellow-400' }
    }
    return { text: `${daysLeft} ${formatDayLabel(daysLeft)}`, className: 'text-slate-300/70' }
  }

  return (
    <div className="panel panel-glass rounded-2xl overflow-hidden">
      <div className="grid grid-cols-[40px_140px_minmax(240px,1fr)_120px_180px_140px_140px_160px_48px] gap-2 px-4 py-3 bg-white/5 text-sm text-slate-300/80 border-b border-white/10">
        <div className="flex items-center">
          <button
            onClick={onToggleSelectAll}
            className={`p-1 rounded ${
              selectedIds.size === letters.length && letters.length > 0
                ? 'text-teal-300'
                : 'text-slate-400 hover:text-white'
            }`}
            aria-label="Select all letters"
          >
            {selectedIds.size === letters.length && letters.length > 0 ? (
              <CheckSquare className="w-5 h-5" />
            ) : (
              <Square className="w-5 h-5" />
            )}
          </button>
        </div>
        <button
          onClick={() => onSort('number')}
          className="text-left hover:text-white flex items-center"
        >
          Number <SortIcon field="number" />
        </button>
        <button
          onClick={() => onSort('org')}
          className="text-left hover:text-white flex items-center"
        >
          Organization <SortIcon field="org" />
        </button>
        <button
          onClick={() => onSort('date')}
          className="text-left hover:text-white flex items-center"
        >
          Date <SortIcon field="date" />
        </button>
        <button
          onClick={() => onSort('deadline')}
          className="text-left hover:text-white flex items-center"
        >
          Deadline <SortIcon field="deadline" />
        </button>
        <button
          onClick={() => onSort('status')}
          className="text-left hover:text-white flex items-center"
        >
          Status <SortIcon field="status" />
        </button>
        <div className="text-left text-sm font-medium text-slate-300/70">
          Type
        </div>
        <div className="text-left text-sm font-medium text-slate-300/70">
          Assignee
        </div>
        <div />
      </div>

      <div ref={parentRef} className="h-[calc(100vh-350px)] overflow-auto virtual-scroll">
        <div className="virtual-rows" style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const letter = letters[virtualRow.index]
            const deadlineInfo = getDeadlineInfo(letter)
            const isSelected = selectedIds.has(letter.id)
            const isFocused = virtualRow.index === focusedIndex

            return (
              <div
                key={virtualRow.key}
                className={`virtual-row grid grid-cols-[40px_140px_minmax(240px,1fr)_120px_180px_140px_140px_160px_48px] gap-2 px-4 py-3 border-b border-white/5 text-sm cursor-pointer app-row ${
                  isSelected ? 'app-row-selected' : ''
                } ${isFocused ? 'ring-2 ring-teal-400/40 ring-inset' : ''}`}
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                onClick={() => onRowClick(letter.id)}
              >
                <div className="flex items-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onToggleSelect(letter.id)
                    }}
                    className={`p-1 rounded ${
                      isSelected ? 'text-teal-300' : 'text-slate-400 hover:text-white'
                    }`}
                    aria-label={`Select letter ${letter.number}`}
                  >
                    {isSelected ? (
                      <CheckSquare className="w-5 h-5" />
                    ) : (
                      <Square className="w-5 h-5" />
                    )}
                  </button>
                </div>
                <div className="text-teal-300 font-mono truncate">
                  #{letter.number}
                </div>
                <div className="text-white truncate">
                  {letter.org}
                </div>
                <div className="text-slate-300/70 text-sm">
                  {formatDate(letter.date)}
                </div>
                <div>
                  <div className="text-sm">
                    <div className="text-slate-300/70">{formatDate(letter.deadlineDate)}</div>
                    <div className={`text-xs ${deadlineInfo.className}`}>
                      {deadlineInfo.text}
                    </div>
                  </div>
                </div>
                <div>
                  <StatusBadge status={letter.status} size="sm" />
                </div>
                <div>
                  {letter.type && (
                    <span className="text-xs px-2 py-1 rounded-full data-pill">
                      {letter.type}
                    </span>
                  )}
                </div>
                <div className="text-slate-300/70 text-sm truncate">
                  {letter.owner?.name || letter.owner?.email?.split('@')[0] || '-'}
                </div>
                <div className="flex items-center justify-end">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onPreview(letter.id)
                    }}
                    className="p-1 text-slate-400 hover:text-white transition"
                    title="Quick preview"
                    aria-label="Quick preview"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
