'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Building2, Loader2, X, Clock, Star } from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce'

interface OrganizationAutocompleteProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  required?: boolean
}

interface Suggestion {
  name: string
  count: number
  lastUsed?: string
}

export function OrganizationAutocomplete({
  value,
  onChange,
  placeholder = 'Название организации',
  className = '',
  required = false,
}: OrganizationAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [recentOrgs, setRecentOrgs] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Load recent organizations from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('recent-organizations')
      if (stored) {
        setRecentOrgs(JSON.parse(stored))
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [])

  // Save to recent organizations
  const saveToRecent = useCallback((org: string) => {
    if (!org.trim()) return

    setRecentOrgs((prev) => {
      const filtered = prev.filter((o) => o.toLowerCase() !== org.toLowerCase())
      const updated = [org, ...filtered].slice(0, 10)
      try {
        localStorage.setItem('recent-organizations', JSON.stringify(updated))
      } catch {
        // Ignore localStorage errors
      }
      return updated
    })
  }, [])

  // Debounce the search value
  const debouncedValue = useDebounce(value, 300)

  // Fetch suggestions from API when debounced value changes
  useEffect(() => {
    if (!isOpen) return

    if (!debouncedValue || debouncedValue.length < 2) {
      setSuggestions([])
      return
    }

    const fetchSuggestions = async () => {
      setLoading(true)
      try {
        const res = await fetch(
          `/api/organizations/suggest?q=${encodeURIComponent(debouncedValue)}`
        )
        if (res.ok) {
          const data = await res.json()
          setSuggestions(data.suggestions || [])
        }
      } catch (error) {
        console.error('Failed to fetch suggestions:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSuggestions()
  }, [debouncedValue, isOpen])

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (org: string) => {
    onChange(org)
    saveToRecent(org)
    setIsOpen(false)
    setFocusedIndex(-1)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const items = showRecent ? recentOrgs : suggestions.map((s) => s.name)

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setFocusedIndex((prev) => Math.min(prev + 1, items.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setFocusedIndex((prev) => Math.max(prev - 1, -1))
    } else if (e.key === 'Enter' && focusedIndex >= 0) {
      e.preventDefault()
      handleSelect(items[focusedIndex])
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  const handleFocus = () => {
    setIsOpen(true)
    setFocusedIndex(-1)
  }

  const handleBlur = () => {
    // Delay to allow click on suggestion
    setTimeout(() => {
      if (value) {
        saveToRecent(value)
      }
    }, 200)
  }

  const clearRecent = () => {
    setRecentOrgs([])
    try {
      localStorage.removeItem('recent-organizations')
    } catch {
      // Ignore
    }
  }

  const showRecent = !value && recentOrgs.length > 0
  const showSuggestions = value && suggestions.length > 0
  const showDropdown = isOpen && (showRecent || showSuggestions || loading)

  return (
    <div className="relative">
      <div className="relative">
        <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          required={required}
          className={`w-full rounded-lg border border-gray-600 bg-gray-700 py-2 pl-10 pr-10 text-white placeholder-gray-400 focus:border-emerald-500 focus:outline-none ${className}`}
          autoComplete="off"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" />
        )}
        {!loading && value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-gray-700 bg-gray-800 shadow-lg"
        >
          {loading && (
            <div className="flex items-center gap-2 px-4 py-3 text-gray-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Поиск...</span>
            </div>
          )}

          {showRecent && !loading && (
            <>
              <div className="flex items-center justify-between border-b border-gray-700 px-4 py-2">
                <span className="flex items-center gap-1 text-xs uppercase tracking-wide text-gray-500">
                  <Clock className="h-3 w-3" />
                  Недавние
                </span>
                <button
                  type="button"
                  onClick={clearRecent}
                  className="text-xs text-gray-500 transition hover:text-gray-300"
                >
                  Очистить
                </button>
              </div>
              {recentOrgs.map((org, index) => (
                <button
                  key={org}
                  type="button"
                  onClick={() => handleSelect(org)}
                  className={`flex w-full items-center gap-2 px-4 py-2 text-left text-white transition hover:bg-gray-700 ${
                    focusedIndex === index ? 'bg-gray-700' : ''
                  }`}
                >
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="truncate">{org}</span>
                </button>
              ))}
            </>
          )}

          {showSuggestions && !loading && (
            <>
              <div className="border-b border-gray-700 px-4 py-2">
                <span className="flex items-center gap-1 text-xs uppercase tracking-wide text-gray-500">
                  <Star className="h-3 w-3" />
                  Совпадения
                </span>
              </div>
              {suggestions.map((suggestion, index) => (
                <button
                  key={suggestion.name}
                  type="button"
                  onClick={() => handleSelect(suggestion.name)}
                  className={`w-full px-4 py-2 text-left transition hover:bg-gray-700 ${
                    focusedIndex === index ? 'bg-gray-700' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate text-white">{suggestion.name}</span>
                    <span className="ml-2 flex-shrink-0 text-xs text-gray-500">
                      {suggestion.count} {suggestion.count === 1 ? 'письмо' : 'писем'}
                    </span>
                  </div>
                </button>
              ))}
            </>
          )}

          {!loading && !showRecent && !showSuggestions && value.length >= 2 && (
            <div className="px-4 py-3 text-sm text-gray-400">Организаций не найдено</div>
          )}
        </div>
      )}
    </div>
  )
}
