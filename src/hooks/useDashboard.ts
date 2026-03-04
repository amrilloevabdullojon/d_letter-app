import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { LetterStatus } from '@/types/prisma'

/**
 * Типы для дашборда
 */
export interface DashboardStats {
  summary: {
    total: number
    overdue: number
    urgent: number
    done: number
    inProgress: number
  }
  byStatus: Record<LetterStatus, number>
}

export interface DashboardLetter {
  id: string
  number: string
  org: string
  date: string
  deadlineDate: string
  status: LetterStatus
  type: string | null
  owner: {
    name: string | null
    email: string | null
  } | null
}

/**
 * Query keys для дашборда.
 * Корневой ключ ['dashboard'] — при инвалидации сбрасывает все подзапросы.
 */
export const dashboardKeys = {
  all: ['dashboard'] as const,
  stats: () => [...dashboardKeys.all, 'stats'] as const,
  recent: () => [...dashboardKeys.all, 'recent'] as const,
  urgent: () => [...dashboardKeys.all, 'urgent'] as const,
  overdue: () => [...dashboardKeys.all, 'overdue'] as const,
  unassigned: () => [...dashboardKeys.all, 'unassigned'] as const,
}

// Единый staleTime для всех запросов дашборда.
// Согласованность данных важнее экономии запросов.
const DASHBOARD_STALE_MS = 30 * 1000 // 30 секунд

/**
 * Hook для получения статистики дашборда
 */
export function useDashboardStats() {
  return useQuery({
    queryKey: dashboardKeys.stats(),
    queryFn: async (): Promise<DashboardStats> => {
      const res = await fetch('/api/stats')
      if (!res.ok) {
        throw new Error('Failed to fetch stats')
      }
      return res.json()
    },
    staleTime: DASHBOARD_STALE_MS,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  })
}

/**
 * Hook для получения последних писем
 */
export function useRecentLetters(limit = 5) {
  return useQuery({
    queryKey: [...dashboardKeys.recent(), limit],
    queryFn: async (): Promise<{ letters: DashboardLetter[] }> => {
      const res = await fetch(`/api/letters?limit=${limit}&sortBy=createdAt&sortOrder=desc`)
      if (!res.ok) {
        throw new Error('Failed to fetch recent letters')
      }
      return res.json()
    },
    staleTime: DASHBOARD_STALE_MS,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  })
}

/**
 * Hook для получения срочных писем
 */
export function useUrgentLetters(limit = 5) {
  return useQuery({
    queryKey: [...dashboardKeys.urgent(), limit],
    queryFn: async (): Promise<{ letters: DashboardLetter[] }> => {
      const res = await fetch(`/api/letters?filter=urgent&limit=${limit}`)
      if (!res.ok) {
        throw new Error('Failed to fetch urgent letters')
      }
      return res.json()
    },
    staleTime: DASHBOARD_STALE_MS,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  })
}

/**
 * Hook для получения просроченных писем
 */
export function useOverdueLetters(limit = 5) {
  return useQuery({
    queryKey: [...dashboardKeys.overdue(), limit],
    queryFn: async (): Promise<{ letters: DashboardLetter[] }> => {
      const res = await fetch(`/api/letters?filter=overdue&limit=${limit}`)
      if (!res.ok) {
        throw new Error('Failed to fetch overdue letters')
      }
      return res.json()
    },
    staleTime: DASHBOARD_STALE_MS,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  })
}

/**
 * Hook для получения неназначенных писем
 */
export function useUnassignedLetters(limit = 5) {
  return useQuery({
    queryKey: [...dashboardKeys.unassigned(), limit],
    queryFn: async (): Promise<{ letters: DashboardLetter[] }> => {
      const res = await fetch(`/api/letters?filter=unassigned&limit=${limit}`)
      if (!res.ok) {
        throw new Error('Failed to fetch unassigned letters')
      }
      return res.json()
    },
    staleTime: DASHBOARD_STALE_MS,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  })
}

/**
 * Hook для загрузки всех данных дашборда параллельно
 */
export function useDashboard() {
  const stats = useDashboardStats()
  const recent = useRecentLetters()
  const urgent = useUrgentLetters()
  const overdue = useOverdueLetters()
  const unassigned = useUnassignedLetters()

  return {
    stats: stats.data,
    recent: recent.data?.letters || [],
    urgent: urgent.data?.letters || [],
    overdue: overdue.data?.letters || [],
    unassigned: unassigned.data?.letters || [],
    isLoading:
      stats.isLoading ||
      recent.isLoading ||
      urgent.isLoading ||
      overdue.isLoading ||
      unassigned.isLoading,
    isError:
      stats.isError || recent.isError || urgent.isError || overdue.isError || unassigned.isError,
    error: stats.error || recent.error || urgent.error || overdue.error || unassigned.error,
  }
}

/**
 * Хелпер для ручной инвалидации всего дашборда.
 * Используй после мутаций, которые меняют письма/заявки.
 */
export function useInvalidateDashboard() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: dashboardKeys.all })
}
