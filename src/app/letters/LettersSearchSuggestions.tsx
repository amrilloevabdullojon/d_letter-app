'use client'

import { memo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { STATUS_LABELS, getWorkingDaysUntilDeadline, pluralizeDays } from '@/lib/utils'
import type { SearchSuggestion } from './letters-types'

interface LettersSearchSuggestionsProps {
  search: string
  suggestions: SearchSuggestion[]
  recentSearches: string[]
  isLoading: boolean
  onSelectRecent: (value: string) => void
  onClearRecent: () => void
}

export const LettersSearchSuggestions = memo(function LettersSearchSuggestions({
  search,
  suggestions,
  recentSearches,
  isLoading,
  onSelectRecent,
  onClearRecent,
}: LettersSearchSuggestionsProps) {
  const router = useRouter()

  const renderHighlightedText = useCallback((value: string, query: string) => {
    const trimmed = query.trim()
    if (!trimmed) return value
    const lowerValue = value.toLowerCase()
    const lowerQuery = trimmed.toLowerCase()
    const index = lowerValue.indexOf(lowerQuery)
    if (index === -1) return value
    const before = value.slice(0, index)
    const match = value.slice(index, index + trimmed.length)
    const after = value.slice(index + trimmed.length)
    return (
      <>
        {before}
        <span className="text-emerald-200">{match}</span>
        {after}
      </>
    )
  }, [])

  const trimmedSearch = search.trim()

  return (
    <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-xl border border-slate-800/70 bg-slate-950/95 shadow-2xl shadow-black/40 backdrop-blur">
      <div className="flex items-center justify-between border-b border-slate-800/70 px-3 py-2 text-xs text-slate-400">
        <span>{trimmedSearch ? 'Подсказки' : 'Последние поиски'}</span>
        {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      </div>
      <div className="max-h-64 overflow-auto">
        {!trimmedSearch ? (
          recentSearches.length === 0 ? (
            <div className="px-3 py-4 text-xs text-slate-500">Пока нет истории поиска</div>
          ) : (
            <div className="space-y-1 px-3 py-2">
              {recentSearches.map((item) => (
                <button
                  key={item}
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault()
                    onSelectRecent(item)
                  }}
                  className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm text-slate-200 transition hover:bg-slate-900/60"
                >
                  <span className="truncate">{item}</span>
                  <span className="text-[10px] text-slate-500">Поиск</span>
                </button>
              ))}
              <button
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault()
                  onClearRecent()
                }}
                className="mt-1 w-full rounded-lg px-2 py-1.5 text-left text-[11px] text-slate-500 transition hover:text-slate-200"
              >
                Очистить историю
              </button>
            </div>
          )
        ) : suggestions.length === 0 ? (
          <div className="px-3 py-4 text-xs text-slate-500">
            <div>Ничего не найдено</div>
            <div className="mt-2 text-[11px] text-slate-600">
              Попробуйте: номер, организация, Jira
            </div>
          </div>
        ) : (
          suggestions.map((item) => {
            const daysLeft = getWorkingDaysUntilDeadline(item.deadlineDate)
            const tone =
              daysLeft < 0 ? 'text-red-400' : daysLeft <= 2 ? 'text-yellow-400' : 'text-emerald-300'

            return (
              <button
                key={item.id}
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault()
                  router.push(`/letters/${item.id}`)
                }}
                className="flex w-full flex-col gap-1 border-b border-slate-900/60 px-3 py-2 text-left text-sm transition hover:bg-slate-900/70"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-teal-300">№-{item.number}</span>
                  <span className={`text-[11px] ${tone}`}>
                    {daysLeft} раб. {pluralizeDays(daysLeft)}
                  </span>
                </div>
                <div className="truncate text-xs text-slate-300">
                  {renderHighlightedText(item.org, search)}
                </div>
                <div className="text-[11px] text-slate-500">{STATUS_LABELS[item.status]}</div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
})
