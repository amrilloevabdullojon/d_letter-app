'use client'

import { memo, useCallback } from 'react'
import type { MouseEvent } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { signOut } from 'next-auth/react'
import { ChevronDown, LogOut, Search, User } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { hapticLight, hapticMedium } from '@/lib/haptic'
import { Notifications } from '../Notifications'
import { ThemeToggle } from '../ThemeToggle'
import type { PrimaryAction } from './header-types'
import { scheduleFallbackNavigation } from './header-utils'

interface HeaderUserMenuProps {
  user?: {
    name?: string | null
    email?: string | null
    image?: string | null
    role?: string | null
  } | null
  primaryAction?: PrimaryAction | null
  onCloseMenus: () => void
}

const ROLE_BADGE: Record<string, { label: string; className: string }> = {
  SUPERADMIN: {
    label: 'SUPERADMIN',
    className: 'bg-violet-500/20 text-violet-300 ring-violet-500/30',
  },
  ADMIN: {
    label: 'ADMIN',
    className: 'bg-amber-500/20 text-amber-300 ring-amber-500/30',
  },
}

export const HeaderUserMenu = memo(function HeaderUserMenu({
  user,
  primaryAction,
  onCloseMenus,
}: HeaderUserMenuProps) {
  const roleBadge = user?.role ? ROLE_BADGE[user.role] : undefined

  const handleNavClick = useCallback(
    (event: MouseEvent<HTMLElement>, href?: string) => {
      hapticLight()
      onCloseMenus()
      scheduleFallbackNavigation(event, href)
    },
    [onCloseMenus]
  )

  const handleSignOut = useCallback(() => {
    hapticMedium()
    onCloseMenus()
    signOut({ callbackUrl: '/login' })
  }, [onCloseMenus])

  const handleOpenSearch = useCallback(() => {
    hapticLight()
    const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true })
    document.dispatchEvent(event)
  }, [])

  return (
    <div className="hidden shrink-0 items-center gap-1 md:flex">
      {primaryAction && (
        <Link
          href={primaryAction.href}
          onClick={(event) => handleNavClick(event, primaryAction.href)}
          className="mr-1 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 px-3.5 py-2 text-sm font-medium text-white shadow-lg shadow-teal-500/20 transition-all hover:shadow-teal-500/35 hover:brightness-110"
        >
          <primaryAction.icon className="h-4 w-4" />
          <span className="hidden xl:inline">{primaryAction.label}</span>
        </Link>
      )}

      <button
        onClick={handleOpenSearch}
        className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition-all hover:bg-white/10 hover:text-white"
        title="Поиск (Ctrl+K)"
        aria-label="Открыть поиск"
      >
        <Search className="h-4 w-4" />
      </button>

      <ThemeToggle />

      {user && (
        <>
          <Notifications />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                onClick={() => {
                  hapticLight()
                  onCloseMenus()
                }}
                className="group relative ml-0.5 flex h-9 items-center gap-2 rounded-full border border-white/10 bg-white/5 py-0.5 pl-0.5 pr-2 text-slate-200 transition-all hover:border-white/20 hover:bg-white/10"
                title={`${user.name || user.email || 'Профиль'}${user.role ? ` · ${user.role}` : ''}`}
                aria-label="Открыть меню профиля"
              >
                {user.image ? (
                  <Image
                    src={user.image}
                    alt={user.name || user.email || 'User'}
                    width={32}
                    height={32}
                    className="h-8 w-8 rounded-full object-cover ring-2 ring-transparent transition-all group-hover:ring-teal-400/60"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-slate-700 to-slate-800 ring-2 ring-transparent transition-all group-hover:ring-teal-400/60">
                    <User className="h-4 w-4 text-slate-300" />
                  </div>
                )}
                <span className="absolute -bottom-0.5 -left-0.5 h-2.5 w-2.5 rounded-full border-2 border-slate-900 bg-emerald-500" />
                {roleBadge && (
                  <span
                    className={`absolute -left-1 -top-1 rounded px-1 py-px text-[8px] font-bold uppercase leading-none ring-1 ${roleBadge.className}`}
                  >
                    {user.role === 'SUPERADMIN' ? 'SA' : 'A'}
                  </span>
                )}
                <span className="hidden max-w-[8rem] truncate text-sm font-medium text-white xl:inline">
                  {user.name || 'Профиль'}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400 transition-transform group-data-[state=open]:rotate-180" />
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="end"
              sideOffset={10}
              className="w-64 rounded-2xl border-white/10 bg-slate-900/95 p-1.5 text-slate-100 shadow-2xl shadow-black/30 backdrop-blur-xl"
            >
              <DropdownMenuLabel className="px-3 py-2">
                <div className="space-y-0.5">
                  <div className="truncate text-sm font-semibold text-white">
                    {user.name || 'Пользователь'}
                  </div>
                  <div className="truncate text-xs font-normal text-slate-400">{user.email}</div>
                </div>
              </DropdownMenuLabel>

              <DropdownMenuSeparator className="mx-2 my-1 bg-white/10" />

              <DropdownMenuItem asChild>
                <Link
                  href="/profile"
                  onClick={(event) => handleNavClick(event, '/profile')}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-200 outline-none transition-colors hover:bg-white/5 hover:text-white"
                >
                  <User className="h-4 w-4 text-slate-400" />
                  <span>Профиль</span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-rose-300 outline-none transition-colors hover:bg-rose-500/10 hover:text-rose-200"
                >
                  <LogOut className="h-4 w-4 text-rose-400" />
                  <span>Выйти</span>
                </button>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )}
    </div>
  )
})

interface HeaderMobileActionsProps {
  user?: {
    name?: string | null
    email?: string | null
    image?: string | null
  } | null
  primaryAction?: PrimaryAction | null
  onOpenSearch: () => void
  onCloseMenus: () => void
}

export const HeaderMobileActions = memo(function HeaderMobileActions({
  user,
  primaryAction,
  onOpenSearch,
  onCloseMenus,
}: HeaderMobileActionsProps) {
  const handleNavClick = useCallback(
    (event: MouseEvent<HTMLElement>, href?: string) => {
      hapticLight()
      onCloseMenus()
      scheduleFallbackNavigation(event, href)
    },
    [onCloseMenus]
  )

  return (
    <div className="flex items-center gap-1.5 md:hidden">
      <button
        onClick={() => {
          hapticLight()
          onOpenSearch()
        }}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-all hover:bg-white/10 hover:text-white"
        aria-label="Поиск"
      >
        <Search className="h-5 w-5" />
      </button>

      {primaryAction && (
        <Link
          href={primaryAction.href}
          onClick={(event) => handleNavClick(event, primaryAction.href)}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-lg shadow-teal-500/25"
          aria-label={primaryAction.label}
        >
          <primaryAction.icon className="h-5 w-5" />
        </Link>
      )}

      <ThemeToggle />

      {user && <Notifications />}
    </div>
  )
})
