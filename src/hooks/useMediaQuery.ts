'use client'

import { useState, useEffect } from 'react'

/**
 * Hook для отслеживания media queries
 * @param query - Media query строка (например, '(max-width: 768px)')
 * @returns boolean - соответствует ли текущий viewport запросу
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    // Проверка на SSR
    if (typeof window === 'undefined') {
      return
    }

    const mediaQuery = window.matchMedia(query)

    // Установить начальное значение
    setMatches(mediaQuery.matches)

    // Обработчик изменений
    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches)
    }

    // Подписка на изменения
    // Используем addEventListener для современных браузеров
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange)
    } else {
      // Fallback для старых браузеров
      mediaQuery.addListener(handleChange)
    }

    // Cleanup
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange)
      } else {
        mediaQuery.removeListener(handleChange)
      }
    }
  }, [query])

  return matches
}

/**
 * Предопределенные breakpoints для удобства
 */
export const breakpoints = {
  mobile: '(max-width: 767px)',
  tablet: '(min-width: 768px) and (max-width: 1023px)',
  desktop: '(min-width: 1024px)',
  mobileOrTablet: '(max-width: 1023px)',
} as const

/**
 * Хуки для конкретных breakpoints
 */
export function useIsMobile() {
  return useMediaQuery(breakpoints.mobile)
}

export function useIsTablet() {
  return useMediaQuery(breakpoints.tablet)
}

export function useIsDesktop() {
  return useMediaQuery(breakpoints.desktop)
}

export function useIsMobileOrTablet() {
  return useMediaQuery(breakpoints.mobileOrTablet)
}
