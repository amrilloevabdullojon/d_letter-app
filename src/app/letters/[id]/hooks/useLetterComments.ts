'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useToast } from '@/components/Toast'
import type { CommentItem, CommentEditItem, CommentFilter } from '../types'

const COMMENTS_PAGE_SIZE = 10

type CommentTreeUpdateResult = { items: CommentItem[]; updated: boolean }
type CommentTreeRemoveResult = { items: CommentItem[]; removed: boolean }

const updateCommentInTree = (
  items: CommentItem[],
  commentId: string,
  updater: (comment: CommentItem) => CommentItem
): CommentTreeUpdateResult => {
  let updated = false
  const nextItems = items.map((comment) => {
    if (comment.id === commentId) {
      updated = true
      return updater(comment)
    }
    if (comment.replies && comment.replies.length > 0) {
      const childResult = updateCommentInTree(comment.replies, commentId, updater)
      if (childResult.updated) {
        updated = true
        return { ...comment, replies: childResult.items }
      }
    }
    return comment
  })
  return { items: updated ? nextItems : items, updated }
}

const removeCommentFromTree = (
  items: CommentItem[],
  commentId: string
): CommentTreeRemoveResult => {
  let removed = false
  const nextItems: CommentItem[] = []
  for (const comment of items) {
    if (comment.id === commentId) {
      removed = true
      continue
    }
    if (comment.replies && comment.replies.length > 0) {
      const childResult = removeCommentFromTree(comment.replies, commentId)
      if (childResult.removed) {
        removed = true
        nextItems.push({ ...comment, replies: childResult.items })
        continue
      }
    }
    nextItems.push(comment)
  }
  return { items: removed ? nextItems : items, removed }
}

interface UseLetterCommentsOptions {
  letterId: string | null
  currentUserId: string
  canManageLetters: boolean
}

interface UseLetterCommentsReturn {
  comments: CommentItem[]
  filter: CommentFilter
  includeReplies: boolean
  page: number
  hasMore: boolean
  total: number | null
  loading: boolean
  error: string | null
  submitting: boolean
  editingId: string | null
  editingText: string
  expandedReplyIds: string[]
  expandedHistoryIds: string[]
  commentHistory: Record<string, CommentEditItem[]>
  historyLoading: Record<string, boolean>
  historyError: Record<string, string>
  replyCache: Record<string, CommentItem[]>
  replyLoading: Record<string, boolean>
  setComments: (comments: CommentItem[]) => void
  setFilter: (filter: CommentFilter) => void
  setIncludeReplies: (value: boolean) => void
  setHasMore: (value: boolean) => void
  setTotal: (value: number | null) => void
  loadComments: (page?: number, append?: boolean) => Promise<void>
  refreshComments: () => void
  addComment: (
    text: string,
    author: { id: string; name: string | null; email: string | null }
  ) => Promise<boolean>
  startEdit: (comment: CommentItem) => void
  cancelEdit: () => void
  saveEdit: (commentId: string) => Promise<void>
  deleteComment: (commentId: string) => void
  setEditingText: (text: string) => void
  toggleReplyThread: (commentId: string, repliesCount: number) => void
  toggleCommentHistory: (commentId: string) => void
  canEditComment: (comment: CommentItem) => boolean
}

export function useLetterComments({
  letterId,
  currentUserId,
  canManageLetters,
}: UseLetterCommentsOptions): UseLetterCommentsReturn {
  const toast = useToast()

  const [comments, setComments] = useState<CommentItem[]>([])
  const [filter, setFilter] = useState<CommentFilter>('all')
  const [includeReplies, setIncludeReplies] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [total, setTotal] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')
  const [expandedReplyIds, setExpandedReplyIds] = useState<string[]>([])
  const [expandedHistoryIds, setExpandedHistoryIds] = useState<string[]>([])
  const [commentHistory, setCommentHistory] = useState<Record<string, CommentEditItem[]>>({})
  const [historyLoading, setHistoryLoading] = useState<Record<string, boolean>>({})
  const [historyError, setHistoryError] = useState<Record<string, string>>({})
  const [replyCache, setReplyCache] = useState<Record<string, CommentItem[]>>({})
  const [replyLoading, setReplyLoading] = useState<Record<string, boolean>>({})

  const abortRef = useRef<AbortController | null>(null)
  const cacheRef = useRef<
    Map<string, { items: CommentItem[]; hasMore: boolean; total: number | null }>
  >(new Map())
  const pendingDeleteRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const buildCacheKey = useCallback(
    (p: number) => `${letterId}:${p}:${includeReplies ? '1' : '0'}:${filter}`,
    [letterId, includeReplies, filter]
  )

  const resetCache = useCallback(() => {
    cacheRef.current.clear()
  }, [])

  const loadComments = useCallback(
    async (targetPage = 1, append = false) => {
      if (!letterId) return

      const cacheKey = buildCacheKey(targetPage)
      if (!append) {
        const cached = cacheRef.current.get(cacheKey)
        if (cached) {
          setComments(cached.items)
          setPage(targetPage)
          setHasMore(cached.hasMore)
          setTotal(cached.total)
          return
        }
      }

      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      setLoading(true)
      setError(null)

      try {
        const query = new URLSearchParams({
          page: String(targetPage),
          limit: String(COMMENTS_PAGE_SIZE),
          includeReplies: String(includeReplies),
        })
        if (filter === 'mine') {
          query.set('author', 'me')
        }

        const res = await fetch(`/api/letters/${letterId}/comments?${query.toString()}`, {
          signal: controller.signal,
        })
        if (!res.ok) throw new Error('Failed to load comments')

        const data = await res.json()
        const nextComments = Array.isArray(data.comments) ? data.comments : []
        const nextHasMore = Boolean(data.pagination?.hasMore)
        const nextTotal = typeof data.pagination?.total === 'number' ? data.pagination.total : null

        setComments((prev) => (append ? [...prev, ...nextComments] : nextComments))
        setPage(targetPage)
        setHasMore(nextHasMore)
        setTotal(nextTotal)

        if (!append) {
          cacheRef.current.set(cacheKey, {
            items: nextComments,
            hasMore: nextHasMore,
            total: nextTotal,
          })
        }
      } catch (err) {
        if ((err as DOMException).name === 'AbortError') return
        console.error('Failed to load comments:', err)
        setError('Не удалось загрузить комментарии')
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    },
    [letterId, filter, includeReplies, buildCacheKey]
  )

  const refreshComments = useCallback(() => {
    resetCache()
    void loadComments(1, false)
  }, [loadComments, resetCache])

  const addComment = useCallback(
    async (
      text: string,
      author: { id: string; name: string | null; email: string | null }
    ): Promise<boolean> => {
      if (!letterId || !text.trim()) return false
      setSubmitting(true)

      // Optimistic update
      const optimisticId = `optimistic-${Date.now()}`
      const optimisticComment: CommentItem = {
        id: optimisticId,
        text: text.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        author,
        replies: [],
      }
      setComments((prev) => [optimisticComment, ...prev])

      try {
        const res = await fetch(`/api/letters/${letterId}/comments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: text.trim() }),
        })
        const data = await res.json()

        if (!res.ok || !data.success) {
          // Revert optimistic update
          setComments((prev) => prev.filter((c) => c.id !== optimisticId))
          toast.error(data.error || 'Не удалось добавить комментарий')
          return false
        }

        // Replace optimistic with real comment
        setComments((prev) =>
          prev.map((c) => (c.id === optimisticId ? (data.comment as CommentItem) : c))
        )
        resetCache()
        toast.success('Комментарий добавлен')
        return true
      } catch (err) {
        console.error('Failed to add comment:', err)
        setComments((prev) => prev.filter((c) => c.id !== optimisticId))
        toast.error('Не удалось добавить комментарий')
        return false
      } finally {
        setSubmitting(false)
      }
    },
    [letterId, resetCache, toast]
  )

  const startEdit = useCallback((comment: CommentItem) => {
    setEditingId(comment.id)
    setEditingText(comment.text)
  }, [])

  const cancelEdit = useCallback(() => {
    setEditingId(null)
    setEditingText('')
  }, [])

  const saveEdit = useCallback(
    async (commentId: string) => {
      if (!letterId) return
      const trimmed = editingText.trim()
      if (!trimmed) {
        toast.error('Комментарий не может быть пустым')
        return
      }

      setSubmitting(true)
      try {
        const res = await fetch(`/api/letters/${letterId}/comments`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: commentId, text: trimmed }),
        })
        const data = await res.json().catch(() => null)

        if (!res.ok) {
          toast.error(data?.error || 'Не удалось обновить комментарий')
          return
        }

        const updatedAt =
          typeof data?.comment?.updatedAt === 'string'
            ? data.comment.updatedAt
            : new Date().toISOString()
        setComments((prev) => {
          const result = updateCommentInTree(prev, commentId, (c) => ({
            ...c,
            text: trimmed,
            updatedAt,
          }))
          return result.updated ? result.items : prev
        })

        if (data?.edit) {
          setCommentHistory((prev) => {
            const existing = prev[commentId]
            if (!existing) return prev
            return { ...prev, [commentId]: [data.edit as CommentEditItem, ...existing] }
          })
        }

        resetCache()
        cancelEdit()
        toast.success('Комментарий обновлен')
      } catch (err) {
        console.error('Failed to update comment:', err)
        toast.error('Ошибка при обновлении комментария')
      } finally {
        setSubmitting(false)
      }
    },
    [letterId, editingText, resetCache, cancelEdit, toast]
  )

  const finalizeDelete = useCallback(
    async (commentId: string) => {
      if (!letterId) return
      if (!pendingDeleteRef.current.has(commentId)) return
      pendingDeleteRef.current.delete(commentId)

      try {
        const res = await fetch(`/api/letters/${letterId}/comments`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: commentId }),
        })
        const data = await res.json().catch(() => null)
        if (!res.ok) {
          toast.error(data?.error || 'Не удалось удалить комментарий')
          refreshComments()
        }
      } catch (err) {
        console.error('Failed to delete comment:', err)
        toast.error('Ошибка при удалении комментария')
        refreshComments()
      }
    },
    [letterId, refreshComments, toast]
  )

  const undoDelete = useCallback(
    (commentId: string) => {
      const timerId = pendingDeleteRef.current.get(commentId)
      if (!timerId) return
      clearTimeout(timerId)
      pendingDeleteRef.current.delete(commentId)
      toast.info('Удаление отменено')
      refreshComments()
    },
    [refreshComments, toast]
  )

  const deleteComment = useCallback(
    (commentId: string) => {
      if (!letterId) return
      if (pendingDeleteRef.current.has(commentId)) return

      const isTopLevel = comments.some((c) => c.id === commentId)
      setComments((prev) => {
        const result = removeCommentFromTree(prev, commentId)
        return result.removed ? result.items : prev
      })
      resetCache()

      if (isTopLevel) {
        setTotal((prev) => (typeof prev === 'number' ? Math.max(0, prev - 1) : prev))
      }

      if (editingId === commentId) {
        cancelEdit()
      }

      toast.addToast({
        type: 'info',
        title: 'Комментарий удален',
        message: 'Можно отменить в течение нескольких секунд',
        duration: 5000,
        action: {
          label: 'Отменить',
          onClick: () => undoDelete(commentId),
        },
      })

      const timeoutId = setTimeout(() => {
        void finalizeDelete(commentId)
      }, 5000)
      pendingDeleteRef.current.set(commentId, timeoutId)
    },
    [letterId, comments, resetCache, editingId, cancelEdit, toast, undoDelete, finalizeDelete]
  )

  const loadReplies = useCallback(
    async (commentId: string) => {
      if (!letterId) return
      setReplyLoading((prev) => ({ ...prev, [commentId]: true }))

      try {
        const query = new URLSearchParams({ parentId: commentId, page: '1', limit: '50' })
        const res = await fetch(`/api/letters/${letterId}/comments?${query.toString()}`)
        if (!res.ok) throw new Error('Failed to load replies')

        const data = await res.json()
        const replies = Array.isArray(data.comments) ? data.comments : []
        setReplyCache((prev) => ({ ...prev, [commentId]: replies }))
      } catch (err) {
        console.error('Failed to load replies:', err)
      } finally {
        setReplyLoading((prev) => ({ ...prev, [commentId]: false }))
      }
    },
    [letterId]
  )

  const toggleReplyThread = useCallback(
    (commentId: string, repliesCount: number) => {
      if (includeReplies) return
      setExpandedReplyIds((prev) => {
        if (prev.includes(commentId)) {
          return prev.filter((id) => id !== commentId)
        }
        return [...prev, commentId]
      })
      if (!replyCache[commentId] && repliesCount > 0) {
        void loadReplies(commentId)
      }
    },
    [includeReplies, replyCache, loadReplies]
  )

  const loadHistory = useCallback(
    async (commentId: string) => {
      if (!letterId) return
      setHistoryLoading((prev) => ({ ...prev, [commentId]: true }))
      setHistoryError((prev) => {
        if (!prev[commentId]) return prev
        const next = { ...prev }
        delete next[commentId]
        return next
      })

      try {
        const res = await fetch(`/api/letters/${letterId}/comments/history?commentId=${commentId}`)
        const data = await res.json().catch(() => null)
        if (!res.ok) throw new Error(data?.error || 'Не удалось загрузить историю')

        setCommentHistory((prev) => ({
          ...prev,
          [commentId]: Array.isArray(data?.edits) ? data.edits : [],
        }))
      } catch (err) {
        console.error('Failed to load comment history:', err)
        setHistoryError((prev) => ({
          ...prev,
          [commentId]: 'Не удалось загрузить историю',
        }))
      } finally {
        setHistoryLoading((prev) => ({ ...prev, [commentId]: false }))
      }
    },
    [letterId]
  )

  const toggleCommentHistory = useCallback(
    (commentId: string) => {
      setExpandedHistoryIds((prev) => {
        if (prev.includes(commentId)) {
          return prev.filter((id) => id !== commentId)
        }
        return [...prev, commentId]
      })
      if (!commentHistory[commentId] && !historyLoading[commentId]) {
        void loadHistory(commentId)
      }
    },
    [commentHistory, historyLoading, loadHistory]
  )

  const canEditComment = useCallback(
    (comment: CommentItem) => {
      return canManageLetters || comment.author.id === currentUserId
    },
    [canManageLetters, currentUserId]
  )

  // Reset state when letter changes
  useEffect(() => {
    setFilter('all')
    setIncludeReplies(false)
    setReplyCache({})
    setReplyLoading({})
    setExpandedReplyIds([])
    setEditingId(null)
    setEditingText('')
    setCommentHistory({})
    setHistoryLoading({})
    setHistoryError({})
    setExpandedHistoryIds([])
    pendingDeleteRef.current.forEach((t) => clearTimeout(t))
    pendingDeleteRef.current.clear()
    resetCache()
  }, [letterId, resetCache])

  // Load comments when filter/replies change
  useEffect(() => {
    if (!letterId) return
    void loadComments(1, false)
  }, [letterId, filter, includeReplies, loadComments])

  // Обновление комментариев при возврате на вкладку (для синхронизации между пользователями)
  useEffect(() => {
    if (!letterId) return

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Очищаем кэш и перезагружаем комментарии при возврате на вкладку
        resetCache()
        void loadComments(1, false)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [letterId, loadComments, resetCache])

  // Cleanup
  useEffect(() => {
    return () => {
      abortRef.current?.abort()
      pendingDeleteRef.current.forEach((t) => clearTimeout(t))
      pendingDeleteRef.current.clear()
    }
  }, [])

  return {
    comments,
    filter,
    includeReplies,
    page,
    hasMore,
    total,
    loading,
    error,
    submitting,
    editingId,
    editingText,
    expandedReplyIds,
    expandedHistoryIds,
    commentHistory,
    historyLoading,
    historyError,
    replyCache,
    replyLoading,
    setComments,
    setFilter,
    setIncludeReplies,
    setHasMore,
    setTotal,
    loadComments,
    refreshComments,
    addComment,
    startEdit,
    cancelEdit,
    saveEdit,
    deleteComment,
    setEditingText,
    toggleReplyThread,
    toggleCommentHistory,
    canEditComment,
  }
}
