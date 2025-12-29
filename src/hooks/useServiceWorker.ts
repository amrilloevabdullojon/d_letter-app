'use client'

import { useEffect, useState } from 'react'

export function useServiceWorker() {
  const [isReady, setIsReady] = useState(false)
  const [isOffline, setIsOffline] = useState(false)
  const [hasUpdate, setHasUpdate] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return

    // Регистрация Service Worker
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        setIsReady(true)

        // Проверка обновлений
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setHasUpdate(true)
              }
            })
          }
        })
      })
      .catch((error) => {
        console.error('Service Worker registration failed:', error)
      })

    // Отслеживание статуса сети
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    setIsOffline(!navigator.onLine)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const updateServiceWorker = () => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage('SKIP_WAITING')
      window.location.reload()
    }
  }

  return { isReady, isOffline, hasUpdate, updateServiceWorker }
}
