'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Check, Search, X } from 'lucide-react'
import { useIsMobile } from '@/hooks/useIsMobile'

export interface FilterSelectOption {
  value: string
  label: string
}

interface FilterSelectProps {
  value: string
  options: FilterSelectOption[]
  onChange: (value: string) => void
  /** The "empty/all" value — selecting this clears the filter */
  emptyValue?: string
  /** Label shown for the empty/all state */
  emptyLabel: string
  /** Icon element rendered in the colored pill (left side) */
  icon: React.ReactNode
  /** Tailwind bg class for the icon pill, e.g. "bg-blue-500/20" */
  iconBg: string
  disabled?: boolean
  /** Minimum width as CSS value, e.g. "190px" */
  minWidth?: string
  ariaLabel?: string
  className?: string
}

export function FilterSelect({
  value,
  options,
  onChange,
  emptyValue = '',
  emptyLabel,
  icon,
  iconBg,
  disabled,
  minWidth = '190px',
  ariaLabel,
  className,
}: FilterSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [mounted, setMounted] = useState(false)
  const isMobile = useIsMobile()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 })

  useEffect(() => setMounted(true), [])

  const calculatePosition = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: Math.max(rect.width, 220),
      })
    }
  }, [])

  const handleOpen = useCallback(() => {
    if (disabled) return
    calculatePosition()
    setIsOpen(true)
  }, [disabled, calculatePosition])

  const handleClose = useCallback(() => {
    setIsOpen(false)
    setSearch('')
  }, [])

  const handleToggle = useCallback(() => {
    isOpen ? handleClose() : handleOpen()
  }, [isOpen, handleClose, handleOpen])

  // Close on outside click / Escape / scroll
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        buttonRef.current &&
        !buttonRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        handleClose()
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }

    const handleScroll = () => calculatePosition()

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('scroll', handleScroll, true)
    window.addEventListener('resize', handleScroll)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('scroll', handleScroll, true)
      window.removeEventListener('resize', handleScroll)
    }
  }, [isOpen, handleClose, calculatePosition])

  // Auto-focus search input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      const t = setTimeout(() => inputRef.current?.focus(), 50)
      return () => clearTimeout(t)
    }
  }, [isOpen])

  const selectedLabel =
    value === emptyValue ? emptyLabel : (options.find((o) => o.value === value)?.label ?? value)

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options
    const q = search.toLowerCase()
    return options.filter((o) => o.label.toLowerCase().includes(q))
  }, [options, search])

  const handleSelect = useCallback(
    (val: string) => {
      onChange(val)
      handleClose()
    },
    [onChange, handleClose]
  )

  const isActive = value !== emptyValue

  const dropdownContent = (
    <div
      ref={dropdownRef}
      style={
        isMobile
          ? { zIndex: 99999 }
          : {
              position: 'fixed',
              top: position.top,
              left: position.left,
              width: position.width,
              zIndex: 99999,
            }
      }
      className={
        isMobile
          ? 'animate-slideUp fixed inset-x-0 bottom-0 z-[99999] overflow-hidden rounded-t-2xl border-t border-slate-600/50 bg-slate-900 shadow-2xl'
          : 'overflow-hidden rounded-xl border border-slate-600/50 bg-slate-900 shadow-2xl'
      }
    >
      {isMobile && (
        <div className="flex items-center justify-between border-b border-slate-700/50 px-4 py-3">
          <span className="text-sm font-semibold text-white">{ariaLabel}</span>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-1 text-slate-400 transition hover:bg-white/10 hover:text-white"
            aria-label="Закрыть"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Search */}
      <div className="border-b border-slate-700/50 p-2.5">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск..."
            className="w-full rounded-lg border border-slate-600/50 bg-slate-800/50 py-1.5 pl-8 pr-3 text-sm text-white placeholder-slate-500 focus:border-teal-500/50 focus:outline-none"
          />
        </div>
      </div>

      <div
        className={`overflow-auto p-1 ${isMobile ? 'max-h-[50vh]' : 'max-h-60'}`}
        style={isMobile ? { paddingBottom: 'env(safe-area-inset-bottom)' } : undefined}
      >
        {/* "All" option */}
        <button
          type="button"
          onClick={() => handleSelect(emptyValue)}
          className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${
            value === emptyValue
              ? 'bg-teal-500/20 text-teal-200'
              : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
          }`}
        >
          <span>{emptyLabel}</span>
          {value === emptyValue && <Check className="h-4 w-4 shrink-0 text-teal-400" />}
        </button>

        {filteredOptions.length === 0 ? (
          <div className="px-3 py-4 text-center text-sm text-slate-500">Ничего не найдено</div>
        ) : (
          filteredOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleSelect(opt.value)}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${
                value === opt.value
                  ? 'bg-teal-500/20 text-teal-200'
                  : 'text-slate-300 hover:bg-slate-800/80'
              }`}
            >
              <span className="truncate">{opt.label}</span>
              {value === opt.value && <Check className="h-4 w-4 shrink-0 text-teal-400" />}
            </button>
          ))
        )}
      </div>
    </div>
  )

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        aria-label={ariaLabel}
        className={[
          'group flex w-full items-center gap-1.5 rounded-lg p-1 ring-1 transition-all',
          'sm:w-auto sm:gap-2 sm:rounded-xl sm:p-1.5',
          isOpen
            ? 'bg-slate-700/50 ring-teal-500/50'
            : 'bg-slate-700/30 ring-slate-600/50 hover:ring-slate-500/50',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className ?? '',
        ].join(' ')}
        style={{ minWidth: `min(100%, ${minWidth})` }}
      >
        <div
          className={`hidden h-7 w-7 shrink-0 items-center justify-center rounded-lg sm:flex sm:h-8 sm:w-8 ${iconBg}`}
        >
          {icon}
        </div>
        <span
          className={`flex-1 truncate text-left text-xs sm:text-sm ${
            isActive ? 'text-teal-200' : 'text-slate-400'
          }`}
        >
          {selectedLabel}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform sm:h-4 sm:w-4 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {mounted &&
        isOpen &&
        createPortal(
          isMobile ? (
            <>
              <div
                className="fixed inset-0 z-[99998] bg-black/50 backdrop-blur-sm"
                onClick={handleClose}
                aria-hidden="true"
              />
              {dropdownContent}
            </>
          ) : (
            dropdownContent
          ),
          document.body
        )}
    </>
  )
}
