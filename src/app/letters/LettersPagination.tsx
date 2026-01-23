'use client'

import { memo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Pagination } from './letters-types'

interface LettersPaginationProps {
  pagination: Pagination
  page: number
  limit: number
  totalPages: number
  hasPrev: boolean
  hasNext: boolean
  onPrev: () => void
  onNext: () => void
  onPrefetchPage?: (page: number) => void
}

export const LettersPagination = memo(function LettersPagination({
  pagination,
  page,
  limit,
  totalPages,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  onPrefetchPage,
}: LettersPaginationProps) {
  if (pagination.totalPages <= 1) return null

  return (
    <div className="mt-6 flex flex-col items-center justify-between gap-3 sm:flex-row">
      <div className="text-sm text-slate-300/70">{`Показано ${(page - 1) * limit + 1}-${Math.min(page * limit, pagination.total)} из ${pagination.total}`}</div>
      <div className="flex items-center gap-2">
        <button
          onClick={onPrev}
          onMouseEnter={() => hasPrev && onPrefetchPage?.(page - 1)}
          disabled={!hasPrev}
          className="tap-highlight touch-target rounded-lg border border-white/10 bg-white/5 p-2 text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Предыдущая страница"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <span className="px-2 text-slate-300/70">
          {page} / {totalPages}
        </span>

        <button
          onClick={onNext}
          onMouseEnter={() => hasNext && onPrefetchPage?.(page + 1)}
          disabled={!hasNext}
          className="tap-highlight touch-target rounded-lg border border-white/10 bg-white/5 p-2 text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Следующая страница"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
})
