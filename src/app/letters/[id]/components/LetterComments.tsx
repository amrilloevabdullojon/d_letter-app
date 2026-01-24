'use client'

import { memo, useCallback, useRef, forwardRef, useImperativeHandle } from 'react'
import {
  MessageSquare,
  RefreshCw,
  Loader2,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  History,
  Send,
  Clock,
  User,
} from 'lucide-react'
import type { CommentItem, CommentEditItem, CommentFilter } from '../types'

interface LetterCommentsProps {
  comments: CommentItem[]
  filter: CommentFilter
  includeReplies: boolean
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
  onSetFilter: (filter: CommentFilter) => void
  onSetIncludeReplies: (value: boolean) => void
  onLoadMore: () => void
  onRefresh: () => void
  onAddComment: (text: string) => Promise<boolean>
  onStartEdit: (comment: CommentItem) => void
  onCancelEdit: () => void
  onSaveEdit: (commentId: string) => Promise<void>
  onDelete: (commentId: string) => void
  onSetEditingText: (text: string) => void
  onToggleReplyThread: (commentId: string, repliesCount: number) => void
  onToggleHistory: (commentId: string) => void
  canEditComment: (comment: CommentItem) => boolean
}

export interface LetterCommentsRef {
  focusInput: () => void
  scrollToInput: () => void
}

export const LetterComments = memo(
  forwardRef<LetterCommentsRef, LetterCommentsProps>(function LetterComments(
    {
      comments,
      filter,
      includeReplies,
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
      onSetFilter,
      onSetIncludeReplies,
      onLoadMore,
      onRefresh,
      onAddComment,
      onStartEdit,
      onCancelEdit,
      onSaveEdit,
      onDelete,
      onSetEditingText,
      onToggleReplyThread,
      onToggleHistory,
      canEditComment,
    },
    ref
  ) {
    const inputRef = useRef<HTMLTextAreaElement>(null)
    const commentTextRef = useRef('')

    useImperativeHandle(ref, () => ({
      focusInput: () => inputRef.current?.focus(),
      scrollToInput: () => {
        inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        inputRef.current?.focus()
      },
    }))

    const handleSubmit = useCallback(
      async (e: React.FormEvent) => {
        e.preventDefault()
        const text = commentTextRef.current.trim()
        if (!text) return

        const success = await onAddComment(text)
        if (success && inputRef.current) {
          inputRef.current.value = ''
          commentTextRef.current = ''
        }
      },
      [onAddComment]
    )

    const commentCount = total ?? comments.length

    const renderComment = useCallback(
      (comment: CommentItem, depth = 0) => {
        const author = comment.author.name || comment.author.email || 'Неизвестный'
        const replies = comment.replies ?? []
        const repliesCount = comment._count?.replies ?? replies.length
        const isExpanded = includeReplies || expandedReplyIds.includes(comment.id)
        const cachedReplies = replyCache[comment.id] ?? []
        const displayedReplies = includeReplies ? replies : cachedReplies
        const isRepliesLoading = replyLoading[comment.id]
        const canEdit = canEditComment(comment)
        const isEditing = editingId === comment.id
        const isSaving = submitting && isEditing
        const isEdited = comment.updatedAt && comment.updatedAt !== comment.createdAt
        const historyExpanded = expandedHistoryIds.includes(comment.id)
        const historyItems = commentHistory[comment.id] ?? []
        const isHistoryLoading = historyLoading[comment.id]
        const historyErrorMsg = historyError[comment.id]

        return (
          <div
            key={comment.id}
            className={`group relative overflow-hidden rounded-xl transition-all ${
              depth > 0
                ? 'ml-4 border-l-2 border-slate-700/50 bg-slate-800/20 pl-4 md:ml-8 md:pl-6'
                : 'bg-gradient-to-br from-slate-800/50 to-slate-800/30'
            }`}
          >
            <div className="p-4">
              {/* Header */}
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-500/20 to-indigo-500/20">
                    <User className="h-4 w-4 text-teal-400" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-white">{author}</span>
                      {isEdited && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-700/50 px-2 py-0.5 text-[10px] text-slate-400">
                          <Pencil className="h-2.5 w-2.5" />
                          изменено
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Clock className="h-3 w-3" />
                      {new Date(comment.createdAt).toLocaleString('ru-RU')}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                {canEdit && !isEditing && (
                  <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={() => onStartEdit(comment)}
                      className="rounded-lg p-2 text-slate-400 transition-all hover:bg-slate-700 hover:text-white"
                      title="Редактировать"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onDelete(comment.id)}
                      className="rounded-lg p-2 text-slate-400 transition-all hover:bg-red-500/20 hover:text-red-400"
                      title="Удалить"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Content */}
              {isEditing ? (
                <div className="space-y-3">
                  <textarea
                    rows={3}
                    value={editingText}
                    onChange={(e) => onSetEditingText(e.target.value)}
                    className="w-full resize-none rounded-xl border border-slate-600 bg-slate-900/80 px-4 py-3 text-sm text-white placeholder-slate-500 transition focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500/50"
                    autoFocus
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={onCancelEdit}
                      disabled={isSaving}
                      className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-600"
                    >
                      Отмена
                    </button>
                    <button
                      onClick={() => onSaveEdit(comment.id)}
                      disabled={isSaving}
                      className="inline-flex items-center gap-2 rounded-lg bg-teal-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-400 disabled:opacity-50"
                    >
                      {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Сохранить'}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
                  {comment.text}
                </p>
              )}

              {/* History toggle */}
              {isEdited && !isEditing && (
                <button
                  onClick={() => onToggleHistory(comment.id)}
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-teal-400 transition hover:text-teal-300"
                >
                  <History className="h-3.5 w-3.5" />
                  {historyExpanded ? 'Скрыть историю' : 'История правок'}
                </button>
              )}

              {/* History */}
              {historyExpanded && (
                <div className="mt-3 space-y-2 rounded-xl border border-slate-700/50 bg-slate-900/50 p-3">
                  {isHistoryLoading && (
                    <div className="flex items-center gap-2 py-2 text-xs text-slate-400">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Загрузка истории...
                    </div>
                  )}
                  {historyErrorMsg && (
                    <div className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-300">
                      {historyErrorMsg}
                    </div>
                  )}
                  {!isHistoryLoading && !historyErrorMsg && historyItems.length === 0 && (
                    <div className="py-2 text-xs text-slate-500">Пока нет правок</div>
                  )}
                  {historyItems.map((edit) => (
                    <div
                      key={edit.id}
                      className="rounded-lg border border-slate-700/30 bg-slate-800/50 p-3 text-xs"
                    >
                      <div className="mb-2 flex items-center gap-2 text-slate-500">
                        <User className="h-3 w-3" />
                        {edit.editor.name || edit.editor.email || 'Неизвестный'}
                        <span>·</span>
                        {new Date(edit.createdAt).toLocaleString('ru-RU')}
                      </div>
                      <div className="space-y-1.5">
                        <div className="rounded-lg bg-red-500/5 px-2.5 py-1.5 text-slate-400">
                          <span className="mr-1.5 text-red-400/70">−</span>
                          {edit.oldText}
                        </div>
                        <div className="rounded-lg bg-emerald-500/5 px-2.5 py-1.5 text-slate-300">
                          <span className="mr-1.5 text-emerald-400/70">+</span>
                          {edit.newText}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Replies toggle */}
              {repliesCount > 0 && !includeReplies && (
                <button
                  onClick={() => onToggleReplyThread(comment.id, repliesCount)}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-slate-700/30 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-700/50"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-teal-400" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-teal-400" />
                  )}
                  {repliesCount}{' '}
                  {repliesCount === 1 ? 'ответ' : repliesCount < 5 ? 'ответа' : 'ответов'}
                </button>
              )}
            </div>

            {/* Replies content */}
            {isExpanded && isRepliesLoading && (
              <div className="border-t border-slate-700/30 px-4 py-3">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Загрузка ответов...
                </div>
              </div>
            )}
            {isExpanded && !isRepliesLoading && displayedReplies.length > 0 && (
              <div className="space-y-2 border-t border-slate-700/30 p-4">
                {displayedReplies.map((reply) => renderComment(reply, depth + 1))}
              </div>
            )}
          </div>
        )
      },
      [
        canEditComment,
        editingId,
        editingText,
        submitting,
        expandedReplyIds,
        expandedHistoryIds,
        commentHistory,
        historyLoading,
        historyError,
        replyCache,
        replyLoading,
        includeReplies,
        onStartEdit,
        onDelete,
        onSetEditingText,
        onCancelEdit,
        onSaveEdit,
        onToggleHistory,
        onToggleReplyThread,
      ]
    )

    return (
      <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30 p-4 md:p-5">
        {/* Header */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-purple-500/15 p-2.5">
              <MessageSquare className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Комментарии</h3>
              <p className="text-xs text-slate-500">{commentCount} записей</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filter tabs */}
            <div className="flex rounded-lg bg-slate-800/80 p-1">
              <button
                onClick={() => onSetFilter('all')}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  filter === 'all'
                    ? 'bg-slate-700 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Все
              </button>
              <button
                onClick={() => onSetFilter('mine')}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  filter === 'mine'
                    ? 'bg-slate-700 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Мои
              </button>
            </div>

            <button
              onClick={() => onSetIncludeReplies(!includeReplies)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                includeReplies
                  ? 'bg-teal-500/20 text-teal-300 ring-1 ring-teal-500/30'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white'
              }`}
            >
              {includeReplies ? '✓ С ответами' : 'С ответами'}
            </button>

            <button
              onClick={onRefresh}
              disabled={loading}
              className="rounded-lg bg-slate-800/80 p-2 text-slate-400 transition hover:text-white disabled:opacity-50"
              title="Обновить"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 flex items-center justify-between rounded-xl border border-red-500/30 bg-red-500/10 p-4">
            <span className="text-sm text-red-300">{error}</span>
            <button
              onClick={onRefresh}
              className="text-sm font-medium text-red-200 transition hover:text-red-100"
            >
              Повторить
            </button>
          </div>
        )}

        {/* Comments list */}
        {loading && comments.length === 0 ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-800/30" />
            ))}
          </div>
        ) : comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 rounded-full bg-slate-800/50 p-4">
              <MessageSquare className="h-8 w-8 text-slate-500" />
            </div>
            <p className="text-sm text-slate-400">
              {filter === 'mine' ? 'У вас пока нет комментариев' : 'Пока нет комментариев'}
            </p>
            <p className="mt-1 text-xs text-slate-500">Будьте первым, кто оставит комментарий</p>
          </div>
        ) : (
          <div className="space-y-3">{comments.map((comment) => renderComment(comment))}</div>
        )}

        {/* Load more */}
        {hasMore && (
          <div className="mt-4 flex justify-center">
            <button
              onClick={onLoadMore}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-800/60 px-5 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
              Показать ещё
            </button>
          </div>
        )}

        {/* Add comment form */}
        <form onSubmit={handleSubmit} className="mt-5 border-t border-slate-700/50 pt-5">
          <div className="relative">
            <textarea
              ref={inputRef}
              rows={3}
              onChange={(e) => (commentTextRef.current = e.target.value)}
              className="w-full resize-none rounded-xl border border-slate-600/50 bg-slate-800/50 px-4 py-3 pr-24 text-white placeholder-slate-500 transition focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500/50"
              placeholder="Напишите комментарий..."
            />
            <button
              type="submit"
              disabled={submitting}
              className="absolute bottom-3 right-3 inline-flex items-center gap-2 rounded-lg bg-teal-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-400 disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">Отправить</span>
            </button>
          </div>
        </form>
      </div>
    )
  })
)
