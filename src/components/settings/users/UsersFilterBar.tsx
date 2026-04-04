'use client'

import { Search, Download } from 'lucide-react'
import { fieldBase, UserRole, ROLE_OPTIONS } from '@/lib/settings-types'

interface UsersFilterBarProps {
  quickFilters: { id: string; label: string; active: boolean; onClick: () => void }[]
  searchQuery: string
  setSearchQuery: (val: string) => void
  roleFilter: string
  setRoleFilter: (val: 'all' | UserRole) => void
  accessFilter: string
  setAccessFilter: (val: 'all' | 'active' | 'invited' | 'blocked') => void
  emailFilter: string
  setEmailFilter: (val: 'all' | 'has' | 'none') => void
  telegramFilter: string
  setTelegramFilter: (val: 'all' | 'has' | 'none') => void
  roleOptions: typeof ROLE_OPTIONS

  hasFilters: boolean
  resetFilters: () => void
  exportUsers: () => void
  searchSuggestions: string[]
  filteredUsersCount: number
  visibleTotal: number
}

export function UsersFilterBar({
  quickFilters,
  searchQuery,
  setSearchQuery,
  roleFilter,
  setRoleFilter,
  accessFilter,
  setAccessFilter,
  emailFilter,
  setEmailFilter,
  telegramFilter,
  setTelegramFilter,
  roleOptions,
  hasFilters,
  resetFilters,
  exportUsers,
  searchSuggestions,
  filteredUsersCount,
  visibleTotal,
}: UsersFilterBarProps) {
  return (
    <div className="panel-soft panel-glass mb-6 rounded-2xl p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-xs uppercase tracking-wide text-slate-500">Быстрые фильтры</span>
        {quickFilters.map((filter) => (
          <button
            key={filter.id}
            onClick={filter.onClick}
            className={`rounded-full border px-3 py-1 text-xs transition ${
              filter.active
                ? 'border-teal-400/40 bg-teal-500/15 text-teal-200'
                : 'border-white/10 text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`${fieldBase} w-full py-2 pl-9 pr-3`}
            placeholder="Поиск по имени, email, Telegram"
            list="users-search-suggestions"
            aria-label="Поиск пользователей"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as 'all' | UserRole)}
          className={`${fieldBase} w-full px-3 py-2`}
          aria-label="Фильтр по роли"
        >
          <option value="all">Все роли</option>
          {roleOptions.map((role) => (
            <option key={role.value} value={role.value}>
              {role.label}
            </option>
          ))}
        </select>
        <select
          value={accessFilter}
          onChange={(e) =>
            setAccessFilter(e.target.value as 'all' | 'active' | 'invited' | 'blocked')
          }
          className={`${fieldBase} w-full px-3 py-2`}
          aria-label="Фильтр по статусу"
        >
          <option value="all">Все статусы</option>
          <option value="active">Активные</option>
          <option value="invited">Приглашены</option>
          <option value="blocked">Блокированы</option>
        </select>
        <select
          value={emailFilter}
          onChange={(e) => setEmailFilter(e.target.value as 'all' | 'has' | 'none')}
          className={`${fieldBase} w-full px-3 py-2`}
          aria-label="Фильтр по email"
        >
          <option value="all">Все email</option>
          <option value="has">С email</option>
          <option value="none">Без email</option>
        </select>
        <select
          value={telegramFilter}
          onChange={(e) => setTelegramFilter(e.target.value as 'all' | 'has' | 'none')}
          className={`${fieldBase} w-full px-3 py-2`}
          aria-label="Фильтр по Telegram"
        >
          <option value="all">Все Telegram</option>
          <option value="has">С Telegram</option>
          <option value="none">Без Telegram</option>
        </select>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
        <span>
          Показано {filteredUsersCount} из {visibleTotal}
        </span>
        <div className="flex items-center gap-3">
          {hasFilters && (
            <button onClick={resetFilters} className="text-teal-400 transition hover:text-teal-300">
              Сбросить фильтры
            </button>
          )}
          <button
            onClick={exportUsers}
            className="inline-flex items-center gap-1 text-slate-400 transition hover:text-white"
            title="Экспорт в CSV"
          >
            <Download className="h-4 w-4" />
            CSV
          </button>
        </div>
      </div>
      <datalist id="users-search-suggestions">
        {searchSuggestions.map((value) => (
          <option key={value} value={value} />
        ))}
      </datalist>
    </div>
  )
}
