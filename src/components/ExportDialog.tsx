'use client'

import { useState, useCallback } from 'react'
import { Download, X, FileSpreadsheet, FileText, Calendar, Filter, Loader2 } from 'lucide-react'

interface ExportDialogProps {
  /** Current active filters to pre-populate */
  statusFilter?: string
  quickFilter?: string
  ownerFilter?: string
  typeFilter?: string
  /** Selected letter IDs for "export selected" mode */
  selectedIds?: Set<string>
  onClose: () => void
}

const FORMAT_OPTIONS = [
  {
    id: 'xlsx',
    label: 'Excel (.xlsx)',
    description: 'Со стилями и автофильтром',
    icon: FileSpreadsheet,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/30',
    activeBg: 'bg-emerald-500/20 border-emerald-400/60',
  },
  {
    id: 'csv',
    label: 'CSV (.csv)',
    description: 'Совместим с любой таблицей',
    icon: FileText,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/30',
    activeBg: 'bg-blue-500/20 border-blue-400/60',
  },
] as const

type FormatId = 'xlsx' | 'csv'

export function ExportDialog({
  statusFilter,
  quickFilter,
  ownerFilter,
  typeFilter,
  selectedIds,
  onClose,
}: ExportDialogProps) {
  const [format, setFormat] = useState<FormatId>('xlsx')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [isDownloading, setIsDownloading] = useState(false)

  const hasSelectedIds = selectedIds && selectedIds.size > 0

  const buildUrl = useCallback(() => {
    const base = format === 'xlsx' ? '/api/export/xlsx' : '/api/export'
    const params = new URLSearchParams()

    if (hasSelectedIds) {
      // Export selected — ignore all other filters
      params.set('ids', Array.from(selectedIds).join(','))
    } else {
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter)
      if (quickFilter) params.set('filter', quickFilter)
      if (ownerFilter) params.set('owner', ownerFilter)
      if (typeFilter) params.set('type', typeFilter)
      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo) params.set('dateTo', dateTo)
    }

    return `${base}?${params.toString()}`
  }, [
    format,
    hasSelectedIds,
    selectedIds,
    statusFilter,
    quickFilter,
    ownerFilter,
    typeFilter,
    dateFrom,
    dateTo,
  ])

  const handleDownload = useCallback(() => {
    setIsDownloading(true)
    const url = buildUrl()
    // Navigate to URL — browser handles file download
    window.location.href = url
    // Reset after short delay (download starts immediately)
    setTimeout(() => {
      setIsDownloading(false)
      onClose()
    }, 1000)
  }, [buildUrl, onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900 shadow-2xl shadow-black/40"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700/60 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500/15">
              <Download className="h-5 w-5 text-teal-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Экспорт писем</h2>
              <p className="text-xs text-slate-400">
                {hasSelectedIds
                  ? `Выбрано ${selectedIds.size} писем`
                  : 'Экспорт с текущими фильтрами'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
            aria-label="Закрыть"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 p-5">
          {/* Format selection */}
          <div>
            <label className="mb-2.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-slate-400">
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Формат
            </label>
            <div className="grid grid-cols-2 gap-2">
              {FORMAT_OPTIONS.map((opt) => {
                const Icon = opt.icon
                const isActive = format === opt.id
                return (
                  <button
                    key={opt.id}
                    onClick={() => setFormat(opt.id)}
                    className={`flex items-center gap-3 rounded-xl border px-3 py-3 text-left transition-all ${
                      isActive
                        ? opt.activeBg + ' ring-1 ring-inset ring-white/10'
                        : opt.bg + ' hover:brightness-125'
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${opt.color} shrink-0`} />
                    <div>
                      <p className="text-sm font-medium text-white">{opt.label}</p>
                      <p className="text-[11px] text-slate-400">{opt.description}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Date range (only when not exporting selected) */}
          {!hasSelectedIds && (
            <div>
              <label className="mb-2.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-slate-400">
                <Calendar className="h-3.5 w-3.5" />
                Диапазон дат письма
                <span className="ml-1 rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-500">
                  необязательно
                </span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-xs text-slate-500">С</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    max={dateTo || undefined}
                    className="w-full rounded-lg border border-slate-700/60 bg-slate-800/80 px-3 py-2 text-sm text-white focus:border-teal-400/50 focus:outline-none focus:ring-1 focus:ring-teal-400/30"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-500">По</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    min={dateFrom || undefined}
                    className="w-full rounded-lg border border-slate-700/60 bg-slate-800/80 px-3 py-2 text-sm text-white focus:border-teal-400/50 focus:outline-none focus:ring-1 focus:ring-teal-400/30"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Active filters summary */}
          {!hasSelectedIds &&
            (statusFilter !== 'all' || quickFilter || ownerFilter || typeFilter) && (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2.5">
                <p className="flex items-center gap-1.5 text-xs text-amber-300">
                  <Filter className="h-3.5 w-3.5 shrink-0" />
                  Активные фильтры страницы будут применены к экспорту
                </p>
              </div>
            )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-700/60 bg-slate-900/50 px-5 py-4">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white"
          >
            Отмена
          </button>
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-teal-500 to-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-teal-500/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isDownloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {isDownloading ? 'Скачивание…' : 'Скачать'}
          </button>
        </div>
      </div>
    </div>
  )
}
