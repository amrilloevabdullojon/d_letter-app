'use client'

import { memo, useRef, useEffect, useState, useCallback } from 'react'
import { Bookmark, ChevronDown, X } from 'lucide-react'
import type { SavedView } from './letters-types'

interface LettersSavedViewsProps {
  views: SavedView[]
  activeViewId: string | null
  onApply: (view: SavedView) => void
  onSave: (name: string) => void
  onDelete: (id: string) => void
}

export const LettersSavedViews = memo(function LettersSavedViews({
  views,
  activeViewId,
  onApply,
  onSave,
  onDelete,
}: LettersSavedViewsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [newViewName, setNewViewName] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const handleClick = (event: MouseEvent) => {
      if (!containerRef.current) return
      if (!containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    window.addEventListener('mousedown', handleClick)
    return () => window.removeEventListener('mousedown', handleClick)
  }, [isOpen])

  const handleSave = useCallback(() => {
    const name = newViewName.trim()
    if (!name) return
    onSave(name)
    setNewViewName('')
    setIsOpen(false)
  }, [newViewName, onSave])

  return (
    <div ref={containerRef} className="relative hidden sm:block">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={`inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm transition ${
          isOpen ? 'bg-white/10 text-white' : 'bg-white/5 text-slate-300 hover:text-white'
        }`}
        aria-expanded={isOpen}
      >
        <Bookmark className="h-4 w-4" />
        Виды
        <ChevronDown className="h-4 w-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 z-30 mt-2 w-64 overflow-hidden rounded-xl border border-slate-800/70 bg-slate-950/95 shadow-2xl shadow-black/40 backdrop-blur">
          <div className="border-b border-slate-800/70 px-3 py-2 text-xs text-slate-400">
            Сохранённые виды
          </div>
          <div className="max-h-64 overflow-auto">
            {views.length === 0 ? (
              <div className="px-3 py-4 text-xs text-slate-500">Нет сохранённых видов</div>
            ) : (
              views.map((view) => (
                <div
                  key={view.id}
                  className="flex items-center gap-2 border-b border-slate-900/60 px-3 py-2"
                >
                  <button
                    type="button"
                    onClick={() => {
                      onApply(view)
                      setIsOpen(false)
                    }}
                    className="flex-1 truncate text-left text-sm text-slate-200 transition hover:text-white"
                  >
                    {view.name}
                  </button>
                  {activeViewId === view.id && (
                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-300">
                      Активен
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      onDelete(view.id)
                    }}
                    className="text-slate-500 transition hover:text-red-300"
                    aria-label="Удалить вид"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
          <div className="border-t border-slate-800/70 px-3 py-3">
            <input
              value={newViewName}
              onChange={(e) => setNewViewName(e.target.value)}
              placeholder="Название вида"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-white placeholder-slate-500"
            />
            <button
              onClick={handleSave}
              disabled={!newViewName.trim()}
              className="mt-2 w-full rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-medium text-emerald-200 transition hover:bg-emerald-500/30 disabled:opacity-50"
            >
              Сохранить текущий вид
            </button>
          </div>
        </div>
      )}
    </div>
  )
})
