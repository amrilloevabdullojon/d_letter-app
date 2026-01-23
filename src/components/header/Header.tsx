'use client'

import { useState, useCallback, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { useToast } from '@/components/Toast'
import { GlobalSearch } from '../GlobalSearch'
import { MobileBottomNav } from '../MobileBottomNav'
import { useHeaderState } from './useHeaderState'
import { getPageMeta, getPrimaryAction } from './header-constants'
import type { SyncDirection } from './header-types'

// Components
import { HeaderLogo } from './HeaderLogo'
import { HeaderNav } from './HeaderNav'
import { HeaderQuickCreate } from './HeaderQuickCreate'
import { HeaderRecentItems } from './HeaderRecentItems'
import { HeaderUserMenu, HeaderMobileActions } from './HeaderUserMenu'
import { HeaderMobileSheet } from './HeaderMobileSheet'

export function Header() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const toast = useToast()

  const {
    mobileMenuOpen,
    quickCreateOpen,
    recentMenuOpen,
    syncMenuOpen,
    compactHeader,
    routeTransitioning,
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
  } = useHeaderState()

  const [syncing, setSyncing] = useState(false)

  const isAdmin = session?.user.role === 'ADMIN' || session?.user.role === 'SUPERADMIN'
  const pageMeta = useMemo(() => getPageMeta(pathname), [pathname])
  const primaryAction = useMemo(() => getPrimaryAction(pathname), [pathname])

  const handleSync = useCallback(
    async (direction: SyncDirection) => {
      if (syncing) return

      const confirmMsg =
        direction === 'to_sheets'
          ? 'Синхронизировать данные с Google Sheets?\n\nВНИМАНИЕ: будут обновлены изменённые записи.'
          : 'Синхронизировать данные из Google Sheets?\n\nБудут обновлены изменённые записи.'

      if (!confirm(confirmMsg)) return

      setSyncing(true)
      closeAllMenus()

      const toastId = toast.loading(
        direction === 'to_sheets'
          ? 'Синхронизация с Google Sheets...'
          : 'Импорт из Google Sheets...'
      )

      try {
        const res = await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ direction }),
        })

        const data = await res.json()

        if (data.success) {
          const count = data.rowsAffected || data.imported || 0
          const conflicts = Array.isArray(data.conflicts) ? data.conflicts.length : 0
          if (conflicts > 0) {
            toast.warning(`Обновлено ${count} записей. Конфликты: ${conflicts}.`, { id: toastId })
          } else {
            toast.success(`Готово! Обновлено ${count} записей`, { id: toastId })
          }
          setTimeout(() => window.location.reload(), 1500)
        } else {
          toast.error(`Ошибка: ${data.error}`, { id: toastId })
        }
      } catch {
        toast.error('Ошибка синхронизации', { id: toastId })
      } finally {
        setSyncing(false)
      }
    },
    [syncing, closeAllMenus, toast]
  )

  const openSearch = useCallback(() => {
    const event = new KeyboardEvent('keydown', {
      key: 'k',
      ctrlKey: true,
      bubbles: true,
    })
    document.dispatchEvent(event)
  }, [])

  return (
    <header
      className={`sticky top-0 z-[180] border-b border-white/5 bg-slate-900/80 backdrop-blur-xl transition-all ${
        compactHeader ? 'shadow-lg shadow-black/10' : ''
      }`}
      data-compact={compactHeader}
    >
      {/* Decorative gradient line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-500/50 to-transparent" />

      {/* Christmas lights */}
      {newYearVibe && backgroundAnimations && (
        <div className="pointer-events-none absolute inset-x-0 top-0 hidden justify-around overflow-hidden sm:flex">
          {Array.from({ length: 15 }).map((_, i) => {
            const colors = ['#ef4444', '#22c55e', '#f59e0b', '#3b82f6']
            const color = colors[i % colors.length]
            return (
              <span
                key={i}
                className="inline-block h-2.5 w-2.5 animate-pulse rounded-full"
                style={{
                  backgroundColor: color,
                  boxShadow: `0 0 8px ${color}`,
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            )
          })}
        </div>
      )}

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          className={`flex items-center justify-between transition-all ${
            compactHeader ? 'h-12 sm:h-14' : 'h-14 sm:h-16'
          }`}
        >
          {/* Logo */}
          <HeaderLogo compact={compactHeader} pageMeta={pageMeta} />

          {/* Desktop Navigation */}
          <HeaderNav
            isAdmin={isAdmin}
            syncing={syncing}
            syncMenuOpen={syncMenuOpen}
            onToggleSyncMenu={toggleSyncMenu}
            onCloseMenus={closeAllMenus}
            onSync={handleSync}
          />

          {/* Desktop Right Section */}
          <div className="hidden items-center gap-2 md:flex">
            {/* Quick Create */}
            <HeaderQuickCreate
              isOpen={quickCreateOpen}
              onToggle={toggleQuickCreate}
              onClose={closeAllMenus}
            />

            {/* Recent Items */}
            <HeaderRecentItems
              items={recentItems}
              isOpen={recentMenuOpen}
              onToggle={toggleRecentMenu}
              onClose={closeAllMenus}
              onUpdateItems={setRecentItems}
            />

            {/* User Menu */}
            <HeaderUserMenu
              user={session?.user}
              primaryAction={primaryAction}
              onCloseMenus={closeAllMenus}
            />
          </div>

          {/* Mobile Right Section */}
          <div className="flex items-center gap-1.5 md:hidden">
            <HeaderMobileActions
              user={session?.user}
              primaryAction={primaryAction}
              onOpenSearch={openSearch}
              onCloseMenus={closeAllMenus}
            />

            {/* Quick Create (Mobile) */}
            <HeaderQuickCreate
              isOpen={quickCreateOpen}
              onToggle={toggleQuickCreate}
              onClose={closeAllMenus}
              size="sm"
            />

            {/* Mobile Menu */}
            <HeaderMobileSheet
              isOpen={mobileMenuOpen}
              onOpenChange={(open) => {
                if (open) {
                  closeAllMenus()
                }
                if (!open) {
                  closeMobileMenu()
                } else {
                  toggleMobileMenu()
                }
              }}
              onClose={closeMobileMenu}
              user={session?.user}
              isAdmin={isAdmin}
              syncing={syncing}
              recentItems={recentItems}
              onSync={handleSync}
            />
          </div>
        </div>
      </div>

      {/* Route transition progress */}
      {routeTransitioning && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 overflow-hidden">
          <div className="animate-progress h-full w-full bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-500" />
        </div>
      )}

      {/* Mobile Bottom Nav */}
      <MobileBottomNav isAdmin={isAdmin} hidden={mobileMenuOpen} />

      {/* Global Search */}
      <GlobalSearch />
    </header>
  )
}
