import type { LetterStatus } from '@/types/prisma'

export interface Letter {
  id: string
  number: string
  org: string
  date: string
  deadlineDate: string
  status: LetterStatus
  type: string | null
  content: string | null
  priority: number
  owner: {
    id: string
    name: string | null
    email: string | null
  } | null
  _count: {
    comments: number
    watchers: number
  }
}

export interface User {
  id: string
  name: string | null
  email: string | null
}

export interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export type ViewMode = 'cards' | 'table' | 'kanban'
export type SortField = 'created' | 'deadline' | 'date' | 'number' | 'org' | 'status' | 'priority'

export type SavedView = {
  id: string
  name: string
  filters: {
    search: string
    status: LetterStatus | 'all'
    quickFilter: string
    owner: string
    type: string
    sortBy: SortField
    sortOrder: 'asc' | 'desc'
    viewMode: ViewMode
  }
}

export type SearchSuggestion = {
  id: string
  number: string
  org: string
  status: LetterStatus
  deadlineDate: string
}

export type InitialFilters = {
  page: number
  limit: number
  status: LetterStatus | 'all'
  quickFilter: string
  owner: string
  type: string
  sortBy: SortField
  sortOrder: 'asc' | 'desc'
  search: string
}

export type LettersInitialData = {
  letters: Letter[]
  pagination: Pagination | null
  users: User[]
  filters: InitialFilters
  canManageUsers: boolean
  initialCacheKey?: string
}

export const STATUSES: (LetterStatus | 'all')[] = [
  'all',
  'NOT_REVIEWED',
  'ACCEPTED',
  'IN_PROGRESS',
  'CLARIFICATION',
  'READY',
  'DONE',
]

export const LETTERS_CACHE_TTL = 15 * 1000
export const USERS_CACHE_TTL = 5 * 60 * 1000

export const pluralizeLetters = (count: number) => {
  const value = Math.abs(count) % 100
  const lastDigit = value % 10

  if (value > 10 && value < 20) return 'писем'
  if (lastDigit === 1) return 'письмо'
  if (lastDigit > 1 && lastDigit < 5) return 'письма'
  return 'писем'
}
