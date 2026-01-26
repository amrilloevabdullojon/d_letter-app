'use client'

import { SessionProvider } from 'next-auth/react'
import { ReactNode, useEffect } from 'react'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ToastWrapper } from '@/components/Toast'
import { TRPCProvider } from '@/lib/trpc'
import { installCsrfFetch } from '@/lib/csrf-client'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { useUserPreferences } from '@/hooks/useUserPreferences'

installCsrfFetch()

export function Providers({ children }: { children: ReactNode }) {
  const [newYearVibe] = useLocalStorage<boolean>('new-year-vibe', false)
  const { preferences } = useUserPreferences()

  // Получаем настройки анимаций из preferences (API) с fallback на true
  const backgroundAnimations = preferences?.backgroundAnimations ?? true
  const animations = preferences?.animations ?? true
  const wallpaperStyle = preferences?.wallpaperStyle?.toLowerCase() ?? 'aurora'
  const wallpaperIntensity =
    typeof preferences?.wallpaperIntensity === 'number' ? preferences.wallpaperIntensity : 60

  useEffect(() => {
    const root = document.documentElement
    if (newYearVibe) {
      root.classList.add('new-year')
    } else {
      root.classList.remove('new-year')
    }
  }, [newYearVibe])

  // Применяем класс для отключения фоновых анимаций
  useEffect(() => {
    const root = document.documentElement
    if (!backgroundAnimations) {
      root.classList.add('no-bg-animations')
    } else {
      root.classList.remove('no-bg-animations')
    }
  }, [backgroundAnimations])

  // Применяем класс для отключения всех анимаций
  useEffect(() => {
    const root = document.documentElement
    if (!animations) {
      root.classList.add('reduce-motion')
    } else {
      // Проверяем системные настройки
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (prefersReducedMotion) {
        root.classList.add('reduce-motion')
      } else {
        root.classList.remove('reduce-motion')
      }
    }
  }, [animations])

  // Слушаем системные настройки reduced motion
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updateReducedMotion = () => {
      const root = document.documentElement
      // Если пользователь отключил анимации в настройках, не снимаем класс
      if (!animations) return

      if (media.matches) {
        root.classList.add('reduce-motion')
      } else {
        root.classList.remove('reduce-motion')
      }
    }

    if (media.addEventListener) {
      media.addEventListener('change', updateReducedMotion)
      return () => media.removeEventListener('change', updateReducedMotion)
    }

    media.addListener(updateReducedMotion)
    return () => media.removeListener(updateReducedMotion)
  }, [animations])

  useEffect(() => {
    const root = document.documentElement
    const updateVisibility = () => {
      if (document.visibilityState === 'hidden') {
        root.classList.add('animations-paused')
      } else {
        root.classList.remove('animations-paused')
      }
    }

    updateVisibility()
    document.addEventListener('visibilitychange', updateVisibility)
    return () => document.removeEventListener('visibilitychange', updateVisibility)
  }, [])

  useEffect(() => {
    const root = document.documentElement
    root.dataset.wallpaperStyle = wallpaperStyle
  }, [wallpaperStyle])

  useEffect(() => {
    const root = document.documentElement
    const clamped = Math.min(100, Math.max(0, wallpaperIntensity))
    root.style.setProperty('--wallpaper-opacity', (clamped / 100).toFixed(2))
  }, [wallpaperIntensity])

  return (
    <TRPCProvider>
      <SessionProvider>
        <ErrorBoundary>
          <ToastWrapper>{children}</ToastWrapper>
        </ErrorBoundary>
      </SessionProvider>
    </TRPCProvider>
  )
}
