'use client'

import { useSession } from 'next-auth/react'
import { Header } from '@/components/Header'
import { StatusBadge } from '@/components/StatusBadge'
import { EditableField } from '@/components/EditableField'
import { SLAIndicator } from '@/components/SLAIndicator'
import { useConfirmDialog } from '@/components/ConfirmDialog'
import { QuickActionsMenu } from '@/components/QuickActionsMenu'
import dynamic from 'next/dynamic'

// Lazy load components that appear below the fold
const FileUpload = dynamic(
  () => import('@/components/FileUpload').then((mod) => ({ default: mod.FileUpload })),
  {
    loading: () => <div className="h-32 animate-pulse rounded-lg bg-white/5" />,
  }
)
const TemplateSelector = dynamic(
  () => import('@/components/TemplateSelector').then((mod) => ({ default: mod.TemplateSelector })),
  {
    loading: () => <div className="h-20 animate-pulse rounded-lg bg-white/5" />,
  }
)
const ActivityFeed = dynamic(
  () => import('@/components/ActivityFeed').then((mod) => ({ default: mod.ActivityFeed })),
  {
    loading: () => <div className="h-64 animate-pulse rounded-lg bg-white/5" />,
  }
)
const RelatedLetters = dynamic(
  () => import('@/components/RelatedLetters').then((mod) => ({ default: mod.RelatedLetters })),
  {
    loading: () => <div className="h-48 animate-pulse rounded-lg bg-white/5" />,
  }
)
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useParams, useRouter } from 'next/navigation'
import type { LetterStatus } from '@/types/prisma'
import {
  STATUS_LABELS,
  formatDate,
  getWorkingDaysUntilDeadline,
  addWorkingDays,
  parseDateValue,
  pluralizeDays,
  getPriorityLabel,
  isDoneStatus,
} from '@/lib/utils'
import { LETTER_TYPES } from '@/lib/constants'
import {
  ArrowLeft,
  Calendar,
  User,
  Clock,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CheckCircle2,
  Send,
  RefreshCw,
  Trash2,
  Copy,
  Printer,
  Star,
  Bell,
  MessageSquare,
  Link2,
  Pencil,
} from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/components/Toast'
import { useAuthRedirect } from '@/hooks/useAuthRedirect'
import { useOptimisticList } from '@/hooks/useOptimistic'
import { hasPermission } from '@/lib/permissions'

interface CommentItem {
  id: string
  text: string
  createdAt: string
  updatedAt: string
  author: {
    id: string
    name: string | null
    email: string | null
  }
  replies?: CommentItem[]
  _count?: {
    replies: number
  }
}

interface CommentEditItem {
  id: string
  oldText: string
  newText: string
  createdAt: string
  editor: {
    id: string
    name: string | null
    email: string | null
  }
}

interface Letter {
  id: string
  number: string
  org: string
  date: string
  deadlineDate: string
  status: LetterStatus
  type: string | null
  content: string | null
  comment: string | null
  contacts: string | null
  applicantName: string | null
  applicantEmail: string | null
  applicantPhone: string | null
  applicantTelegramChatId: string | null
  applicantAccessToken: string | null
  applicantAccessTokenExpiresAt: string | null
  priority: number
  jiraLink: string | null
  zordoc: string | null
  answer: string | null
  sendStatus: string | null
  ijroDate: string | null
  closeDate: string | null
  owner: {
    id: string
    name: string | null
    email: string | null
    telegramChatId?: string | null
  } | null
  files: Array<{
    id: string
    name: string
    url: string
    size?: number | null
    mimeType?: string | null
    status?: string | null
    uploadError?: string | null
  }>
  comments: CommentItem[]
  history: Array<{
    id: string
    field: string
    oldValue: string | null
    newValue: string | null
    createdAt: string
    user: {
      name: string | null
      email: string | null
    }
  }>
  isWatching: boolean
  isFavorite: boolean
}

const STATUSES: LetterStatus[] = [
  'NOT_REVIEWED',
  'ACCEPTED',
  'IN_PROGRESS',
  'CLARIFICATION',
  'READY',
  'DONE',
]

const COMMENTS_PAGE_SIZE = 10

type NeighborLetter = {
  id: string
  number: string
  org: string
}

const isEditableElement = (target: EventTarget | null) => {
  const element = target as HTMLElement | null
  if (!element) return false
  const tagName = element.tagName?.toLowerCase()
  if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') return true
  return element.isContentEditable
}

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

function LazySection({
  children,
  placeholder,
  rootMargin = '200px',
}: {
  children: ReactNode
  placeholder: ReactNode
  rootMargin?: string
}) {
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!ref.current || visible) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin }
    )
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [rootMargin, visible])

  return <div ref={ref}>{visible ? children : placeholder}</div>
}

export default function LetterDetailPage() {
  const { data: session, status: authStatus } = useSession()
  useAuthRedirect(authStatus)
  const canManageLetters = hasPermission(session?.user.role, 'MANAGE_LETTERS')
  const params = useParams()
  const router = useRouter()
  const { confirm: confirmDialog, Dialog } = useConfirmDialog()
  const toast = useToast()

  const [letter, setLetter] = useState<Letter | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [duplicating, setDuplicating] = useState(false)
  const [togglingFavorite, setTogglingFavorite] = useState(false)
  const [togglingWatch, setTogglingWatch] = useState(false)
  const [notifyingOwner, setNotifyingOwner] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [commentText, setCommentText] = useState('')
  const [commentsPage, setCommentsPage] = useState(1)
  const [commentsHasMore, setCommentsHasMore] = useState(false)
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [commentsError, setCommentsError] = useState<string | null>(null)
  const [commentsTotal, setCommentsTotal] = useState<number | null>(null)
  const [commentFilter, setCommentFilter] = useState<'all' | 'mine'>('all')
  const [includeReplies, setIncludeReplies] = useState(false)
  const [replyCache, setReplyCache] = useState<Record<string, CommentItem[]>>({})
  const [replyLoading, setReplyLoading] = useState<Record<string, boolean>>({})
  const [expandedReplyIds, setExpandedReplyIds] = useState<string[]>([])
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editingCommentText, setEditingCommentText] = useState('')
  const [commentActionState, setCommentActionState] = useState<{
    id: string
    action: 'edit' | 'delete'
  } | null>(null)
  const [commentHistory, setCommentHistory] = useState<Record<string, CommentEditItem[]>>({})
  const [commentHistoryLoading, setCommentHistoryLoading] = useState<Record<string, boolean>>({})
  const [commentHistoryError, setCommentHistoryError] = useState<Record<string, string>>({})
  const [expandedHistoryIds, setExpandedHistoryIds] = useState<string[]>([])
  const [neighbors, setNeighbors] = useState<{
    prev?: NeighborLetter
    next?: NeighborLetter
  } | null>(null)
  const commentInputRef = useRef<HTMLTextAreaElement>(null)
  const letterAbortRef = useRef<AbortController | null>(null)
  const commentsAbortRef = useRef<AbortController | null>(null)
  const neighborsAbortRef = useRef<AbortController | null>(null)
  const commentsCacheRef = useRef<
    Map<
      string,
      {
        items: CommentItem[]
        page: number
        hasMore: boolean
        total: number | null
      }
    >
  >(new Map())
  const commentsInFlightRef = useRef<Set<string>>(new Set())
  const pendingDeleteTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const {
    items: comments,
    add: addComment,
    pending: commentPending,
    setItems: setComments,
  } = useOptimisticList<CommentItem>([], {
    addFn: async (item) => {
      if (!letter) {
        throw new Error('Missing letter')
      }
      const res = await fetch(`/api/letters/${letter.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: item.text }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to add comment')
      }
      return data.comment as CommentItem
    },
    onError: (error) => {
      console.error(error)
      toast.error('Не удалось добавить комментарий')
    },
  })
  const isCommentSubmitting = commentPending.size > 0
  const [portalLink, setPortalLink] = useState('')
  const [portalLoading, setPortalLoading] = useState(false)

  useEffect(() => {
    document.body.style.overflow = ''
  }, [])

  useEffect(() => {
    return () => {
      letterAbortRef.current?.abort()
      commentsAbortRef.current?.abort()
      neighborsAbortRef.current?.abort()
      pendingDeleteTimersRef.current.forEach((timeoutId) => clearTimeout(timeoutId))
      pendingDeleteTimersRef.current.clear()
    }
  }, [])

  const loadLetter = useCallback(async () => {
    letterAbortRef.current?.abort()
    const controller = new AbortController()
    letterAbortRef.current = controller
    try {
      setLoadError(null)
      const query = new URLSearchParams({
        commentsPage: '1',
        commentsLimit: '1',
        summary: '1',
      })
      const res = await fetch(`/api/letters/${params.id}?${query.toString()}`, {
        signal: controller.signal,
      })
      if (res.ok) {
        const data = await res.json()
        setLetter(data)
      } else if (res.status === 403 || res.status === 404) {
        router.push('/letters')
      } else {
        setLoadError(
          '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u043f\u0438\u0441\u044c\u043c\u043e'
        )
      }
    } catch (error) {
      if ((error as DOMException).name === 'AbortError') {
        return
      }
      console.error('Failed to load letter:', error)
      setLoadError(
        '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u043f\u0438\u0441\u044c\u043c\u043e'
      )
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false)
      }
    }
  }, [params.id, router])

  const buildCommentsCacheKey = useCallback(
    (letterId: string, page: number, withReplies: boolean, filter: 'all' | 'mine') =>
      `${letterId}:${page}:${withReplies ? '1' : '0'}:${filter}`,
    []
  )

  const resetCommentsCache = useCallback(() => {
    commentsCacheRef.current.clear()
    commentsInFlightRef.current.clear()
  }, [])

  const loadComments = useCallback(
    async (
      page = 1,
      append = false,
      includeRepliesOverride?: boolean,
      options: { force?: boolean } = {}
    ) => {
      if (!letter?.id) return
      const withReplies = includeRepliesOverride ?? includeReplies
      const cacheKey = buildCommentsCacheKey(letter.id, page, withReplies, commentFilter)
      const requestKey = `${cacheKey}:${append ? 'append' : 'replace'}`
      if (!append && !options.force) {
        const cached = commentsCacheRef.current.get(cacheKey)
        if (cached) {
          setComments(cached.items)
          setCommentsPage(cached.page)
          setCommentsHasMore(cached.hasMore)
          setCommentsTotal(cached.total)
          return
        }
      }
      if (commentsInFlightRef.current.has(requestKey)) {
        return
      }
      commentsAbortRef.current?.abort()
      const controller = new AbortController()
      commentsAbortRef.current = controller
      commentsInFlightRef.current.add(requestKey)
      setCommentsLoading(true)
      setCommentsError(null)
      try {
        const query = new URLSearchParams({
          page: String(page),
          limit: String(COMMENTS_PAGE_SIZE),
          includeReplies: String(withReplies),
        })
        if (commentFilter === 'mine') {
          query.set('author', 'me')
        }
        const res = await fetch(`/api/letters/${letter.id}/comments?${query.toString()}`, {
          signal: controller.signal,
        })
        if (!res.ok) {
          throw new Error('Failed to load comments')
        }
        const data = await res.json()
        const nextComments = Array.isArray(data.comments) ? (data.comments as CommentItem[]) : []
        setComments((prev) => (append ? [...prev, ...nextComments] : nextComments))
        setCommentsPage(page)
        const hasMore = Boolean(data.pagination?.hasMore)
        const total = typeof data.pagination?.total === 'number' ? data.pagination.total : null
        setCommentsHasMore(hasMore)
        setCommentsTotal(total)
        if (!append) {
          commentsCacheRef.current.set(cacheKey, {
            items: nextComments,
            page,
            hasMore,
            total,
          })
        }
      } catch (error) {
        if ((error as DOMException).name === 'AbortError') {
          return
        }
        console.error('Failed to load comments:', error)
        setCommentsError(
          '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u043a\u043e\u043c\u043c\u0435\u043d\u0442\u0430\u0440\u0438\u0438'
        )
      } finally {
        commentsInFlightRef.current.delete(requestKey)
        if (!controller.signal.aborted) {
          setCommentsLoading(false)
        }
      }
    },
    [buildCommentsCacheKey, commentFilter, includeReplies, letter?.id, setComments]
  )

  const loadCommentReplies = useCallback(
    async (commentId: string) => {
      if (!letter?.id) return
      setReplyLoading((prev) => ({ ...prev, [commentId]: true }))
      try {
        const query = new URLSearchParams({
          parentId: commentId,
          page: '1',
          limit: '50',
        })
        const res = await fetch(`/api/letters/${letter.id}/comments?${query.toString()}`)
        if (!res.ok) {
          throw new Error('Failed to load replies')
        }
        const data = await res.json()
        const replies = Array.isArray(data.comments) ? (data.comments as CommentItem[]) : []
        setReplyCache((prev) => ({ ...prev, [commentId]: replies }))
      } catch (error) {
        console.error('Failed to load replies:', error)
      } finally {
        setReplyLoading((prev) => ({ ...prev, [commentId]: false }))
      }
    },
    [letter?.id]
  )

  const loadNeighbors = useCallback(async (currentId: string) => {
    neighborsAbortRef.current?.abort()
    const controller = new AbortController()
    neighborsAbortRef.current = controller
    try {
      const res = await fetch('/api/letters?limit=100&sortBy=created&sortOrder=desc', {
        signal: controller.signal,
      })
      if (!res.ok) {
        return
      }
      const data = await res.json()
      const list = Array.isArray(data.letters) ? (data.letters as Array<NeighborLetter>) : []
      const index = list.findIndex((item) => item.id === currentId)
      if (index < 0) {
        setNeighbors(null)
        return
      }
      setNeighbors({
        prev: list[index + 1],
        next: list[index - 1],
      })
    } catch (error) {
      if ((error as DOMException).name === 'AbortError') {
        return
      }
      console.error('Failed to load neighbors:', error)
      setNeighbors(null)
    }
  }, [])

  const refreshComments = useCallback(() => {
    resetCommentsCache()
    void loadComments(1, false, undefined, { force: true })
  }, [loadComments, resetCommentsCache])

  const handleRefresh = useCallback(() => {
    void loadLetter()
    refreshComments()
  }, [loadLetter, refreshComments])

  useEffect(() => {
    if (authStatus === 'authenticated' && params.id) {
      loadLetter()
    }
  }, [authStatus, params.id, loadLetter])

  useEffect(() => {
    setCommentFilter('all')
    setIncludeReplies(false)
    setReplyCache({})
    setReplyLoading({})
    setExpandedReplyIds([])
    setEditingCommentId(null)
    setEditingCommentText('')
    setCommentActionState(null)
    setCommentHistory({})
    setCommentHistoryLoading({})
    setCommentHistoryError({})
    setExpandedHistoryIds([])
    pendingDeleteTimersRef.current.forEach((timeoutId) => clearTimeout(timeoutId))
    pendingDeleteTimersRef.current.clear()
    resetCommentsCache()
    if (!letter?.id) {
      setComments([])
      setCommentsPage(1)
      setCommentsHasMore(false)
      setCommentsTotal(null)
      setCommentsError(null)
      return
    }
  }, [letter?.id, resetCommentsCache, setComments])

  useEffect(() => {
    if (!letter?.id) return
    void loadComments(1, false, includeReplies)
  }, [commentFilter, includeReplies, letter?.id, loadComments])

  useEffect(() => {
    if (!includeReplies) return
    setExpandedReplyIds([])
    setReplyCache({})
    setReplyLoading({})
  }, [includeReplies])

  useEffect(() => {
    if (!letter?.id) return
    loadNeighbors(letter.id)
  }, [letter?.id, loadNeighbors])

  useEffect(() => {
    if (!neighbors) return
    if (neighbors.prev?.id) {
      router.prefetch(`/letters/${neighbors.prev.id}`)
    }
    if (neighbors.next?.id) {
      router.prefetch(`/letters/${neighbors.next.id}`)
    }
  }, [neighbors, router])

  useEffect(() => {
    if (letter?.applicantAccessToken && typeof window !== 'undefined') {
      setPortalLink(`${window.location.origin}/portal/${letter.applicantAccessToken}`)
    } else {
      setPortalLink('')
    }
  }, [letter?.applicantAccessToken])

  const updateField = async (
    field: string,
    value: string,
    options: { throwOnError?: boolean } = {}
  ) => {
    if (!letter) return

    setUpdating(true)
    try {
      const res = await fetch(`/api/letters/${letter.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field, value }),
      })

      const data = await res.json().catch(() => null)
      if (!res.ok) {
        const message = data?.error || 'Не удалось обновить поле'
        toast.error(message)
        if (options.throwOnError) {
          throw new Error(message)
        }
        return
      }
      await loadLetter()
    } catch (error) {
      console.error('Failed to update:', error)
      if (options.throwOnError) {
        throw error
      }
    } finally {
      setUpdating(false)
    }
  }

  const saveField = (field: string, value: string) =>
    updateField(field, value, { throwOnError: true })

  const deleteLetter = useCallback(async () => {
    if (!letter) return

    setDeleting(true)
    try {
      const res = await fetch(`/api/letters/${letter.id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        toast.success('Письмо удалено')
        router.push('/letters')
      } else {
        toast.error('Не удалось удалить письмо')
      }
    } catch (error) {
      console.error('Failed to delete:', error)
      toast.error('Ошибка при удалении письма')
    } finally {
      setDeleting(false)
    }
  }, [letter, router, toast])

  const handleDelete = useCallback(() => {
    if (!letter) return
    confirmDialog({
      title: 'Удалить письмо?',
      message: 'Вы уверены, что хотите удалить это письмо? Это действие нельзя отменить.',
      confirmText: 'Удалить',
      variant: 'danger',
      onConfirm: deleteLetter,
    })
  }, [confirmDialog, deleteLetter, letter])

  const handleDuplicate = async () => {
    if (!letter) return

    setDuplicating(true)
    try {
      const res = await fetch(`/api/letters/${letter.id}/duplicate`, {
        method: 'POST',
      })

      const data = await res.json()

      if (data.success) {
        toast.success('Письмо скопировано')
        router.push(`/letters/${data.id}`)
      } else {
        toast.error(data.error || 'Не удалось дублировать письмо')
      }
    } catch (error) {
      console.error('Failed to duplicate:', error)
      toast.error('Ошибка при дублировании письма')
    } finally {
      setDuplicating(false)
    }
  }

  const handlePrint = useCallback(() => {
    window.print()
  }, [])

  const handleNotifyOwner = async () => {
    if (!letter) return
    if (!canManageLetters) {
      toast.error(
        '\u041d\u0435\u0434\u043e\u0441\u0442\u0430\u0442\u043e\u0447\u043d\u043e \u043f\u0440\u0430\u0432 \u0434\u043b\u044f \u043e\u0442\u043f\u0440\u0430\u0432\u043a\u0438 \u0443\u0432\u0435\u0434\u043e\u043c\u043b\u0435\u043d\u0438\u044f'
      )
      return
    }
    if (!letter.owner || !letter.owner.id) {
      toast.error(
        '\u041d\u0435\u0442 \u043d\u0430\u0437\u043d\u0430\u0447\u0435\u043d\u043d\u043e\u0433\u043e \u0441\u043e\u0442\u0440\u0443\u0434\u043d\u0438\u043a\u0430'
      )
      return
    }
    if (!letter.owner.telegramChatId) {
      toast.error(
        '\u0423 \u0438\u0441\u043f\u043e\u043b\u043d\u0438\u0442\u0435\u043b\u044f \u043d\u0435\u0442 Telegram ID'
      )
      return
    }

    setNotifyingOwner(true)
    const toastId = toast.loading(
      '\u041e\u0442\u043f\u0440\u0430\u0432\u043b\u044f\u0435\u043c \u0443\u0432\u0435\u0434\u043e\u043c\u043b\u0435\u043d\u0438\u0435...'
    )

    try {
      const res = await fetch(`/api/letters/${letter.id}/notify`, { method: 'POST' })
      const data = await res.json()

      if (res.ok && data.success) {
        toast.success(
          '\u0423\u0432\u0435\u0434\u043e\u043c\u043b\u0435\u043d\u0438\u0435 \u043e\u0442\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u043e',
          { id: toastId }
        )
      } else {
        toast.error(
          data.error ||
            '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u0442\u043f\u0440\u0430\u0432\u0438\u0442\u044c \u0443\u0432\u0435\u0434\u043e\u043c\u043b\u0435\u043d\u0438\u0435',
          { id: toastId }
        )
      }
    } catch (error) {
      console.error('Failed to notify owner:', error)
      toast.error(
        '\u041e\u0448\u0438\u0431\u043a\u0430 \u043e\u0442\u043f\u0440\u0430\u0432\u043a\u0438 \u0443\u0432\u0435\u0434\u043e\u043c\u043b\u0435\u043d\u0438\u044f',
        { id: toastId }
      )
    } finally {
      setNotifyingOwner(false)
    }
  }

  const handlePostponeDeadline = async () => {
    if (!letter) return

    const input = window.prompt(
      '\u041d\u0430 \u0441\u043a\u043e\u043b\u044c\u043a\u043e \u0440\u0430\u0431\u043e\u0447\u0438\u0445 \u0434\u043d\u0435\u0439 \u043f\u0435\u0440\u0435\u043d\u0435\u0441\u0442\u0438 \u0434\u0435\u0434\u043b\u0430\u0439\u043d?',
      '3'
    )
    if (!input) return

    const delta = Number.parseInt(input, 10)
    if (!Number.isFinite(delta) || delta === 0) {
      toast.error(
        '\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0447\u0438\u0441\u043b\u043e \u0440\u0430\u0431\u043e\u0447\u0438\u0445 \u0434\u043d\u0435\u0439'
      )
      return
    }

    const currentDeadline = parseDateValue(letter.deadlineDate)
    if (!currentDeadline) {
      toast.error(
        '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043f\u0440\u043e\u0447\u0438\u0442\u0430\u0442\u044c \u0434\u0430\u0442\u0443 \u0434\u0435\u0434\u043b\u0430\u0439\u043d\u0430'
      )
      return
    }

    const nextDeadline = addWorkingDays(currentDeadline, delta)
    try {
      await updateField('deadlineDate', nextDeadline.toISOString(), { throwOnError: true })
      toast.success(
        '\u0414\u0435\u0434\u043b\u0430\u0439\u043d \u043e\u0431\u043d\u043e\u0432\u043b\u0451\u043d'
      )
    } catch {
      // updateField already notifies on error
    }
  }

  const handleEscalate = async () => {
    if (!letter) return
    if (letter.priority >= 90) {
      toast.success(
        '\u041f\u0440\u0438\u043e\u0440\u0438\u0442\u0435\u0442 \u0443\u0436\u0435 \u0432\u044b\u0441\u043e\u043a\u0438\u0439'
      )
      return
    }

    try {
      await updateField('priority', '100', { throwOnError: true })
      toast.success(
        '\u041f\u0440\u0438\u043e\u0440\u0438\u0442\u0435\u0442 \u043f\u043e\u0432\u044b\u0448\u0435\u043d'
      )
      if (letter.owner?.id) {
        await handleNotifyOwner()
      }
    } catch {
      // updateField already notifies on error
    }
  }

  const handleGeneratePortalLink = async () => {
    if (!letter) return
    setPortalLoading(true)
    try {
      const res = await fetch(`/api/letters/${letter.id}/portal`, { method: 'POST' })
      const data = await res.json()

      if (res.ok && data.link) {
        setPortalLink(data.link)
        await loadLetter()
        toast.success(data.notified ? 'Ссылка отправлена заявителю' : 'Ссылка создана')
      } else {
        toast.error(data.error || 'Не удалось создать ссылку')
      }
    } catch (error) {
      console.error('Failed to create portal link:', error)
      toast.error('Ошибка создания ссылки')
    } finally {
      setPortalLoading(false)
    }
  }

  const handleCopyPortalLink = async () => {
    if (!portalLink) return
    try {
      await navigator.clipboard.writeText(portalLink)
      toast.success('Ссылка скопирована')
    } catch (error) {
      console.error('Failed to copy link:', error)
      toast.error('Не удалось скопировать ссылку')
    }
  }

  const startEditComment = useCallback((comment: CommentItem) => {
    setEditingCommentId(comment.id)
    setEditingCommentText(comment.text)
  }, [])

  const cancelEditComment = useCallback(() => {
    setEditingCommentId(null)
    setEditingCommentText('')
  }, [])

  const loadCommentHistory = useCallback(
    async (commentId: string) => {
      if (!letter?.id) return
      setCommentHistoryLoading((prev) => ({ ...prev, [commentId]: true }))
      setCommentHistoryError((prev) => {
        if (!prev[commentId]) return prev
        const next = { ...prev }
        delete next[commentId]
        return next
      })
      try {
        const res = await fetch(`/api/letters/${letter.id}/comments/history?commentId=${commentId}`)
        const data = await res.json().catch(() => null)
        if (!res.ok) {
          throw new Error(data?.error || 'Не удалось загрузить историю')
        }
        setCommentHistory((prev) => ({
          ...prev,
          [commentId]: Array.isArray(data?.edits) ? (data.edits as CommentEditItem[]) : [],
        }))
      } catch (error) {
        console.error('Failed to load comment history:', error)
        setCommentHistoryError((prev) => ({
          ...prev,
          [commentId]:
            '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u0438\u0441\u0442\u043e\u0440\u0438\u044e',
        }))
      } finally {
        setCommentHistoryLoading((prev) => ({ ...prev, [commentId]: false }))
      }
    },
    [letter?.id]
  )

  const toggleCommentHistory = useCallback(
    (commentId: string) => {
      setExpandedHistoryIds((prev) => {
        if (prev.includes(commentId)) {
          return prev.filter((id) => id !== commentId)
        }
        return [...prev, commentId]
      })
      if (!commentHistory[commentId] && !commentHistoryLoading[commentId]) {
        void loadCommentHistory(commentId)
      }
    },
    [commentHistory, commentHistoryLoading, loadCommentHistory]
  )

  const updateCommentState = useCallback(
    (commentId: string, updater: (comment: CommentItem) => CommentItem) => {
      setComments((prev) => {
        const result = updateCommentInTree(prev, commentId, updater)
        return result.updated ? result.items : prev
      })
      setReplyCache((prev) => {
        let changed = false
        const next: Record<string, CommentItem[]> = {}
        Object.entries(prev).forEach(([key, list]) => {
          const result = updateCommentInTree(list, commentId, updater)
          next[key] = result.updated ? result.items : list
          if (result.updated) {
            changed = true
          }
        })
        return changed ? next : prev
      })
    },
    [setComments, setReplyCache]
  )

  const removeCommentState = useCallback(
    (commentId: string) => {
      setComments((prev) => {
        const result = removeCommentFromTree(prev, commentId)
        return result.removed ? result.items : prev
      })
      setReplyCache((prev) => {
        let changed = false
        const next: Record<string, CommentItem[]> = { ...prev }
        if (commentId in next) {
          delete next[commentId]
          changed = true
        }
        Object.entries(prev).forEach(([key, list]) => {
          if (key === commentId) {
            return
          }
          const result = removeCommentFromTree(list, commentId)
          next[key] = result.removed ? result.items : list
          if (result.removed) {
            changed = true
          }
        })
        return changed ? next : prev
      })
      setExpandedReplyIds((prev) => prev.filter((id) => id !== commentId))
      setExpandedHistoryIds((prev) => prev.filter((id) => id !== commentId))
      setCommentHistory((prev) => {
        if (!prev[commentId]) return prev
        const next = { ...prev }
        delete next[commentId]
        return next
      })
      setCommentHistoryLoading((prev) => {
        if (!prev[commentId]) return prev
        const next = { ...prev }
        delete next[commentId]
        return next
      })
      setCommentHistoryError((prev) => {
        if (!prev[commentId]) return prev
        const next = { ...prev }
        delete next[commentId]
        return next
      })
    },
    [
      setComments,
      setCommentHistory,
      setCommentHistoryError,
      setCommentHistoryLoading,
      setExpandedHistoryIds,
      setExpandedReplyIds,
      setReplyCache,
    ]
  )

  const saveCommentEdit = useCallback(
    async (commentId: string) => {
      if (!letter) return
      const trimmed = editingCommentText.trim()
      if (!trimmed) {
        toast.error('Комментарий не может быть пустым')
        return
      }
      setCommentActionState({ id: commentId, action: 'edit' })
      try {
        const res = await fetch(`/api/letters/${letter.id}/comments`, {
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
        updateCommentState(commentId, (comment) => ({ ...comment, text: trimmed, updatedAt }))
        if (data?.edit) {
          setCommentHistory((prev) => {
            const existing = prev[commentId]
            if (!existing) {
              return prev
            }
            return { ...prev, [commentId]: [data.edit as CommentEditItem, ...existing] }
          })
        }
        resetCommentsCache()
        cancelEditComment()
        toast.success('Комментарий обновлен')
      } catch (error) {
        console.error('Failed to update comment:', error)
        toast.error('Ошибка при обновлении комментария')
      } finally {
        setCommentActionState(null)
      }
    },
    [cancelEditComment, editingCommentText, letter, resetCommentsCache, toast, updateCommentState]
  )

  const finalizeCommentDelete = useCallback(
    async (commentId: string) => {
      if (!letter) return
      if (!pendingDeleteTimersRef.current.has(commentId)) return
      pendingDeleteTimersRef.current.delete(commentId)
      setCommentActionState({ id: commentId, action: 'delete' })
      try {
        const res = await fetch(`/api/letters/${letter.id}/comments`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: commentId }),
        })
        const data = await res.json().catch(() => null)
        if (!res.ok) {
          toast.error(data?.error || 'Не удалось удалить комментарий')
          refreshComments()
        }
      } catch (error) {
        console.error('Failed to delete comment:', error)
        toast.error('Ошибка при удалении комментария')
        refreshComments()
      } finally {
        setCommentActionState(null)
      }
    },
    [letter, refreshComments, toast]
  )

  const undoCommentDelete = useCallback(
    (commentId: string) => {
      const timerId = pendingDeleteTimersRef.current.get(commentId)
      if (!timerId) return
      clearTimeout(timerId)
      pendingDeleteTimersRef.current.delete(commentId)
      toast.info('Удаление отменено')
      refreshComments()
    },
    [refreshComments, toast]
  )

  const handleDeleteComment = useCallback(
    (commentId: string) => {
      if (!letter) return
      if (pendingDeleteTimersRef.current.has(commentId)) return
      const isTopLevel = comments.some((comment) => comment.id === commentId)
      removeCommentState(commentId)
      resetCommentsCache()
      if (isTopLevel) {
        setCommentsTotal((prev) => (typeof prev === 'number' ? Math.max(0, prev - 1) : prev))
      }
      if (editingCommentId === commentId) {
        cancelEditComment()
      }
      toast.addToast({
        type: 'info',
        title: 'Комментарий удален',
        message: 'Можно отменить в течение нескольких секунд',
        duration: 5000,
        action: {
          label: 'Отменить',
          onClick: () => undoCommentDelete(commentId),
        },
      })
      const timeoutId = setTimeout(() => {
        void finalizeCommentDelete(commentId)
      }, 5000)
      pendingDeleteTimersRef.current.set(commentId, timeoutId)
    },
    [
      cancelEditComment,
      comments,
      editingCommentId,
      finalizeCommentDelete,
      letter,
      removeCommentState,
      resetCommentsCache,
      toast,
      undoCommentDelete,
    ]
  )

  const handleAddComment = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!letter || !commentText.trim()) return

    const author = {
      id: session?.user?.id || 'unknown',
      name: session?.user?.name || null,
      email: session?.user?.email || null,
    }
    const optimisticComment = {
      text: commentText.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      author,
      replies: [],
    }

    const result = await addComment(optimisticComment)
    if (result) {
      setCommentText('')
      refreshComments()
      toast.success('Комментарий добавлен')
    }
  }
  const toggleFavorite = useCallback(async () => {
    if (!letter) return

    setTogglingFavorite(true)
    try {
      const res = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ letterId: letter.id }),
      })

      if (res.ok) {
        setLetter((prev) => (prev ? { ...prev, isFavorite: !prev.isFavorite } : null))
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error)
    } finally {
      setTogglingFavorite(false)
    }
  }, [letter])

  const toggleWatch = useCallback(async () => {
    if (!letter) return

    setTogglingWatch(true)
    try {
      const res = await fetch(`/api/letters/${letter.id}/watch`, {
        method: letter.isWatching ? 'DELETE' : 'POST',
      })
      if (res.ok) {
        setLetter((prev) => (prev ? { ...prev, isWatching: !prev.isWatching } : prev))
      }
    } catch (error) {
      console.error('Failed to toggle watch:', error)
    } finally {
      setTogglingWatch(false)
    }
  }, [letter])

  useEffect(() => {
    if (!letter) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return
      if (isEditableElement(event.target)) return
      const key = event.key.toLowerCase()
      if (key === 'f') {
        event.preventDefault()
        void toggleFavorite()
        return
      }
      if (key === 'c') {
        event.preventDefault()
        commentInputRef.current?.focus()
        return
      }
      if (key === 'r') {
        event.preventDefault()
        handleRefresh()
        return
      }
      if (key === 'p') {
        event.preventDefault()
        handlePrint()
        return
      }
      if (event.key === '[' && neighbors?.prev?.id) {
        event.preventDefault()
        router.push(`/letters/${neighbors.prev.id}`)
        return
      }
      if (event.key === ']' && neighbors?.next?.id) {
        event.preventDefault()
        router.push(`/letters/${neighbors.next.id}`)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handlePrint, handleRefresh, letter, neighbors, router, toggleFavorite])

  const currentUserId = session?.user?.id ?? ''
  const filteredComments = useMemo(() => {
    if (commentFilter === 'all') return comments
    if (!currentUserId) return comments
    return comments.filter((comment) => comment.author.id === currentUserId)
  }, [commentFilter, comments, currentUserId])

  const handleToggleReplies = useCallback((nextValue: boolean) => {
    setIncludeReplies(nextValue)
  }, [])

  const toggleReplyThread = useCallback(
    (commentId: string, repliesCount: number) => {
      if (includeReplies) return
      setExpandedReplyIds((prev) => {
        if (prev.includes(commentId)) {
          return prev.filter((id) => id != commentId)
        }
        return [...prev, commentId]
      })
      if (!replyCache[commentId] && repliesCount > 0) {
        void loadCommentReplies(commentId)
      }
    },
    [includeReplies, loadCommentReplies, replyCache]
  )

  const renderComment = useCallback(
    function renderComment(comment: CommentItem, depth = 0) {
      const author =
        comment.author.name ||
        comment.author.email ||
        '\u041d\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043d\u044b\u0439'
      const replies = comment.replies ?? []
      const repliesCount = comment._count?.replies ?? replies.length
      const expanded = includeReplies || expandedReplyIds.includes(comment.id)
      const cachedReplies = replyCache[comment.id] ?? []
      const displayedReplies = includeReplies ? replies : cachedReplies
      const isRepliesLoading = replyLoading[comment.id]
      const canEditComment = canManageLetters || comment.author.id === currentUserId
      const isEditing = editingCommentId === comment.id
      const isActionLoading = commentActionState?.id === comment.id
      const isSaving = isActionLoading && commentActionState?.action === 'edit'
      const isEdited = comment.updatedAt && comment.updatedAt !== comment.createdAt
      const historyExpanded = expandedHistoryIds.includes(comment.id)
      const historyItems = commentHistory[comment.id] ?? []
      const historyLoading = commentHistoryLoading[comment.id]
      const historyError = commentHistoryError[comment.id]
      return (
        <div
          key={comment.id}
          className={`panel-soft panel-glass rounded-xl p-4 ${depth > 0 ? 'ml-6' : ''}`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-400">
            <div>
              <div className="font-medium text-gray-200">{author}</div>
              <div className="flex flex-wrap items-center gap-2">
                <span>{new Date(comment.createdAt).toLocaleString('ru-RU')}</span>
                {isEdited && (
                  <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-200">
                    {'\u0438\u0437\u043c\u0435\u043d\u0435\u043d\u043e'}
                  </span>
                )}
              </div>
            </div>
            {canEditComment && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => startEditComment(comment)}
                  disabled={isActionLoading}
                  className="btn-ghost inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-gray-300 transition disabled:opacity-50"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  {'\u0418\u0437\u043c\u0435\u043d\u0438\u0442\u044c'}
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteComment(comment.id)}
                  disabled={isActionLoading}
                  className="btn-ghost inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-red-200 transition hover:text-red-50 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {'\u0423\u0434\u0430\u043b\u0438\u0442\u044c'}
                </button>
              </div>
            )}
          </div>
          {isEditing ? (
            <div className="mt-3 space-y-2">
              <textarea
                rows={3}
                value={editingCommentText}
                onChange={(event) => setEditingCommentText(event.target.value)}
                className="w-full resize-none rounded-lg border border-gray-600 bg-gray-900/60 px-3 py-2 text-sm text-white placeholder-gray-400 focus:border-emerald-500 focus:outline-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={cancelEditComment}
                  disabled={isSaving}
                  className="btn-secondary inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs transition disabled:opacity-50"
                >
                  {'\u041e\u0442\u043c\u0435\u043d\u0430'}
                </button>
                <button
                  type="button"
                  onClick={() => saveCommentEdit(comment.id)}
                  disabled={isSaving}
                  className="btn-primary inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-white transition disabled:opacity-50"
                >
                  {isSaving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <MessageSquare className="h-3.5 w-3.5" />
                  )}
                  {'\u0421\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c'}
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-2 whitespace-pre-wrap text-sm text-gray-200">{comment.text}</p>
          )}
          {isEdited && (
            <button
              type="button"
              onClick={() => toggleCommentHistory(comment.id)}
              className="mt-2 text-xs font-medium text-emerald-300 transition hover:text-emerald-200"
            >
              {historyExpanded
                ? '\u0421\u043a\u0440\u044b\u0442\u044c \u0438\u0441\u0442\u043e\u0440\u0438\u044e'
                : '\u0418\u0441\u0442\u043e\u0440\u0438\u044f \u043f\u0440\u0430\u0432\u043e\u043a'}
            </button>
          )}
          {isEdited && historyExpanded && (
            <div className="mt-3 space-y-2 rounded-lg border border-gray-700/60 bg-gray-900/40 p-3 text-xs text-gray-300">
              {historyLoading && (
                <div className="text-gray-400">
                  {
                    '\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430 \u0438\u0441\u0442\u043e\u0440\u0438\u0438...'
                  }
                </div>
              )}
              {historyError && <div className="text-red-300">{historyError}</div>}
              {!historyLoading && !historyError && historyItems.length === 0 && (
                <div className="text-gray-400">
                  {
                    '\u041f\u043e\u043a\u0430 \u043d\u0435\u0442 \u043f\u0440\u0430\u0432\u043e\u043a'
                  }
                </div>
              )}
              {!historyLoading &&
                !historyError &&
                historyItems.map((edit) => {
                  const editorLabel =
                    edit.editor.name ||
                    edit.editor.email ||
                    '\u041d\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043d\u044b\u0439'
                  return (
                    <div
                      key={edit.id}
                      className="rounded-md border border-gray-700/70 bg-gray-900/40 p-2"
                    >
                      <div className="text-[11px] text-gray-400">
                        {editorLabel}
                        <span className="text-gray-500">{' \u00b7 '}</span>
                        {new Date(edit.createdAt).toLocaleString('ru-RU')}
                      </div>
                      <div className="mt-2 text-gray-400">
                        {'\u0411\u044b\u043b\u043e:'}
                        <div className="mt-1 whitespace-pre-wrap text-gray-300">{edit.oldText}</div>
                      </div>
                      <div className="mt-2 text-gray-400">
                        {'\u0421\u0442\u0430\u043b\u043e:'}
                        <div className="mt-1 whitespace-pre-wrap text-gray-200">{edit.newText}</div>
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
          {repliesCount > 0 && !includeReplies && (
            <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
              <span>{`\u041e\u0442\u0432\u0435\u0442\u044b: ${repliesCount}`}</span>
              <button
                type="button"
                onClick={() => toggleReplyThread(comment.id, repliesCount)}
                className="text-emerald-300 transition hover:text-emerald-200"
              >
                {expanded
                  ? '\u0421\u043a\u0440\u044b\u0442\u044c'
                  : '\u041f\u043e\u043a\u0430\u0437\u0430\u0442\u044c'}
              </button>
            </div>
          )}
          {expanded && isRepliesLoading && (
            <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
              <span>{'\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430...'} </span>
            </div>
          )}
          {expanded && !isRepliesLoading && displayedReplies.length > 0 && (
            <div className="mt-3 space-y-3">
              {displayedReplies.map((reply) => renderComment(reply, depth + 1))}
            </div>
          )}
        </div>
      )
    },
    [
      cancelEditComment,
      canManageLetters,
      commentActionState,
      commentHistory,
      commentHistoryError,
      commentHistoryLoading,
      currentUserId,
      editingCommentId,
      editingCommentText,
      expandedHistoryIds,
      expandedReplyIds,
      handleDeleteComment,
      includeReplies,
      replyCache,
      replyLoading,
      saveCommentEdit,
      startEditComment,
      toggleCommentHistory,
      toggleReplyThread,
    ]
  )

  const renderedComments = useMemo(
    () => filteredComments.map((comment) => renderComment(comment)),
    [filteredComments, renderComment]
  )

  if (authStatus === 'loading' || (authStatus === 'authenticated' && loading)) {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center bg-gray-900">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    )
  }

  if (!session) {
    return null
  }

  if (!letter) {
    return (
      <div className="app-shell min-h-screen bg-gray-900">
        <Header />
        <main className="mx-auto max-w-3xl px-4 py-10">
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-6 text-red-100">
            <h1 className="text-lg font-semibold">
              {
                '\u041f\u0438\u0441\u044c\u043c\u043e \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u043e'
              }
            </h1>
            <p className="mt-2 text-sm text-red-200/80">
              {loadError ||
                '\u041f\u0440\u043e\u0432\u0435\u0440\u044c\u0442\u0435 \u0441\u0441\u044b\u043b\u043a\u0443 \u0438\u043b\u0438 \u043e\u0431\u043d\u043e\u0432\u0438\u0442\u0435 \u0441\u0442\u0440\u0430\u043d\u0438\u0446\u0443.'}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={loadLetter}
                className="btn-secondary inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-red-100 transition hover:text-red-50"
              >
                <RefreshCw className="h-4 w-4" />
                {'\u041f\u043e\u0432\u0442\u043e\u0440\u0438\u0442\u044c'}
              </button>
              <Link
                href="/letters"
                className="btn-ghost inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-white transition"
              >
                <ArrowLeft className="h-4 w-4" />
                {'\u041a \u0441\u043f\u0438\u0441\u043a\u0443 \u043f\u0438\u0441\u0435\u043c'}
              </Link>
            </div>
          </div>
        </main>
      </div>
    )
  }

  const daysLeft = getWorkingDaysUntilDeadline(letter.deadlineDate)
  const isDone = isDoneStatus(letter.status)
  const isOverdue = !isDone && daysLeft < 0
  const isUrgent = !isDone && daysLeft <= 2 && daysLeft >= 0
  const priorityInfo = getPriorityLabel(letter.priority)
  const letterTypeOptions = LETTER_TYPES.filter((type) => type.value !== 'all')
  const typeValue = letter.type || ''
  const hasCustomType =
    !!typeValue && !letterTypeOptions.some((option) => option.value === typeValue)
  const canEditIdentity = session.user.role === 'ADMIN' || session.user.role === 'SUPERADMIN'
  const notifyDisabledReason = !canManageLetters
    ? '\u041d\u0435\u0434\u043e\u0441\u0442\u0430\u0442\u043e\u0447\u043d\u043e \u043f\u0440\u0430\u0432 \u0434\u043b\u044f \u0443\u0432\u0435\u0434\u043e\u043c\u043b\u0435\u043d\u0438\u0439'
    : !letter.owner?.id
      ? '\u041d\u0435\u0442 \u043d\u0430\u0437\u043d\u0430\u0447\u0435\u043d\u043d\u043e\u0433\u043e \u0441\u043e\u0442\u0440\u0443\u0434\u043d\u0438\u043a\u0430'
      : !letter.owner?.telegramChatId
        ? '\u0423 \u0438\u0441\u043f\u043e\u043b\u043d\u0438\u0442\u0435\u043b\u044f \u043d\u0435\u0442 Telegram ID'
        : null
  const notifyDisabled = notifyingOwner || !!notifyDisabledReason
  const prevLetter = neighbors?.prev
  const nextLetter = neighbors?.next
  const commentCount = commentsTotal ?? comments.length
  const pendingFiles = letter.files.filter((file) => file.status && file.status !== 'READY').length
  const ownerLabel =
    letter.owner?.name ||
    letter.owner?.email ||
    '\u041d\u0435 \u043d\u0430\u0437\u043d\u0430\u0447\u0435\u043d'
  const applicantLabel = letter.applicantName || '\u041d\u0435 \u0443\u043a\u0430\u0437\u0430\u043d'
  const applicantEmail =
    letter.applicantEmail || '\u041d\u0435 \u0443\u043a\u0430\u0437\u0430\u043d'
  const applicantPhone =
    letter.applicantPhone || '\u041d\u0435 \u0443\u043a\u0430\u0437\u0430\u043d'
  const applicantTelegram =
    letter.applicantTelegramChatId || '\u041d\u0435 \u0443\u043a\u0430\u0437\u0430\u043d'
  const actionButtonBase =
    'inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm transition disabled:opacity-50 sm:w-auto'
  const actionButtonSecondary = `${actionButtonBase} btn-secondary`
  const actionButtonGhost = `${actionButtonBase} btn-ghost text-white`
  const actionButtonDanger = `${actionButtonBase} btn-secondary text-red-200 hover:text-red-100`
  const chipBase =
    'app-chip inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs transition'

  const copyText = async (value: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(value)
      toast.success(successMessage)
    } catch (error) {
      console.error('Failed to copy text:', error)
      toast.error(
        '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0441\u043a\u043e\u043f\u0438\u0440\u043e\u0432\u0430\u0442\u044c'
      )
    }
  }

  const handleCopyLetterNumber = () => {
    if (!letter) return
    void copyText(
      letter.number,
      '\u041d\u043e\u043c\u0435\u0440 \u0441\u043a\u043e\u043f\u0438\u0440\u043e\u0432\u0430\u043d'
    )
  }

  const handleCopyPageLink = () => {
    if (typeof window === 'undefined') return
    void copyText(
      window.location.href,
      '\u0421\u0441\u044b\u043b\u043a\u0430 \u0441\u043a\u043e\u043f\u0438\u0440\u043e\u0432\u0430\u043d\u0430'
    )
  }

  // Quick actions for mobile FAB
  const quickActions = [
    {
      icon: Copy,
      label: 'Копировать номер',
      onClick: () => {
        if (letter) {
          handleCopyLetterNumber()
        }
      },
    },
    {
      icon: Link2,
      label: 'Копировать ссылку',
      onClick: () => {
        handleCopyPageLink()
      },
    },
    {
      icon: Bell,
      label: letter.isWatching
        ? '\u041d\u0435 \u0441\u043b\u0435\u0434\u0438\u0442\u044c'
        : '\u0421\u043b\u0435\u0434\u0438\u0442\u044c',
      onClick: () => {
        toggleWatch()
      },
    },
    {
      icon: Send,
      label:
        '\u0423\u0432\u0435\u0434\u043e\u043c\u0438\u0442\u044c \u0438\u0441\u043f\u043e\u043b\u043d\u0438\u0442\u0435\u043b\u044f',
      onClick: () => {
        if (!notifyDisabled) {
          handleNotifyOwner()
        }
      },
    },
  ]

  return (
    <div className="app-shell min-h-screen overflow-auto bg-gray-900">
      <Header />

      <main id="main-content" className="mx-auto max-w-5xl px-4 py-6 pb-16 sm:px-6 sm:py-8 lg:px-8">
        {/* Back button */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
          <div className="flex flex-col gap-1">
            <Link
              href="/letters"
              className="inline-flex items-center gap-2 text-gray-400 transition hover:text-white"
            >
              <ArrowLeft className="h-5 w-5" />
              {'\u041d\u0430\u0437\u0430\u0434 \u043a \u043f\u0438\u0441\u044c\u043c\u0430\u043c'}
            </Link>
            <div className="text-xs text-gray-500">
              {'\u041f\u0438\u0441\u044c\u043c\u0430 / #'}
              {letter.number}
            </div>
          </div>

          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <button
              onClick={toggleFavorite}
              disabled={togglingFavorite}
              className={`${actionButtonGhost} ${letter.isFavorite ? 'text-amber-300' : ''}`}
              title={letter.isFavorite ? 'Убрать из избранного' : 'Добавить в избранное'}
            >
              {togglingFavorite ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Star className={`h-4 w-4 ${letter.isFavorite ? 'fill-current' : ''}`} />
              )}
              {letter.isFavorite ? 'В избранном' : 'В избранное'}
            </button>

            <button onClick={handlePrint} className={actionButtonSecondary} title="Печать">
              <Printer className="h-4 w-4" />
              Печать
            </button>

            <button
              onClick={handleDuplicate}
              disabled={duplicating}
              className={actionButtonSecondary}
              title="Дублировать письмо"
            >
              {duplicating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              Дублировать
            </button>

            <button onClick={handleDelete} disabled={deleting} className={actionButtonDanger}>
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Удалить
            </button>
          </div>
        </div>

        {/* Mobile Sticky Status Bar */}
        <div className="panel panel-soft panel-glass sticky top-14 z-10 mb-4 rounded-2xl p-3 backdrop-blur-md md:hidden">
          <div className="flex items-center justify-between gap-3">
            <StatusBadge status={letter.status} size="sm" />
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Clock className="h-3.5 w-3.5" />
              {formatDate(letter.deadlineDate)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-3">
          {/* Main Content */}
          <div className="space-y-4 lg:col-span-2">
            <LazySection
              placeholder={
                <div className="panel panel-soft panel-glass rounded-2xl p-4 md:p-6">
                  <div className="h-24 animate-pulse rounded-lg bg-white/5" />
                </div>
              }
            >
              <div className="panel panel-soft panel-glass hover-lift rounded-2xl p-4 md:p-6">
                <ActivityFeed
                  letterId={letter.id}
                  maxItems={3}
                  title="Последние действия"
                  compact
                />
              </div>
            </LazySection>

            {/* Header Card */}
            <div className="panel panel-soft panel-glass hover-lift rounded-2xl p-4 md:p-6">
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-gray-300/90">
                  {'\u0422\u0438\u043f \u0437\u0430\u043f\u0440\u043e\u0441\u0430'}
                </label>
                <select
                  value={typeValue}
                  onChange={(e) => updateField('type', e.target.value)}
                  disabled={updating}
                  className="w-full rounded-lg border border-gray-600 bg-gray-700 px-4 py-2 text-white focus:border-emerald-500 focus:outline-none disabled:opacity-50"
                  aria-label="Тип запроса"
                >
                  <option value="">{'\u041d\u0435 \u0443\u043a\u0430\u0437\u0430\u043d'}</option>
                  {hasCustomType && <option value={typeValue}>{typeValue}</option>}
                  {letterTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="font-mono text-base text-emerald-400 md:text-lg">
                      {'\u2116'}
                      {letter.number}
                    </span>
                    {letter.type && <span className={chipBase}>{letter.type}</span>}
                    <button
                      type="button"
                      onClick={handleCopyLetterNumber}
                      className={`${chipBase} gap-1`}
                      title={
                        '\u0421\u043a\u043e\u043f\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u043d\u043e\u043c\u0435\u0440'
                      }
                    >
                      <Copy className="h-3.5 w-3.5" />
                      {'\u041d\u043e\u043c\u0435\u0440'}
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyPageLink}
                      className={`${chipBase} gap-1`}
                      title={
                        '\u0421\u043a\u043e\u043f\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u0441\u0441\u044b\u043b\u043a\u0443'
                      }
                    >
                      <Link2 className="h-3.5 w-3.5" />
                      {'\u0421\u0441\u044b\u043b\u043a\u0430'}
                    </button>
                  </div>
                  <h1 className="text-xl font-bold text-white md:text-2xl">{letter.org}</h1>
                </div>
                <StatusBadge status={letter.status} size="lg" />
              </div>

              {/* Deadline warning */}
              {(isOverdue || isUrgent) && (
                <div
                  className={`mb-4 flex items-center gap-2 rounded-lg p-3 ${
                    isOverdue ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'
                  }`}
                >
                  <AlertTriangle className="h-5 w-5" />
                  {isOverdue
                    ? `\u041f\u0440\u043e\u0441\u0440\u043e\u0447\u0435\u043d\u043e \u043d\u0430 ${Math.abs(daysLeft)} \u0440\u0430\u0431. ${pluralizeDays(Math.abs(daysLeft))}`
                    : `\u0414\u043e \u0434\u0435\u0434\u043b\u0430\u0439\u043d\u0430 \u043e\u0441\u0442\u0430\u043b\u043e\u0441\u044c ${daysLeft} \u0440\u0430\u0431. ${pluralizeDays(daysLeft)}`}
                </div>
              )}

              {/* Done indicator */}
              {isDone && (
                <div className="mb-4 flex items-center gap-2 rounded-lg bg-emerald-500/20 p-3 text-emerald-400">
                  <CheckCircle2 className="h-5 w-5" />
                  Выполнено
                </div>
              )}
            </div>

            <div className="panel panel-soft panel-glass hover-lift rounded-2xl p-4 md:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-white md:text-xl">
                    {
                      '\u0411\u044b\u0441\u0442\u0440\u0430\u044f \u0441\u0432\u043e\u0434\u043a\u0430'
                    }
                  </h3>
                  <p className="text-xs text-gray-400">{STATUS_LABELS[letter.status]}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-300">
                  <span className="rounded-full border border-gray-700/60 bg-gray-900/40 px-3 py-1">
                    {'\u041f\u0440\u0438\u043e\u0440\u0438\u0442\u0435\u0442: '}{' '}
                    {priorityInfo.label}
                  </span>
                  <span
                    className={`rounded-full border px-3 py-1 ${
                      isOverdue
                        ? 'border-red-500/30 bg-red-500/10 text-red-200'
                        : isUrgent
                          ? 'border-amber-500/30 bg-amber-500/10 text-amber-200'
                          : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                    }`}
                  >
                    {isDone
                      ? '\u0417\u0430\u043a\u0440\u044b\u0442\u043e'
                      : daysLeft < 0
                        ? `\u041f\u0440\u043e\u0441\u0440\u043e\u0447\u0435\u043d\u043e \u043d\u0430 ${Math.abs(daysLeft)}`
                        : `\u041e\u0441\u0442\u0430\u043b\u043e\u0441\u044c ${daysLeft}`}
                  </span>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="panel-soft panel-glass rounded-xl p-3">
                  <div className="text-xs text-gray-400">
                    {'\u0418\u0441\u043f\u043e\u043b\u043d\u0438\u0442\u0435\u043b\u044c'}
                  </div>
                  <div className="text-sm text-white">{ownerLabel}</div>
                </div>
                <div className="panel-soft panel-glass rounded-xl p-3">
                  <div className="text-xs text-gray-400">
                    {'\u0417\u0430\u044f\u0432\u0438\u0442\u0435\u043b\u044c'}
                  </div>
                  <div className="text-sm text-white">{applicantLabel}</div>
                </div>
                <div className="panel-soft panel-glass rounded-xl p-3">
                  <div className="text-xs text-gray-400">Email</div>
                  <div className="text-sm text-white">{applicantEmail}</div>
                </div>
                <div className="panel-soft panel-glass rounded-xl p-3">
                  <div className="text-xs text-gray-400">
                    {'\u0422\u0435\u043b\u0435\u0444\u043e\u043d / Telegram'}
                  </div>
                  <div className="text-sm text-white">
                    {applicantPhone}
                    <span className="text-gray-500">{' \u00b7 '}</span>
                    {applicantTelegram}
                  </div>
                </div>
                <div className="panel-soft panel-glass rounded-xl p-3">
                  <div className="text-xs text-gray-400">{'\u0424\u0430\u0439\u043b\u044b'}</div>
                  <div className="text-sm text-white">
                    {letter.files.length}
                    {pendingFiles > 0 && (
                      <span className="ml-2 text-xs text-amber-300">
                        {`\u0432 \u0440\u0430\u0431\u043e\u0442\u0435: ${pendingFiles}`}
                      </span>
                    )}
                  </div>
                </div>
                <div className="panel-soft panel-glass rounded-xl p-3">
                  <div className="text-xs text-gray-400">
                    {'\u041a\u043e\u043c\u043c\u0435\u043d\u0442\u0430\u0440\u0438\u0438'}
                  </div>
                  <div className="flex items-center justify-between gap-2 text-sm text-white">
                    <span>{commentCount}</span>
                    <button
                      type="button"
                      onClick={() => {
                        commentInputRef.current?.scrollIntoView({
                          behavior: 'smooth',
                          block: 'center',
                        })
                        commentInputRef.current?.focus()
                      }}
                      className="text-xs text-emerald-300 transition hover:text-emerald-200"
                    >
                      {'\u041f\u0435\u0440\u0435\u0439\u0442\u0438'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Editable Fields Card */}
            <div className="panel panel-soft panel-glass hover-lift rounded-2xl p-4 md:p-6">
              <h3 className="mb-4 text-lg font-semibold text-white md:text-xl">
                Информация о письме
              </h3>

              {canEditIdentity && (
                <>
                  <EditableField
                    label={'\u041d\u043e\u043c\u0435\u0440 \u043f\u0438\u0441\u044c\u043c\u0430'}
                    value={letter.number}
                    field="number"
                    onSave={saveField}
                    placeholder={
                      '\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043d\u043e\u043c\u0435\u0440'
                    }
                  />
                  <EditableField
                    label={
                      '\u041d\u0430\u0437\u0432\u0430\u043d\u0438\u0435 \u043f\u0438\u0441\u044c\u043c\u0430'
                    }
                    value={letter.org}
                    field="org"
                    onSave={saveField}
                    placeholder={
                      '\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043d\u0430\u0437\u0432\u0430\u043d\u0438\u0435'
                    }
                  />
                </>
              )}

              <EditableField
                label="Содержание"
                value={letter.content}
                field="content"
                onSave={saveField}
                type="textarea"
                placeholder="Добавить содержание..."
                rows={4}
                collapsible
                maxPreviewChars={320}
              />

              <EditableField
                label="Контакты"
                value={letter.contacts}
                field="contacts"
                onSave={saveField}
                placeholder="Добавить контакты..."
              />

              <EditableField
                label="Ссылка на Jira"
                value={letter.jiraLink}
                field="jiraLink"
                onSave={saveField}
                type="url"
                placeholder="https://jira.example.com/..."
              />

              <EditableField
                label="Комментарии ZorDoc"
                value={letter.zordoc}
                field="zordoc"
                onSave={saveField}
                type="textarea"
                placeholder="Добавить комментарий ZorDoc..."
                rows={3}
                collapsible
                maxPreviewChars={240}
              />

              {/* Ответ с шаблонами */}
              <div className="mb-4">
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-300">Ответ</label>
                  <TemplateSelector
                    currentUserId={session.user.id}
                    onSelect={(content) => {
                      const newAnswer = letter.answer ? `${letter.answer}\n\n${content}` : content
                      updateField('answer', newAnswer)
                    }}
                  />
                </div>
                <EditableField
                  label=""
                  value={letter.answer}
                  field="answer"
                  onSave={saveField}
                  type="textarea"
                  placeholder="Добавить ответ..."
                  rows={4}
                  collapsible
                  maxPreviewChars={320}
                />
              </div>

              <EditableField
                label="Статус отправки"
                value={letter.sendStatus}
                field="sendStatus"
                onSave={saveField}
                placeholder="Добавить статус отправки..."
              />
            </div>

            <div className="panel panel-soft panel-glass rounded-2xl p-6">
              <h3 className="mb-4 text-lg font-semibold text-white">
                {'\u041a\u043e\u043c\u043c\u0435\u043d\u0442\u0430\u0440\u0438\u0439'}
              </h3>
              <EditableField
                label=""
                value={letter.comment}
                field="comment"
                onSave={saveField}
                type="textarea"
                placeholder={
                  '\u0414\u043e\u0431\u0430\u0432\u044c\u0442\u0435 \u043a\u043e\u043c\u043c\u0435\u043d\u0442\u0430\u0440\u0438\u0439...'
                }
                rows={3}
              />
            </div>

            <div className="panel panel-soft panel-glass rounded-2xl p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {'\u041a\u043e\u043c\u043c\u0435\u043d\u0442\u0430\u0440\u0438\u0438'}
                  </h3>
                  <p className="text-xs text-gray-400">
                    {'\u0412\u0441\u0435\u0433\u043e: '} {commentCount}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCommentFilter('all')}
                    className={`${chipBase} ${commentFilter === 'all' ? 'app-chip-active' : ''}`}
                  >
                    {'\u0412\u0441\u0435'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCommentFilter('mine')}
                    className={`${chipBase} ${commentFilter === 'mine' ? 'app-chip-active' : ''}`}
                  >
                    {'\u041c\u043e\u0438'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleReplies(!includeReplies)}
                    className="btn-secondary inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition"
                  >
                    {includeReplies
                      ? '\u0421\u043a\u0440\u044b\u0442\u044c \u043e\u0442\u0432\u0435\u0442\u044b'
                      : '\u041f\u043e\u043a\u0430\u0437\u0430\u0442\u044c \u043e\u0442\u0432\u0435\u0442\u044b'}
                  </button>
                  <button
                    type="button"
                    onClick={refreshComments}
                    disabled={commentsLoading}
                    className="btn-secondary inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition disabled:opacity-50"
                  >
                    <RefreshCw className={`h-4 w-4 ${commentsLoading ? 'animate-spin' : ''}`} />
                    {'\u041e\u0431\u043d\u043e\u0432\u0438\u0442\u044c'}
                  </button>
                </div>
              </div>

              {commentsError && (
                <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-100">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span>{commentsError}</span>
                    <button
                      type="button"
                      onClick={refreshComments}
                      className="btn-secondary inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-red-100 transition hover:text-red-50"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      {'\u041f\u043e\u0432\u0442\u043e\u0440\u0438\u0442\u044c'}
                    </button>
                  </div>
                </div>
              )}

              {commentsLoading && comments.length === 0 ? (
                <div className="space-y-3">
                  {Array.from({ length: 2 }).map((_, index) => (
                    <div
                      key={`comment-skeleton-${index}`}
                      className="h-20 animate-pulse rounded-lg bg-white/5"
                    />
                  ))}
                </div>
              ) : filteredComments.length === 0 ? (
                <p className="text-sm text-gray-400">
                  {commentFilter === 'mine'
                    ? '\u041d\u0435\u0442 \u043a\u043e\u043c\u043c\u0435\u043d\u0442\u0430\u0440\u0438\u0435\u0432 \u043f\u043e \u0444\u0438\u043b\u044c\u0442\u0440\u0443'
                    : '\u041f\u043e\u043a\u0430 \u043d\u0435\u0442 \u043a\u043e\u043c\u043c\u0435\u043d\u0442\u0430\u0440\u0438\u0435\u0432'}
                </p>
              ) : (
                <div className="space-y-3">{renderedComments}</div>
              )}

              {commentsHasMore && (
                <div className="mt-4 flex justify-center">
                  <button
                    type="button"
                    onClick={() => loadComments(commentsPage + 1, true)}
                    disabled={commentsLoading}
                    className="btn-secondary inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm transition disabled:opacity-50"
                  >
                    {commentsLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ChevronRight className="h-4 w-4 rotate-90" />
                    )}
                    {'\u041f\u043e\u043a\u0430\u0437\u0430\u0442\u044c \u0435\u0449\u0435'}
                  </button>
                </div>
              )}

              <form onSubmit={handleAddComment} className="mt-4 space-y-3">
                <textarea
                  ref={commentInputRef}
                  rows={3}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="w-full resize-none rounded-lg border border-gray-600 bg-gray-700 px-4 py-2 text-white placeholder-gray-400 focus:border-emerald-500 focus:outline-none"
                  placeholder={
                    '\u041d\u0430\u043f\u0438\u0448\u0438\u0442\u0435 \u043a\u043e\u043c\u043c\u0435\u043d\u0442\u0430\u0440\u0438\u0439...'
                  }
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isCommentSubmitting || !commentText.trim()}
                    className="btn-primary inline-flex items-center gap-2 rounded-lg px-4 py-2 text-white transition disabled:opacity-50"
                  >
                    {isCommentSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <MessageSquare className="h-4 w-4" />
                    )}
                    {
                      '\u0414\u043e\u0431\u0430\u0432\u0438\u0442\u044c \u043a\u043e\u043c\u043c\u0435\u043d\u0442\u0430\u0440\u0438\u0439'
                    }
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:self-start lg:overflow-y-auto">
            {(prevLetter || nextLetter) && (
              <div className="panel panel-soft panel-glass rounded-2xl p-4 md:p-6">
                <h3 className="mb-3 text-lg font-semibold text-white md:text-xl">
                  {'\u041d\u0430\u0432\u0438\u0433\u0430\u0446\u0438\u044f'}
                </h3>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => prevLetter && router.push(`/letters/${prevLetter.id}`)}
                    disabled={!prevLetter}
                    className="panel-soft panel-glass flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-gray-200 transition hover:border-gray-600 hover:bg-gray-900/70 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ChevronLeft className="h-4 w-4 text-gray-400" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs text-gray-400">
                        {
                          '\u041f\u0440\u0435\u0434\u044b\u0434\u0443\u0449\u0435\u0435 \u043f\u0438\u0441\u044c\u043c\u043e'
                        }
                      </div>
                      <div className="truncate">
                        {prevLetter
                          ? `${prevLetter.number} - ${prevLetter.org}`
                          : '\u041d\u0435\u0442'}
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => nextLetter && router.push(`/letters/${nextLetter.id}`)}
                    disabled={!nextLetter}
                    className="panel-soft panel-glass flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-gray-200 transition hover:border-gray-600 hover:bg-gray-900/70 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs text-gray-400">
                        {
                          '\u0421\u043b\u0435\u0434\u0443\u044e\u0449\u0435\u0435 \u043f\u0438\u0441\u044c\u043c\u043e'
                        }
                      </div>
                      <div className="truncate">
                        {nextLetter
                          ? `${nextLetter.number} - ${nextLetter.org}`
                          : '\u041d\u0435\u0442'}
                      </div>
                    </div>
                  </button>
                </div>
                <p className="mt-3 text-xs text-gray-400">
                  {'[ ] - \u043d\u0430\u0432\u0438\u0433\u0430\u0446\u0438\u044f'}
                </p>
              </div>
            )}

            <div className="panel panel-soft panel-glass rounded-2xl p-4 md:p-6">
              <h3 className="mb-3 text-lg font-semibold text-white md:text-xl">
                {
                  '\u0411\u044b\u0441\u0442\u0440\u044b\u0435 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044f'
                }
              </h3>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleRefresh}
                  className="panel-soft panel-glass flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-gray-200 transition hover:border-gray-600 hover:bg-gray-900/70"
                >
                  <RefreshCw className="h-4 w-4 text-gray-400" />
                  {
                    '\u041e\u0431\u043d\u043e\u0432\u0438\u0442\u044c \u0434\u0430\u043d\u043d\u044b\u0435'
                  }
                </button>
                <button
                  type="button"
                  onClick={handleCopyLetterNumber}
                  className="panel-soft panel-glass flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-gray-200 transition hover:border-gray-600 hover:bg-gray-900/70"
                >
                  <Copy className="h-4 w-4 text-gray-400" />
                  {
                    '\u0421\u043a\u043e\u043f\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u043d\u043e\u043c\u0435\u0440'
                  }
                </button>
                <button
                  type="button"
                  onClick={handleCopyPageLink}
                  className="panel-soft panel-glass flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-gray-200 transition hover:border-gray-600 hover:bg-gray-900/70"
                >
                  <Link2 className="h-4 w-4 text-gray-400" />
                  {
                    '\u0421\u043a\u043e\u043f\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u0441\u0441\u044b\u043b\u043a\u0443'
                  }
                </button>
                <button
                  type="button"
                  onClick={toggleWatch}
                  disabled={togglingWatch}
                  className="panel-soft panel-glass flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-gray-200 transition hover:border-gray-600 hover:bg-gray-900/70 disabled:opacity-50"
                >
                  {togglingWatch ? (
                    <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                  ) : (
                    <Bell className="h-4 w-4 text-gray-400" />
                  )}
                  {letter.isWatching
                    ? '\u041d\u0435 \u0441\u043b\u0435\u0434\u0438\u0442\u044c'
                    : '\u0421\u043b\u0435\u0434\u0438\u0442\u044c'}
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="panel-soft panel-glass flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-gray-200 transition hover:border-gray-600 hover:bg-gray-900/70"
                >
                  <Printer className="h-4 w-4 text-gray-400" />
                  {'\u041f\u0435\u0447\u0430\u0442\u044c'}
                </button>
              </div>
              <p className="mt-3 text-xs text-gray-400">
                {
                  'f - \u0438\u0437\u0431\u0440\u0430\u043d\u043d\u043e\u0435, c - \u043a\u043e\u043c\u043c\u0435\u043d\u0442\u0430\u0440\u0438\u0439, r - \u043e\u0431\u043d\u043e\u0432\u0438\u0442\u044c, p - \u043f\u0435\u0447\u0430\u0442\u044c'
                }
              </p>
            </div>

            {/* Info Card */}
            <div className="panel panel-soft panel-glass hover-lift rounded-2xl p-4 md:p-6">
              <h3 className="mb-4 text-lg font-semibold text-white md:text-xl">Информация</h3>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-gray-500" />
                  <div>
                    <div className="text-xs text-gray-400/80">Дата письма</div>
                    <div className="text-white">{formatDate(letter.date)}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-gray-500" />
                  <div>
                    <div className="text-xs text-gray-500">Дедлайн</div>
                    <div
                      className={
                        isOverdue ? 'text-red-400' : isDone ? 'text-emerald-400' : 'text-white'
                      }
                    >
                      {formatDate(letter.deadlineDate)}
                    </div>
                  </div>
                </div>

                {/* SLA Indicator */}
                <div className="border-t border-gray-700 pt-2">
                  <SLAIndicator
                    createdAt={letter.date}
                    deadlineDate={letter.deadlineDate}
                    status={letter.status}
                    closedAt={letter.closeDate}
                    size="md"
                  />
                </div>

                {!isDone && (
                  <div className="flex flex-wrap gap-2 border-t border-gray-700 pt-3">
                    <button
                      onClick={handlePostponeDeadline}
                      disabled={updating}
                      className="btn-secondary inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition disabled:opacity-50"
                    >
                      <Clock className="h-4 w-4" />
                      {
                        '\u041f\u0435\u0440\u0435\u043d\u0435\u0441\u0442\u0438 \u0434\u0435\u0434\u043b\u0430\u0439\u043d'
                      }
                    </button>
                    <button
                      onClick={handleEscalate}
                      disabled={updating}
                      className="btn-secondary inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-amber-300 transition disabled:opacity-50"
                    >
                      <AlertTriangle className="h-4 w-4" />
                      {'\u042d\u0441\u043a\u0430\u043b\u0438\u0440\u043e\u0432\u0430\u0442\u044c'}
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-gray-500" />
                  <div>
                    <div className="text-xs text-gray-500">Исполнитель</div>
                    <div className="text-white">
                      {letter.owner?.name || letter.owner?.email || 'Не назначен'}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleNotifyOwner}
                  disabled={notifyDisabled}
                  title={notifyDisabledReason || 'Отправить уведомление'}
                  className="btn-secondary inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition disabled:opacity-50"
                >
                  {notifyingOwner ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Bell className="h-4 w-4" />
                  )}
                  {
                    '\u0423\u0432\u0435\u0434\u043e\u043c\u0438\u0442\u044c \u0438\u0441\u043f\u043e\u043b\u043d\u0438\u0442\u0435\u043b\u044f'
                  }
                </button>
                {notifyDisabledReason && (
                  <div className="text-xs text-gray-500">{notifyDisabledReason}</div>
                )}

                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-gray-500" />
                  <div>
                    <div className="mb-1 text-xs text-gray-500">Приоритет</div>
                    <div className={`font-medium ${priorityInfo.color}`}>
                      {priorityInfo.label} ({letter.priority})
                    </div>
                  </div>
                </div>

                {letter.ijroDate && (
                  <div className="flex items-center gap-3">
                    <Send className="h-5 w-5 text-gray-500" />
                    <div>
                      <div className="text-xs text-gray-500">Дата ответа в IJRO</div>
                      <div className="text-white">{formatDate(letter.ijroDate)}</div>
                    </div>
                  </div>
                )}

                {letter.closeDate && (
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    <div>
                      <div className="text-xs text-gray-500">Дата закрытия</div>
                      <div className="text-emerald-400">{formatDate(letter.closeDate)}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="panel panel-soft panel-glass rounded-2xl p-6">
              <h3 className="mb-4 text-lg font-semibold text-white">{'Заявитель'}</h3>

              <EditableField
                label={'Имя'}
                value={letter.applicantName}
                field="applicantName"
                onSave={saveField}
                placeholder={'Имя заявителя'}
              />

              <EditableField
                label="Email"
                value={letter.applicantEmail}
                field="applicantEmail"
                onSave={saveField}
                placeholder="email@example.com"
              />

              <EditableField
                label={'Телефон'}
                value={letter.applicantPhone}
                field="applicantPhone"
                onSave={saveField}
                placeholder="+998901234567"
              />

              <EditableField
                label="Telegram chat id"
                value={letter.applicantTelegramChatId}
                field="applicantTelegramChatId"
                onSave={saveField}
                placeholder="123456789"
              />

              <div className="mt-4 rounded-lg border border-gray-700 bg-gray-900/40 p-4">
                <div className="mb-2 text-sm text-gray-400">{'Ссылка для заявителя'}</div>
                {portalLink ? (
                  <p className="break-all text-sm text-emerald-300">{portalLink}</p>
                ) : (
                  <p className="text-sm italic text-gray-500">{'Ссылка еще не создана'}</p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={handleGeneratePortalLink}
                    disabled={portalLoading}
                    className="btn-primary inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white transition disabled:opacity-50"
                  >
                    {portalLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Link2 className="h-4 w-4" />
                    )}
                    {'Создать/обновить ссылку'}
                  </button>
                  <button
                    onClick={handleCopyPortalLink}
                    disabled={!portalLink}
                    className="btn-secondary inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition disabled:opacity-50"
                  >
                    <Copy className="h-4 w-4" />
                    {'Скопировать'}
                  </button>
                </div>
              </div>
            </div>

            {/* Status Change */}
            <div className="panel panel-soft panel-glass rounded-2xl p-6">
              <h3 className="mb-4 text-lg font-semibold text-white">Изменить статус</h3>
              <div className="space-y-2">
                {STATUSES.map((status) => (
                  <button
                    key={status}
                    onClick={() => updateField('status', status)}
                    disabled={updating || letter.status === status}
                    className={`w-full rounded-lg px-4 py-2 text-left transition ${
                      letter.status === status
                        ? 'border border-emerald-500/50 bg-emerald-500/20 text-emerald-400'
                        : 'btn-secondary text-gray-200'
                    } disabled:opacity-50`}
                  >
                    {STATUS_LABELS[status]}
                  </button>
                ))}
              </div>
            </div>

            {/* Files */}
            <LazySection
              placeholder={
                <div className="panel panel-soft panel-glass rounded-2xl p-6">
                  <div className="h-28 animate-pulse rounded-lg bg-white/5" />
                </div>
              }
            >
              <FileUpload letterId={letter.id} files={letter.files} onFilesChange={loadLetter} />
            </LazySection>

            {/* Related Letters */}
            <LazySection
              placeholder={
                <div className="panel panel-soft panel-glass rounded-2xl p-4">
                  <div className="h-20 animate-pulse rounded-lg bg-white/5" />
                </div>
              }
            >
              <RelatedLetters currentLetterId={letter.id} organization={letter.org} />
            </LazySection>
          </div>
        </div>
      </main>

      {Dialog}

      {/* Quick Actions FAB for Mobile */}
      {letter && <QuickActionsMenu actions={quickActions} />}
    </div>
  )
}
