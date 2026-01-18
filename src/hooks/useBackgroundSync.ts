'use client'

import { useState, useCallback, useEffect } from 'react'

export interface PendingOperation {
  id?: number
  letterId: string
  createdAt: number
}

export interface PendingComment extends PendingOperation {
  text: string
}

export interface PendingStatusUpdate extends PendingOperation {
  status: string
}

export interface PendingAssignment extends PendingOperation {
  userId: string
}

export type SyncTag = 'comment-sync' | 'status-update-sync' | 'assignment-sync'

export interface UseBackgroundSyncReturn {
  isSupported: boolean
  queueComment: (letterId: string, text: string) => Promise<boolean>
  queueStatusUpdate: (letterId: string, status: string) => Promise<boolean>
  queueAssignment: (letterId: string, userId: string) => Promise<boolean>
  getPendingCount: (storeName: string) => Promise<number>
  clearPending: (storeName: string) => Promise<void>
}

/**
 * Hook для работы с Background Sync API
 * Позволяет ставить операции в очередь для выполнения когда появится сеть
 */
export function useBackgroundSync(): UseBackgroundSyncReturn {
  const [isSupported, setIsSupported] = useState(false)

  useEffect(() => {
    // Проверка поддержки Background Sync
    const checkSupport = async () => {
      if ('serviceWorker' in navigator && 'SyncManager' in window) {
        try {
          const registration = await navigator.serviceWorker.ready
          setIsSupported('sync' in registration)
        } catch {
          setIsSupported(false)
        }
      } else {
        setIsSupported(false)
      }
    }

    checkSupport()
  }, [])

  const openDB = useCallback(async () => {
    return new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('dmed-offline', 1)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        if (!db.objectStoreNames.contains('pendingComments')) {
          db.createObjectStore('pendingComments', { keyPath: 'id', autoIncrement: true })
        }
        if (!db.objectStoreNames.contains('pendingStatusUpdates')) {
          db.createObjectStore('pendingStatusUpdates', { keyPath: 'id', autoIncrement: true })
        }
        if (!db.objectStoreNames.contains('pendingAssignments')) {
          db.createObjectStore('pendingAssignments', { keyPath: 'id', autoIncrement: true })
        }
      }
    })
  }, [])

  const registerSync = useCallback(
    async (tag: SyncTag): Promise<boolean> => {
      if (!isSupported) return false

      try {
        const registration = await navigator.serviceWorker.ready
        await registration.sync.register(tag)
        return true
      } catch (error) {
        console.error('Failed to register background sync:', error)
        return false
      }
    },
    [isSupported]
  )

  const queueComment = useCallback(
    async (letterId: string, text: string): Promise<boolean> => {
      try {
        const db = await openDB()
        const transaction = db.transaction(['pendingComments'], 'readwrite')
        const store = transaction.objectStore('pendingComments')

        const comment: Omit<PendingComment, 'id'> = {
          letterId,
          text,
          createdAt: Date.now(),
        }

        await new Promise((resolve, reject) => {
          const request = store.add(comment)
          request.onsuccess = () => resolve(request.result)
          request.onerror = () => reject(request.error)
        })

        // Регистрируем sync tag
        await registerSync('comment-sync')

        return true
      } catch (error) {
        console.error('Failed to queue comment:', error)
        return false
      }
    },
    [openDB, registerSync]
  )

  const queueStatusUpdate = useCallback(
    async (letterId: string, status: string): Promise<boolean> => {
      try {
        const db = await openDB()
        const transaction = db.transaction(['pendingStatusUpdates'], 'readwrite')
        const store = transaction.objectStore('pendingStatusUpdates')

        const update: Omit<PendingStatusUpdate, 'id'> = {
          letterId,
          status,
          createdAt: Date.now(),
        }

        await new Promise((resolve, reject) => {
          const request = store.add(update)
          request.onsuccess = () => resolve(request.result)
          request.onerror = () => reject(request.error)
        })

        await registerSync('status-update-sync')

        return true
      } catch (error) {
        console.error('Failed to queue status update:', error)
        return false
      }
    },
    [openDB, registerSync]
  )

  const queueAssignment = useCallback(
    async (letterId: string, userId: string): Promise<boolean> => {
      try {
        const db = await openDB()
        const transaction = db.transaction(['pendingAssignments'], 'readwrite')
        const store = transaction.objectStore('pendingAssignments')

        const assignment: Omit<PendingAssignment, 'id'> = {
          letterId,
          userId,
          createdAt: Date.now(),
        }

        await new Promise((resolve, reject) => {
          const request = store.add(assignment)
          request.onsuccess = () => resolve(request.result)
          request.onerror = () => reject(request.error)
        })

        await registerSync('assignment-sync')

        return true
      } catch (error) {
        console.error('Failed to queue assignment:', error)
        return false
      }
    },
    [openDB, registerSync]
  )

  const getPendingCount = useCallback(
    async (storeName: string): Promise<number> => {
      try {
        const db = await openDB()
        const transaction = db.transaction([storeName], 'readonly')
        const store = transaction.objectStore(storeName)

        return new Promise((resolve, reject) => {
          const request = store.count()
          request.onsuccess = () => resolve(request.result)
          request.onerror = () => reject(request.error)
        })
      } catch (error) {
        console.error('Failed to get pending count:', error)
        return 0
      }
    },
    [openDB]
  )

  const clearPending = useCallback(
    async (storeName: string): Promise<void> => {
      try {
        const db = await openDB()
        const transaction = db.transaction([storeName], 'readwrite')
        const store = transaction.objectStore(storeName)

        await new Promise<void>((resolve, reject) => {
          const request = store.clear()
          request.onsuccess = () => resolve()
          request.onerror = () => reject(request.error)
        })
      } catch (error) {
        console.error('Failed to clear pending operations:', error)
      }
    },
    [openDB]
  )

  return {
    isSupported,
    queueComment,
    queueStatusUpdate,
    queueAssignment,
    getPendingCount,
    clearPending,
  }
}
