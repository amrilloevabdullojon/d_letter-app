'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useDebouncedState } from '@/hooks/useDebounce'
import { SEARCH_DEBOUNCE_MS } from '@/lib/constants'
import type { LetterStatus } from '@/types/prisma'

interface Letter {
  id: string
  number: string
  org: string
  date: string
  deadlineDate: string
  status: LetterStatus
  type: string | null
  content: string | null
  priority: number
  jiraLink: string | null
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

interface LettersResponse {
  letters: Letter[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

interface LettersParams {
  page?: number
  limit?: number
  status?: LetterStatus | 'all'
  filter?: string
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

/**
 * Единая иерархия ключей кэша для писем.
 * Используется во всех хуках и мутациях — гарантирует,
 * что invalidateQueries с parent-ключом сбрасывает все дочерние.
 */
export const letterKeys = {
  all: ['letters'] as const,
  lists: () => [...letterKeys.all, 'list'] as const,
  list: (params: LettersParams) => [...letterKeys.lists(), params] as const,
  details: () => [...letterKeys.all, 'detail'] as const,
  detail: (id: string) => [...letterKeys.details(), id] as const,
}

// Получение списка писем
export function useLetters(params: LettersParams = {}) {
  const searchParams = new URLSearchParams()

  if (params.page) searchParams.set('page', String(params.page))
  if (params.limit) searchParams.set('limit', String(params.limit))
  if (params.status && params.status !== 'all') searchParams.set('status', params.status)
  if (params.filter) searchParams.set('filter', params.filter)
  if (params.search) searchParams.set('search', params.search)
  if (params.sortBy) searchParams.set('sortBy', params.sortBy)
  if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder)

  return useQuery<LettersResponse>({
    queryKey: letterKeys.list(params),
    queryFn: async () => {
      const res = await fetch(`/api/letters?${searchParams}`)
      if (!res.ok) throw new Error('Failed to fetch letters')
      return res.json()
    },
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000,
  })
}

/**
 * Hook for search with debounce.
 * Returns [immediateValue, debouncedValue, setValue]
 */
export function useLetterSearch() {
  return useDebouncedState('', SEARCH_DEBOUNCE_MS)
}

// Получение одного письма
export function useLetter(id: string | null) {
  return useQuery({
    queryKey: letterKeys.detail(id ?? ''),
    queryFn: async () => {
      if (!id) return null
      const res = await fetch(`/api/letters/${id}`)
      if (!res.ok) throw new Error('Failed to fetch letter')
      return res.json()
    },
    enabled: !!id,
    staleTime: 60 * 1000, // 1 minute
  })
}

// Обновление письма с оптимистичным обновлением
export function useUpdateLetter() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      field,
      value,
    }: {
      id: string
      field: string
      value: string | null
    }) => {
      const res = await fetch(`/api/letters/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field, value }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update letter')
      }
      return res.json()
    },
    onMutate: async ({ id, field, value }) => {
      await queryClient.cancelQueries({ queryKey: letterKeys.detail(id) })
      const previousLetter = queryClient.getQueryData(letterKeys.detail(id))
      queryClient.setQueryData(
        letterKeys.detail(id),
        (old: Record<string, unknown> | undefined) => {
          if (!old) return old
          return { ...old, [field]: value }
        }
      )
      return { previousLetter }
    },
    onError: (_err, variables, context) => {
      if (context?.previousLetter) {
        queryClient.setQueryData(letterKeys.detail(variables.id), context.previousLetter)
      }
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({ queryKey: letterKeys.detail(variables.id) })
      queryClient.invalidateQueries({ queryKey: letterKeys.lists() })
      // Дашборд тоже содержит данные о письмах — сбрасываем
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
    },
  })
}

// Удаление письма
export function useDeleteLetter() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/letters/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete letter')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: letterKeys.lists() })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
    },
  })
}

// Дублирование письма
export function useDuplicateLetter() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/letters/${id}/duplicate`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to duplicate letter')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: letterKeys.lists() })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
    },
  })
}

// Массовые операции
export function useBulkAction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      ids,
      action,
      value,
    }: {
      ids: string[]
      action: string
      value?: string
    }) => {
      const res = await fetch('/api/letters/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, action, value }),
      })
      if (!res.ok) throw new Error('Failed to perform bulk action')
      return res.json()
    },
    onSuccess: (_, { ids }) => {
      // Инвалидировать все списки писем (включая фильтрованные)
      queryClient.invalidateQueries({ queryKey: letterKeys.lists() })
      // Детали каждого изменённого письма
      ids.forEach((id) => {
        queryClient.invalidateQueries({ queryKey: letterKeys.detail(id) })
      })
      // Дашборд и статистика — bulk-операции меняют счётчики
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
    },
  })
}

// Избранное с оптимистичным обновлением
export function useToggleFavorite() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (letterId: string) => {
      const res = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ letterId }),
      })
      if (!res.ok) throw new Error('Failed to toggle favorite')
      return res.json()
    },
    onMutate: async (letterId) => {
      await queryClient.cancelQueries({ queryKey: letterKeys.detail(letterId) })
      const previousLetter = queryClient.getQueryData(letterKeys.detail(letterId))
      queryClient.setQueryData(
        letterKeys.detail(letterId),
        (old: Record<string, unknown> | undefined) => {
          if (!old) return old
          return { ...old, isFavorite: !old.isFavorite }
        }
      )
      return { previousLetter }
    },
    onError: (_err, letterId, context) => {
      if (context?.previousLetter) {
        queryClient.setQueryData(letterKeys.detail(letterId), context.previousLetter)
      }
    },
    onSettled: (_, __, letterId) => {
      queryClient.invalidateQueries({ queryKey: letterKeys.detail(letterId) })
      queryClient.invalidateQueries({ queryKey: letterKeys.lists() })
    },
  })
}

// Добавление комментария
export function useAddComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ letterId, text }: { letterId: string; text: string }) => {
      const res = await fetch(`/api/letters/${letterId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (!res.ok) throw new Error('Failed to add comment')
      return res.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: letterKeys.detail(variables.letterId) })
    },
  })
}

// Создание письма
export function useCreateLetter() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch('/api/letters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to create letter')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: letterKeys.lists() })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
    },
  })
}
