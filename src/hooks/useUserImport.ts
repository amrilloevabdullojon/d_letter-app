'use client'

import { useState, useCallback } from 'react'

export interface ImportUser {
  name: string
  email: string
  role: 'SUPERADMIN' | 'ADMIN' | 'MANAGER' | 'AUDITOR' | 'EMPLOYEE' | 'VIEWER'
  canLogin?: boolean
  telegramChatId?: string
}

export interface ImportResult {
  success: number
  failed: number
  errors: Array<{ row: number; email: string; error: string }>
  created: Array<{ email: string; name: string }>
}

export interface UseUserImportReturn {
  importing: boolean
  result: ImportResult | null
  importUsers: (users: ImportUser[]) => Promise<boolean>
  parseCSV: (file: File) => Promise<ImportUser[]>
  reset: () => void
}

/**
 * Hook для импорта пользователей из CSV/Excel
 */
export function useUserImport(): UseUserImportReturn {
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)

  const parseCSV = useCallback(async (file: File): Promise<ImportUser[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = (e) => {
        try {
          const text = e.target?.result as string
          const lines = text.split('\n').filter((line) => line.trim())

          if (lines.length === 0) {
            reject(new Error('Файл пустой'))
            return
          }

          // Парсим заголовки
          const headers = lines[0].split(',').map((h) => h.trim().toLowerCase())

          // Проверяем наличие обязательных колонок
          const requiredHeaders = ['name', 'email', 'role']
          const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h))

          if (missingHeaders.length > 0) {
            reject(new Error(`Отсутствуют обязательные колонки: ${missingHeaders.join(', ')}`))
            return
          }

          // Парсим строки
          const users: ImportUser[] = []
          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map((v) => v.trim())

            if (values.length < headers.length) {
              continue // Пропускаем неполные строки
            }

            const user: Partial<ImportUser> = {}

            headers.forEach((header, index) => {
              const value = values[index]

              switch (header) {
                case 'name':
                  user.name = value
                  break
                case 'email':
                  user.email = value
                  break
                case 'role':
                  user.role = value.toUpperCase() as ImportUser['role']
                  break
                case 'canlogin':
                case 'can_login':
                  user.canLogin = value.toLowerCase() === 'true' || value === '1'
                  break
                case 'telegramchatid':
                case 'telegram_chat_id':
                case 'telegram':
                  if (value) user.telegramChatId = value
                  break
              }
            })

            if (user.name && user.email && user.role) {
              users.push(user as ImportUser)
            }
          }

          resolve(users)
        } catch (error) {
          reject(error)
        }
      }

      reader.onerror = () => {
        reject(new Error('Ошибка чтения файла'))
      }

      reader.readAsText(file)
    })
  }, [])

  const importUsers = useCallback(async (users: ImportUser[]): Promise<boolean> => {
    setImporting(true)
    setResult(null)

    try {
      const response = await fetch('/api/users/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ users }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Ошибка импорта')
      }

      const importResult: ImportResult = await response.json()
      setResult(importResult)

      return importResult.success > 0
    } catch (error) {
      console.error('Import failed:', error)
      throw error
    } finally {
      setImporting(false)
    }
  }, [])

  const reset = useCallback(() => {
    setResult(null)
  }, [])

  return {
    importing,
    result,
    importUsers,
    parseCSV,
    reset,
  }
}
