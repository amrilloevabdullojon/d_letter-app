'use client'

import { memo, useCallback, useMemo } from 'react'
import type { MouseEvent } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MoreHorizontal, RefreshCw, Settings } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { hapticLight, hapticMedium } from '@/lib/haptic'
import { scheduleFallbackNavigation } from './header-utils'
import { PRIMARY_NAV_ITEMS, SECONDARY_NAV_ITEMS, isActivePath } from './header-constants'
import { useLettersBadge } from './useLettersBadge'
import type { SyncDirection } from './header-types'

interface HeaderNavProps {
  isAdmin: boolean
  syncing: boolean
  onCloseMenus: () => void
  onSync: (direction: SyncDirection) => void
}

export const HeaderNav = memo(function HeaderNav({
  isAdmin,
  syncing,
  onCloseMenus,
  onSync,
}: HeaderNavProps) {
  const pathname = usePathname()
  const lettersBadge = useLettersBadge()
  const secondaryActive = useMemo(
    () =>
      SECONDARY_NAV_ITEMS.some((item) => isActivePath(pathname, item.matchPath)) ||
      pathname?.startsWith('/settings') ||
      pathname?.startsWith('/profile') ||
      false,
    [pathname]
  )

  const handleNavClick = useCallback(
    (event: MouseEvent<HTMLElement>, href?: string) => {
      hapticLight()
      onCloseMenus()
      scheduleFallbackNavigation(event, href)
    },
    [onCloseMenus]
  )

  return (
    <nav
      className="hidden min-w-0 flex-1 items-center justify-center gap-1 px-4 md:flex"
      aria-label="Основная навигация"
    >
      {PRIMARY_NAV_ITEMS.map((item) => {
        const Icon = item.icon
        const isActive = isActivePath(pathname, item.matchPath)
        const overdueCount =
          item.href === '/letters' && lettersBadge.overdue > 0 ? lettersBadge.overdue : 0
        const urgentCount =
          item.href === '/letters' && lettersBadge.overdue === 0 && lettersBadge.urgent > 0
            ? lettersBadge.urgent
            : 0

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={(event) => handleNavClick(event, item.href)}
            aria-current={isActive ? 'page' : undefined}
            className={`group relative flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-all ${
              isActive
                ? 'bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
                : 'text-slate-300 hover:bg-white/5 hover:text-white'
            }`}
          >
            <span className="relative shrink-0">
              <Icon
                className={`h-4 w-4 transition-transform group-hover:scale-110 ${
                  isActive ? 'text-teal-400' : ''
                }`}
              />
              {overdueCount > 0 && (
                <span
                  className="absolute -right-1.5 -top-1.5 flex h-3.5 min-w-[0.875rem] items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold leading-none text-white"
                  title={`${overdueCount} просроченных`}
                >
                  {overdueCount > 99 ? '99+' : overdueCount}
                </span>
              )}
              {urgentCount > 0 && (
                <span
                  className="absolute -right-1.5 -top-1.5 flex h-3.5 min-w-[0.875rem] items-center justify-center rounded-full bg-amber-500 px-0.5 text-[9px] font-bold leading-none text-white"
                  title={`${urgentCount} срочных`}
                >
                  {urgentCount > 99 ? '99+' : urgentCount}
                </span>
              )}
            </span>
            <span>{item.label}</span>
            {isActive && (
              <span className="absolute bottom-0 left-1/2 h-0.5 w-7 -translate-x-1/2 rounded-full bg-gradient-to-r from-teal-400 to-emerald-400" />
            )}
          </Link>
        )
      })}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            onClick={() => {
              hapticLight()
              onCloseMenus()
            }}
            aria-label="Дополнительная навигация"
            className={`group relative flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-all ${
              secondaryActive
                ? 'bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
                : 'text-slate-300 hover:bg-white/5 hover:text-white'
            }`}
          >
            <MoreHorizontal
              className={`h-4 w-4 transition-transform group-hover:scale-110 ${
                secondaryActive ? 'text-teal-400' : ''
              }`}
            />
            <span>Еще</span>
            {secondaryActive && (
              <span className="absolute bottom-0 left-1/2 h-0.5 w-7 -translate-x-1/2 rounded-full bg-gradient-to-r from-teal-400 to-emerald-400" />
            )}
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="start"
          sideOffset={12}
          className="w-64 rounded-2xl border-white/10 bg-slate-900/95 p-1.5 text-slate-100 shadow-2xl shadow-black/30 backdrop-blur-xl"
        >
          <DropdownMenuLabel className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
            Разделы
          </DropdownMenuLabel>

          {SECONDARY_NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = isActivePath(pathname, item.matchPath)

            return (
              <DropdownMenuItem key={item.href} asChild>
                <Link
                  href={item.href}
                  onClick={(event) => handleNavClick(event, item.href)}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium outline-none transition-colors ${
                    isActive
                      ? 'bg-teal-500/10 text-teal-300'
                      : 'text-slate-200 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-teal-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </Link>
              </DropdownMenuItem>
            )
          })}

          <DropdownMenuSeparator className="mx-2 my-1 bg-white/10" />

          <DropdownMenuItem asChild>
            <Link
              href="/settings"
              onClick={(event) => handleNavClick(event, '/settings')}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-200 outline-none transition-colors hover:bg-white/5 hover:text-white"
            >
              <Settings className="h-4 w-4 text-slate-400" />
              <span>Настройки</span>
            </Link>
          </DropdownMenuItem>

          {isAdmin && (
            <>
              <DropdownMenuLabel className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                Синхронизация
              </DropdownMenuLabel>

              <DropdownMenuItem asChild>
                <button
                  type="button"
                  onClick={() => {
                    hapticMedium()
                    onCloseMenus()
                    onSync('from_sheets')
                  }}
                  disabled={syncing}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-200 outline-none transition-colors hover:bg-white/5 hover:text-white disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 text-blue-400 ${syncing ? 'animate-spin' : ''}`} />
                  <span>Импорт из Sheets</span>
                </button>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <button
                  type="button"
                  onClick={() => {
                    hapticMedium()
                    onCloseMenus()
                    onSync('to_sheets')
                  }}
                  disabled={syncing}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-200 outline-none transition-colors hover:bg-white/5 hover:text-white disabled:opacity-50"
                >
                  <RefreshCw
                    className={`h-4 w-4 text-emerald-400 ${syncing ? 'animate-spin' : ''}`}
                  />
                  <span>Экспорт в Sheets</span>
                </button>
              </DropdownMenuItem>

              <DropdownMenuSeparator className="mx-2 my-1 bg-white/10" />

              <DropdownMenuLabel className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                Интеграции
              </DropdownMenuLabel>

              <DropdownMenuItem asChild>
                <Link
                  href="/admin/jira-requests"
                  onClick={(event) => handleNavClick(event, '/admin/jira-requests')}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-200 outline-none transition-colors hover:bg-white/5 hover:text-white"
                >
                  <svg className="h-4 w-4 text-[#0052CC]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.53 2c0 2.4 1.97 4.35 4.35 4.35h3.52V2.83c0-2.4-1.97-4.35-4.35-4.35h-3.52v3.52zm-5.76 5.76c0 2.4 1.97 4.35 4.35 4.35h3.52V8.59c0-2.4-1.97-4.35-4.35-4.35H5.77v3.52zM0 13.53c0 2.4 1.97 4.35 4.35 4.35h3.52v-3.52c0-2.4-1.97-4.35-4.35-4.35H4.35v3.52z" />
                  </svg>
                  <span>Jira Заявки</span>
                </Link>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  )
})
