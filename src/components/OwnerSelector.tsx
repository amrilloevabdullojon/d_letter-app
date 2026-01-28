'use client'

import { useState, useRef, useEffect, memo } from 'react'
import { User, ChevronDown, Check, X, Search, Loader2, UserX } from 'lucide-react'

export interface OwnerOption {
  id: string
  name: string | null
  email: string | null
  image?: string | null
}

interface OwnerSelectorProps {
  currentOwner: OwnerOption | null
  users: OwnerOption[]
  onSelect: (userId: string | null) => Promise<void>
  disabled?: boolean
  canEdit?: boolean
  compact?: boolean
  placeholder?: string
}

export const OwnerSelector = memo(function OwnerSelector({
  currentOwner,
  users,
  onSelect,
  disabled = false,
  canEdit = true,
  compact = false,
  placeholder = 'Выбрать исполнителя',
}: OwnerSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Закрытие dropdown при клике вне компонента
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearch('')
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Фокус на input при открытии
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const handleSelect = async (userId: string | null) => {
    if (disabled || saving) return
    setSaving(true)
    try {
      await onSelect(userId)
      setIsOpen(false)
      setSearch('')
    } finally {
      setSaving(false)
    }
  }

  const filteredUsers = users.filter((user) => {
    if (!search.trim()) return true
    const query = search.toLowerCase()
    return user.name?.toLowerCase().includes(query) || user.email?.toLowerCase().includes(query)
  })

  const displayName = currentOwner?.name || currentOwner?.email || placeholder

  if (!canEdit) {
    return (
      <div className="flex items-center gap-2 text-white">
        <User className="h-4 w-4 text-slate-500" />
        <span>{displayName}</span>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`group flex items-center gap-2 rounded-lg transition ${
          compact
            ? 'px-2 py-1 text-sm hover:bg-slate-700/50'
            : 'w-full border border-slate-600/50 bg-slate-700/30 px-3 py-2 hover:bg-slate-700/50'
        } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} ${
          isOpen ? 'ring-1 ring-teal-500/50' : ''
        }`}
      >
        {currentOwner ? (
          <>
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-500/20">
              <User className="h-3.5 w-3.5 text-teal-400" />
            </div>
            <span className="flex-1 truncate text-left text-white">
              {currentOwner.name || currentOwner.email}
            </span>
          </>
        ) : (
          <>
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-600/50">
              <UserX className="h-3.5 w-3.5 text-slate-400" />
            </div>
            <span className="flex-1 truncate text-left text-slate-400">{placeholder}</span>
          </>
        )}
        {saving ? (
          <Loader2 className="h-4 w-4 animate-spin text-teal-400" />
        ) : (
          <ChevronDown
            className={`h-4 w-4 text-slate-400 transition ${isOpen ? 'rotate-180' : ''}`}
          />
        )}
      </button>

      {isOpen && (
        <div className="bg-slate-900/98 absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-slate-700/50 shadow-xl backdrop-blur-xl">
          {/* Поиск */}
          <div className="border-b border-slate-700/50 p-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Найти пользователя..."
                className="w-full rounded-lg border border-slate-600/50 bg-slate-800/50 py-2 pl-9 pr-3 text-sm text-white placeholder-slate-500 focus:border-teal-500/50 focus:outline-none"
              />
            </div>
          </div>

          {/* Опция "Снять исполнителя" */}
          {currentOwner && (
            <button
              type="button"
              onClick={() => handleSelect(null)}
              disabled={saving}
              className="flex w-full items-center gap-3 border-b border-slate-700/50 px-3 py-2.5 text-left transition hover:bg-slate-800/60 disabled:opacity-50"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/10">
                <X className="h-4 w-4 text-red-400" />
              </div>
              <span className="text-sm text-red-400">Снять исполнителя</span>
            </button>
          )}

          {/* Список пользователей */}
          <div className="max-h-64 overflow-auto">
            {filteredUsers.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-slate-500">
                {search ? 'Пользователи не найдены' : 'Нет доступных пользователей'}
              </div>
            ) : (
              filteredUsers.map((user) => {
                const isSelected = currentOwner?.id === user.id
                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => handleSelect(user.id)}
                    disabled={saving || isSelected}
                    className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition ${
                      isSelected ? 'bg-teal-500/10' : 'hover:bg-slate-800/60'
                    } disabled:opacity-50`}
                  >
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full ${
                        isSelected ? 'bg-teal-500/20' : 'bg-slate-700/50'
                      }`}
                    >
                      <User
                        className={`h-4 w-4 ${isSelected ? 'text-teal-400' : 'text-slate-400'}`}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div
                        className={`truncate text-sm ${isSelected ? 'text-teal-300' : 'text-white'}`}
                      >
                        {user.name || user.email}
                      </div>
                      {user.name && user.email && (
                        <div className="truncate text-xs text-slate-500">{user.email}</div>
                      )}
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-teal-400" />}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
})
