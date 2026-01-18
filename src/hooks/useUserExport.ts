'use client'

import { useState, useCallback } from 'react'

export interface ExportUser {
  name: string | null
  email: string | null
  role: string
  canLogin: boolean
  telegramChatId: string | null
  createdAt: string
  lastLoginAt: string | null
}

export interface UseUserExportReturn {
  exporting: boolean
  exportToCSV: (users: ExportUser[], filename?: string) => void
  exportToJSON: (users: ExportUser[], filename?: string) => void
}

/**
 * Hook для экспорта пользователей в CSV/JSON
 */
export function useUserExport(): UseUserExportReturn {
  const [exporting, setExporting] = useState(false)

  const downloadFile = useCallback((content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, [])

  const exportToCSV = useCallback(
    (users: ExportUser[], filename = 'users.csv') => {
      setExporting(true)

      try {
        // CSV заголовки
        const headers = [
          'Name',
          'Email',
          'Role',
          'Can Login',
          'Telegram Chat ID',
          'Created At',
          'Last Login At',
        ]

        // CSV строки
        const rows = users.map((user) => [
          escapeCSV(user.name || ''),
          escapeCSV(user.email || ''),
          escapeCSV(user.role),
          user.canLogin ? 'true' : 'false',
          escapeCSV(user.telegramChatId || ''),
          escapeCSV(formatDate(user.createdAt)),
          escapeCSV(user.lastLoginAt ? formatDate(user.lastLoginAt) : ''),
        ])

        // Формируем CSV
        const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n')

        // Добавляем BOM для корректного отображения в Excel
        const csvWithBOM = '\uFEFF' + csv

        downloadFile(csvWithBOM, filename, 'text/csv;charset=utf-8')
      } catch (error) {
        console.error('Export to CSV failed:', error)
        throw error
      } finally {
        setExporting(false)
      }
    },
    [downloadFile]
  )

  const exportToJSON = useCallback(
    (users: ExportUser[], filename = 'users.json') => {
      setExporting(true)

      try {
        const json = JSON.stringify(users, null, 2)
        downloadFile(json, filename, 'application/json')
      } catch (error) {
        console.error('Export to JSON failed:', error)
        throw error
      } finally {
        setExporting(false)
      }
    },
    [downloadFile]
  )

  return {
    exporting,
    exportToCSV,
    exportToJSON,
  }
}

/**
 * Экранирование значений для CSV
 */
function escapeCSV(value: string): string {
  if (!value) return ''

  // Если содержит запятую, кавычки или перенос строки - обернуть в кавычки
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    // Удвоить кавычки и обернуть в кавычки
    return `"${value.replace(/"/g, '""')}"`
  }

  return value
}

/**
 * Форматирование даты для экспорта
 */
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    return date.toLocaleString('ru-RU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateString
  }
}
