'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { hapticLight } from '@/lib/haptic'
import type { RecentItem } from './header-types'

interface HeaderState {
  mobileMenuOpen: boolean
  quickCreateOpen: boolean
  recentMenuOpen: boolean
  syncMenuOpen: boolean
  compactHeader: boolean
  routeTransitioning: boolean
}

interface HeaderActions {
  openMobileMenu: () => void
  closeMobileMenu: () => void
  toggleMobileMenu: () => void
  toggleQuickCreate: () => void
  toggleRecentMenu: () => void
  toggleSyncMenu: () => void
  closeAllMenus: () => void
}

interface UseHeaderStateReturn extends HeaderState, HeaderActions {
  recentItems: RecentItem[]
  setRecentItems: (items: RecentItem[] | ((prev: RecentItem[]) => RecentItem[])) => void
  newYearVibe: boolean
  backgroundAnimations: boolean
}

export function useHeaderState(): UseHeaderStateReturn {
  const pathname = usePathname()
  const [state, setState] = useState<HeaderState>({
    mobileMenuOpen: false,
    quickCreateOpen: false,
    recentMenuOpen: false,
    syncMenuOpen: false,
    compactHeader: false,
    routeTransitioning: false,
  })

  const [newYearVibe] = useLocalStorage<boolean>('new-year-vibe', false)
  const [personalization] = useLocalStorage<{ backgroundAnimations?: boolean }>(
    'personalization-settings',
    { backgroundAnimations: true }
  )
  const [recentItems, setRecentItems] = useLocalStorage<RecentItem[]>('recent-items', [])

  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastPathnameRef = useRef<string | null>(null)

  const backgroundAnimations = personalization?.backgroundAnimations ?? true

  // Close all menus on route change
  useEffect(() => {
    setState((prev) => ({
      ...prev,
      mobileMenuOpen: false,
      quickCreateOpen: false,
      recentMenuOpen: false,
      syncMenuOpen: false,
    }))
  }, [pathname])

  // Handle scroll for compact header
  useEffect(() => {
    const handleScroll = () => {
      setState((prev) => ({
        ...prev,
        compactHeader: window.scrollY > 12,
      }))
    }
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Handle route transitions
  useEffect(() => {
    if (!pathname) return
    if (lastPathnameRef.current && lastPathnameRef.current !== pathname) {
      setState((prev) => ({ ...prev, routeTransitioning: true }))
      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current)
      }
      transitionTimerRef.current = setTimeout(() => {
        setState((prev) => ({ ...prev, routeTransitioning: false }))
      }, 450)
    } else {
      setState((prev) => ({ ...prev, routeTransitioning: false }))
    }
    lastPathnameRef.current = pathname
    return () => {
      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current)
      }
    }
  }, [pathname])

  // Track recent items
  useEffect(() => {
    if (!pathname) return
    const letterMatch = pathname.match(/^\/letters\/([a-zA-Z0-9_-]+)$/)
    const requestMatch = pathname.match(/^\/requests\/([a-zA-Z0-9_-]+)$/)
    const isNew = pathname.endsWith('/new') || pathname.endsWith('/create')
    if (isNew) return

    const match = letterMatch ?? requestMatch
    if (!match) return
    const id = match[1]
    const kind: 'letter' | 'request' = letterMatch ? 'letter' : 'request'
    const label = kind === 'letter' ? `Письмо ${id.slice(0, 6)}` : `Заявка ${id.slice(0, 6)}`
    setRecentItems((prev) => {
      const next = prev.filter((item) => item.href !== pathname)
      next.unshift({ id, label, href: pathname, kind, ts: Date.now(), resolved: false })
      return next.slice(0, 5)
    })
  }, [pathname, setRecentItems])

  // Body scroll lock for mobile menu
  useEffect(() => {
    if (state.mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [state.mobileMenuOpen])

  // Actions
  const closeAllMenus = useCallback(() => {
    setState((prev) => ({
      ...prev,
      quickCreateOpen: false,
      recentMenuOpen: false,
      syncMenuOpen: false,
    }))
  }, [])

  const openMobileMenu = useCallback(() => {
    hapticLight()
    setState((prev) => ({ ...prev, mobileMenuOpen: true }))
    closeAllMenus()
  }, [closeAllMenus])

  const closeMobileMenu = useCallback(() => {
    hapticLight()
    setState((prev) => ({ ...prev, mobileMenuOpen: false }))
  }, [])

  const toggleMobileMenu = useCallback(() => {
    hapticLight()
    setState((prev) => ({ ...prev, mobileMenuOpen: !prev.mobileMenuOpen }))
  }, [])

  const toggleQuickCreate = useCallback(() => {
    hapticLight()
    setState((prev) => ({
      ...prev,
      quickCreateOpen: !prev.quickCreateOpen,
      recentMenuOpen: false,
      syncMenuOpen: false,
    }))
  }, [])

  const toggleRecentMenu = useCallback(() => {
    hapticLight()
    setState((prev) => ({
      ...prev,
      recentMenuOpen: !prev.recentMenuOpen,
      quickCreateOpen: false,
      syncMenuOpen: false,
    }))
  }, [])

  const toggleSyncMenu = useCallback(() => {
    hapticLight()
    setState((prev) => ({
      ...prev,
      syncMenuOpen: !prev.syncMenuOpen,
      quickCreateOpen: false,
      recentMenuOpen: false,
    }))
  }, [])

  return {
    ...state,
    openMobileMenu,
    closeMobileMenu,
    toggleMobileMenu,
    toggleQuickCreate,
    toggleRecentMenu,
    toggleSyncMenu,
    closeAllMenus,
    recentItems,
    setRecentItems,
    newYearVibe,
    backgroundAnimations,
  }
}
