'use client'

import { memo } from 'react'
import { ScrollIndicator } from '@/components/mobile/ScrollIndicator'
import {
  List,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Star,
  UserCheck,
  UserMinus,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type QuickFilterItem = {
  value: string
  label: string
  icon: LucideIcon
}

export const QUICK_FILTERS: QuickFilterItem[] = [
  { value: '', label: 'Все письма', icon: List },
  { value: 'mine', label: 'Мои письма', icon: UserCheck },
  { value: 'unassigned', label: 'Без исполнителя', icon: UserMinus },
  { value: 'favorites', label: 'Избранные', icon: Star },
  { value: 'overdue', label: 'Просроченные', icon: AlertTriangle },
  { value: 'urgent', label: 'Срочно (3 раб. дня)', icon: Clock },
  { value: 'active', label: 'В работе', icon: XCircle },
  { value: 'done', label: 'Завершённые', icon: CheckCircle },
]

interface LettersQuickFiltersProps {
  value: string
  onChange: (value: string) => void
}

export const LettersQuickFilters = memo(function LettersQuickFilters({
  value,
  onChange,
}: LettersQuickFiltersProps) {
  return (
    <div className="panel-soft panel-glass mb-4 rounded-2xl p-2">
      <ScrollIndicator className="no-scrollbar flex gap-2 sm:flex-wrap" showArrows={true}>
        {QUICK_FILTERS.map((filter) => {
          const Icon = filter.icon
          return (
            <button
              key={filter.value}
              onClick={() => onChange(filter.value)}
              className={`app-chip tap-highlight touch-target-sm inline-flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm transition focus-visible:ring-2 focus-visible:ring-teal-400/50 md:px-3 md:py-1.5 ${value === filter.value ? 'app-chip-active' : ''}`}
              aria-pressed={value === filter.value}
              aria-label={filter.label}
            >
              <Icon className="h-4 w-4" />
              {filter.label}
            </button>
          )
        })}
      </ScrollIndicator>
    </div>
  )
})
