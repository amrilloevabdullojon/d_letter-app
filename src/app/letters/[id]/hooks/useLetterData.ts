'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Letter, Neighbors, CommentItem } from '../types'

const COMMENTS_PAGE_SIZE = 10

interface UseLetterDataOptions {
  letterId: string
  onCommentsLoaded?: (comments: CommentItem[], hasMore: boolean, total: number | null) => void
}

interface UseLetterDataReturn {
  letter: Letter | null
  neighbors: Neighbors | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  updateLetter: (updates: Partial<Letter>) => void
}

export function useLetterData({
  letterId,
  onCommentsLoaded,
}: UseLetterDataOptions): UseLetterDataReturn {
  const router = useRouter()
  const [letter, setLetter] = useState<Letter | null>(null)
  const [neighbors, setNeighbors] = useState<Neighbors | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const loadLetter = useCallback(async () => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    try {
      setError(null)
      const query = new URLSearchParams({
        commentsPage: '1',
        commentsLimit: String(COMMENTS_PAGE_SIZE),
        summary: '1',
        commentsPreview: '1',
        neighbors: '1',
      })

      const res = await fetch(`/api/letters/${letterId}?${query.toString()}`, {
        signal: controller.signal,
      })

      if (res.ok) {
        const data = await res.json()
        setLetter(data)
        setNeighbors(data?.neighbors ?? null)

        // Pass comments to callback
        const previewComments = Array.isArray(data?.comments) ? data.comments : []
        const total =
          typeof data?.commentsPagination?.total === 'number' ? data.commentsPagination.total : null
        const hasMore = Boolean(data?.commentsPagination?.hasMore)
        onCommentsLoaded?.(previewComments, hasMore, total)
      } else if (res.status === 403 || res.status === 404) {
        router.push('/letters')
      } else {
        setError('Не удалось загрузить письмо')
      }
    } catch (err) {
      if ((err as DOMException).name === 'AbortError') return
      console.error('Failed to load letter:', err)
      setError('Не удалось загрузить письмо')
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false)
      }
    }
  }, [letterId, router, onCommentsLoaded])

  const updateLetter = useCallback((updates: Partial<Letter>) => {
    setLetter((prev) => (prev ? { ...prev, ...updates } : null))
  }, [])

  useEffect(() => {
    loadLetter()
    return () => {
      abortRef.current?.abort()
    }
  }, [loadLetter])

  // Prefetch neighbors
  useEffect(() => {
    if (!neighbors) return
    if (neighbors.prev?.id) {
      router.prefetch(`/letters/${neighbors.prev.id}`)
    }
    if (neighbors.next?.id) {
      router.prefetch(`/letters/${neighbors.next.id}`)
    }
  }, [neighbors, router])

  return {
    letter,
    neighbors,
    loading,
    error,
    refresh: loadLetter,
    updateLetter,
  }
}
