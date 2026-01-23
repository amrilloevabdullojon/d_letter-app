'use client'

import { memo } from 'react'
import { List, LayoutGrid, Kanban } from 'lucide-react'
import type { ViewMode } from './letters-types'

interface LettersViewToggleProps {
  value: ViewMode
  onChange: (value: ViewMode) => void
}

export const LettersViewToggle = memo(function LettersViewToggle({
  value,
  onChange,
}: LettersViewToggleProps) {
  return (
    <div className="panel-soft panel-glass hidden rounded-xl p-1 sm:flex">
      <button
        onClick={() => onChange('table')}
        className={`rounded-lg p-2 transition focus-visible:ring-2 focus-visible:ring-teal-400/50 ${value === 'table' ? 'bg-white/10 text-white' : 'text-slate-300 hover:text-white'}`}
        title="Таблица"
        aria-label="Табличный вид"
      >
        <List className="h-5 w-5" />
      </button>
      <button
        onClick={() => onChange('cards')}
        className={`rounded-lg p-2 transition focus-visible:ring-2 focus-visible:ring-teal-400/50 ${value === 'cards' ? 'bg-white/10 text-white' : 'text-slate-300 hover:text-white'}`}
        title="Карточки"
        aria-label="Карточный вид"
      >
        <LayoutGrid className="h-5 w-5" />
      </button>
      <button
        onClick={() => onChange('kanban')}
        className={`rounded-lg p-2 transition focus-visible:ring-2 focus-visible:ring-teal-400/50 ${value === 'kanban' ? 'bg-white/10 text-white' : 'text-slate-300 hover:text-white'}`}
        title="Канбан"
        aria-label="Канбан"
      >
        <Kanban className="h-5 w-5" />
      </button>
    </div>
  )
})
