import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { LetterStatus } from '@prisma/client'

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
    queryKey: ['letters', params],
    queryFn: async () => {
      const res = await fetch(`/api/letters?${searchParams}`)
      if (!res.ok) throw new Error('Failed to fetch letters')
      return res.json()
    },
  })
}

// Получение одного письма
export function useLetter(id: string | null) {
  return useQuery({
    queryKey: ['letter', id],
    queryFn: async () => {
      if (!id) return null
      const res = await fetch(`/api/letters/${id}`)
      if (!res.ok) throw new Error('Failed to fetch letter')
      return res.json()
    },
    enabled: !!id,
  })
}

// Обновление письма
export function useUpdateLetter() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, field, value }: { id: string; field: string; value: string }) => {
      const res = await fetch(`/api/letters/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field, value }),
      })
      if (!res.ok) throw new Error('Failed to update letter')
      return res.json()
    },
    onSuccess: (_, variables) => {
      // Инвалидировать кеш письма и списка
      queryClient.invalidateQueries({ queryKey: ['letter', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['letters'] })
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
      queryClient.invalidateQueries({ queryKey: ['letters'] })
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
      queryClient.invalidateQueries({ queryKey: ['letters'] })
    },
  })
}

// Массовые операции
export function useBulkAction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ ids, action, value }: { ids: string[]; action: string; value?: string }) => {
      const res = await fetch('/api/letters/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, action, value }),
      })
      if (!res.ok) throw new Error('Failed to perform bulk action')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['letters'] })
    },
  })
}

// Избранное
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
    onSuccess: (_, letterId) => {
      queryClient.invalidateQueries({ queryKey: ['letter', letterId] })
      queryClient.invalidateQueries({ queryKey: ['letters'] })
    },
  })
}
