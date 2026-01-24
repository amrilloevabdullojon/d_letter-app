'use client'

import { memo } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Navigation } from 'lucide-react'
import type { Neighbors } from '../types'

interface LetterNavigationProps {
  neighbors: Neighbors | null
}

export const LetterNavigation = memo(function LetterNavigation({
  neighbors,
}: LetterNavigationProps) {
  const router = useRouter()

  const prevLetter = neighbors?.prev
  const nextLetter = neighbors?.next

  if (!prevLetter && !nextLetter) return null

  return (
    <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Navigation className="h-4 w-4 text-slate-400" />
        <h3 className="text-sm font-medium text-slate-300">Навигация</h3>
        <span className="ml-auto rounded bg-slate-700/50 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
          [ ]
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => prevLetter && router.push(`/letters/${prevLetter.id}`)}
          disabled={!prevLetter}
          className={`group flex flex-col items-start rounded-xl p-3 text-left transition ${
            prevLetter
              ? 'bg-slate-800/40 hover:bg-slate-700/50'
              : 'cursor-not-allowed bg-slate-800/20 opacity-40'
          }`}
        >
          <div className="mb-2 flex items-center gap-1.5">
            <ChevronLeft
              className={`h-4 w-4 transition ${prevLetter ? 'text-teal-400 group-hover:-translate-x-0.5' : 'text-slate-600'}`}
            />
            <span className="text-xs text-slate-500">Пред.</span>
          </div>
          <div className="w-full truncate font-mono text-xs text-slate-300">
            {prevLetter?.number || '—'}
          </div>
        </button>

        <button
          type="button"
          onClick={() => nextLetter && router.push(`/letters/${nextLetter.id}`)}
          disabled={!nextLetter}
          className={`group flex flex-col items-end rounded-xl p-3 text-right transition ${
            nextLetter
              ? 'bg-slate-800/40 hover:bg-slate-700/50'
              : 'cursor-not-allowed bg-slate-800/20 opacity-40'
          }`}
        >
          <div className="mb-2 flex items-center gap-1.5">
            <span className="text-xs text-slate-500">След.</span>
            <ChevronRight
              className={`h-4 w-4 transition ${nextLetter ? 'text-teal-400 group-hover:translate-x-0.5' : 'text-slate-600'}`}
            />
          </div>
          <div className="w-full truncate font-mono text-xs text-slate-300">
            {nextLetter?.number || '—'}
          </div>
        </button>
      </div>
    </div>
  )
})
