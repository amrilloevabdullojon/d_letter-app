'use client'

import { memo, useState, useRef, useCallback, useEffect, type ReactNode } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { Loader2, Clock, AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react'
import { Header } from '@/components/Header'
import { StatusBadge } from '@/components/StatusBadge'
import { QuickActionsMenu } from '@/components/QuickActionsMenu'
import { formatDate } from '@/lib/utils'
import type { Letter, Neighbors, CommentFilter } from '../types'
import type { LetterCommentsRef } from './LetterComments'
import { LetterHeader } from './LetterHeader'
import { LetterQuickSummary } from './LetterQuickSummary'
import { LetterDetails } from './LetterDetails'
import { LetterComments } from './LetterComments'
import { LetterNavigation } from './LetterNavigation'
import { LetterQuickActions } from './LetterQuickActions'
import { LetterStatusChanger } from './LetterStatusChanger'
import { LetterApplicant } from './LetterApplicant'
import { LetterInfo } from './LetterInfo'
import type { CommentItem, CommentEditItem } from '../types'
import type { LetterStatus } from '@/types/prisma'
import { Copy, Link2, Bell, Send } from 'lucide-react'

const FileUpload = dynamic(
  () => import('@/components/FileUpload').then((mod) => ({ default: mod.FileUpload })),
  { loading: () => <div className="h-32 animate-pulse rounded-xl bg-slate-800/30" /> }
)

const ActivityFeed = dynamic(
  () => import('@/components/ActivityFeed').then((mod) => ({ default: mod.ActivityFeed })),
  { loading: () => <div className="h-48 animate-pulse rounded-xl bg-slate-800/30" /> }
)

const RelatedLetters = dynamic(
  () => import('@/components/RelatedLetters').then((mod) => ({ default: mod.RelatedLetters })),
  { loading: () => <div className="h-32 animate-pulse rounded-xl bg-slate-800/30" /> }
)

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

interface LetterPageLayoutProps {
  letter: Letter
  neighbors: Neighbors | null
  currentUserId: string
  canManageLetters: boolean
  canEditIdentity: boolean
  updating: boolean
  deleting: boolean
  duplicating: boolean
  togglingFavorite: boolean
  togglingWatch: boolean
  notifyingOwner: boolean
  onSaveField: (field: string, value: string) => Promise<void>
  onUpdateField: (field: string, value: string) => Promise<void>
  onDelete: () => void
  onDuplicate: () => void
  onPrint: () => void
  onToggleFavorite: () => void
  onToggleWatch: () => void
  onNotifyOwner: () => void
  onPostponeDeadline: () => void
  onEscalate: () => void
  onRefresh: () => void
  onLoadLetter: () => void
  onChangeOwner?: (ownerId: string | null) => Promise<void>
  comments: CommentItem[]
  commentFilter: CommentFilter
  includeReplies: boolean
  commentsHasMore: boolean
  commentsTotal: number | null
  commentsLoading: boolean
  commentsError: string | null
  commentsSubmitting: boolean
  editingCommentId: string | null
  editingCommentText: string
  expandedReplyIds: string[]
  expandedHistoryIds: string[]
  commentHistory: Record<string, CommentEditItem[]>
  commentHistoryLoading: Record<string, boolean>
  commentHistoryError: Record<string, string>
  replyCache: Record<string, CommentItem[]>
  replyLoading: Record<string, boolean>
  onSetCommentFilter: (filter: CommentFilter) => void
  onSetIncludeReplies: (value: boolean) => void
  onLoadMoreComments: () => void
  onRefreshComments: () => void
  onAddComment: (text: string) => Promise<boolean>
  onStartEditComment: (comment: CommentItem) => void
  onCancelEditComment: () => void
  onSaveEditComment: (commentId: string) => Promise<void>
  onDeleteComment: (commentId: string) => void
  onSetEditingCommentText: (text: string) => void
  onToggleReplyThread: (commentId: string, repliesCount: number) => void
  onToggleCommentHistory: (commentId: string) => void
  canEditComment: (comment: CommentItem) => boolean
  dialog: ReactNode
}

export const LetterPageLayout = memo(function LetterPageLayout({
  letter,
  neighbors,
  currentUserId,
  canManageLetters,
  canEditIdentity,
  updating,
  deleting,
  duplicating,
  togglingFavorite,
  togglingWatch,
  notifyingOwner,
  onSaveField,
  onUpdateField,
  onDelete,
  onDuplicate,
  onPrint,
  onToggleFavorite,
  onToggleWatch,
  onNotifyOwner,
  onPostponeDeadline,
  onEscalate,
  onRefresh,
  onLoadLetter,
  onChangeOwner,
  comments,
  commentFilter,
  includeReplies,
  commentsHasMore,
  commentsTotal,
  commentsLoading,
  commentsError,
  commentsSubmitting,
  editingCommentId,
  editingCommentText,
  expandedReplyIds,
  expandedHistoryIds,
  commentHistory,
  commentHistoryLoading,
  commentHistoryError,
  replyCache,
  replyLoading,
  onSetCommentFilter,
  onSetIncludeReplies,
  onLoadMoreComments,
  onRefreshComments,
  onAddComment,
  onStartEditComment,
  onCancelEditComment,
  onSaveEditComment,
  onDeleteComment,
  onSetEditingCommentText,
  onToggleReplyThread,
  onToggleCommentHistory,
  canEditComment,
  dialog,
}: LetterPageLayoutProps) {
  const commentsRef = useRef<LetterCommentsRef>(null)
  const commentCount = commentsTotal ?? comments.length

  const handleScrollToComments = useCallback(() => {
    commentsRef.current?.scrollToInput()
  }, [])

  const handleStatusChange = useCallback(
    (status: LetterStatus) => {
      void onUpdateField('status', status)
    },
    [onUpdateField]
  )

  const quickActions = [
    {
      icon: Copy,
      label: 'Копировать номер',
      onClick: () => {
        navigator.clipboard.writeText(letter.number)
      },
    },
    {
      icon: Link2,
      label: 'Копировать ссылку',
      onClick: () => {
        if (typeof window !== 'undefined') {
          navigator.clipboard.writeText(window.location.href)
        }
      },
    },
    {
      icon: Bell,
      label: letter.isWatching ? 'Не следить' : 'Следить',
      onClick: onToggleWatch,
    },
    {
      icon: Send,
      label: 'Уведомить исполнителя',
      onClick: onNotifyOwner,
    },
  ]

  return (
    <div className="app-shell min-h-screen overflow-auto bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950">
      <Header />

      <main id="main-content" className="mx-auto max-w-6xl px-4 py-6 pb-20 sm:px-6 sm:py-8 lg:px-8">
        {/* Header */}
        <LetterHeader
          letter={letter}
          togglingFavorite={togglingFavorite}
          duplicating={duplicating}
          deleting={deleting}
          onToggleFavorite={onToggleFavorite}
          onPrint={onPrint}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
        />

        {/* Mobile Sticky Status Bar */}
        <div className="sticky top-14 z-10 -mx-4 mb-4 border-b border-slate-800/50 bg-slate-900/95 px-4 py-3 backdrop-blur-lg md:hidden">
          <div className="flex items-center justify-between gap-3">
            <StatusBadge status={letter.status} size="sm" />
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Clock className="h-3.5 w-3.5" />
              {formatDate(letter.deadlineDate)}
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3 lg:gap-6">
          {/* Main Content - 2 cols */}
          <div className="space-y-5 lg:col-span-2">
            {/* Activity Feed */}
            <LazySection
              placeholder={<div className="h-48 animate-pulse rounded-2xl bg-slate-800/30" />}
            >
              <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30 p-4 md:p-5">
                <ActivityFeed
                  letterId={letter.id}
                  maxItems={3}
                  title="Последние действия"
                  compact
                />
              </div>
            </LazySection>

            {/* Quick Summary */}
            <LetterQuickSummary
              letter={letter}
              commentsCount={commentCount}
              onScrollToComments={handleScrollToComments}
            />

            {/* Details */}
            <LetterDetails
              letter={letter}
              currentUserId={currentUserId}
              canEditIdentity={canEditIdentity}
              updating={updating}
              onSave={onSaveField}
              onUpdate={onUpdateField}
            />

            {/* Comments */}
            <LetterComments
              ref={commentsRef}
              comments={comments}
              filter={commentFilter}
              includeReplies={includeReplies}
              hasMore={commentsHasMore}
              total={commentsTotal}
              loading={commentsLoading}
              error={commentsError}
              submitting={commentsSubmitting}
              editingId={editingCommentId}
              editingText={editingCommentText}
              expandedReplyIds={expandedReplyIds}
              expandedHistoryIds={expandedHistoryIds}
              commentHistory={commentHistory}
              historyLoading={commentHistoryLoading}
              historyError={commentHistoryError}
              replyCache={replyCache}
              replyLoading={replyLoading}
              onSetFilter={onSetCommentFilter}
              onSetIncludeReplies={onSetIncludeReplies}
              onLoadMore={onLoadMoreComments}
              onRefresh={onRefreshComments}
              onAddComment={onAddComment}
              onStartEdit={onStartEditComment}
              onCancelEdit={onCancelEditComment}
              onSaveEdit={onSaveEditComment}
              onDelete={onDeleteComment}
              onSetEditingText={onSetEditingCommentText}
              onToggleReplyThread={onToggleReplyThread}
              onToggleHistory={onToggleCommentHistory}
              canEditComment={canEditComment}
            />
          </div>

          {/* Sidebar - 1 col */}
          <div className="space-y-4 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:self-start lg:overflow-y-auto lg:pr-1">
            <LetterNavigation neighbors={neighbors} />

            <LetterQuickActions
              letterNumber={letter.number}
              isWatching={letter.isWatching}
              togglingWatch={togglingWatch}
              onRefresh={onRefresh}
              onToggleWatch={onToggleWatch}
              onPrint={onPrint}
            />

            <LetterInfo
              letter={letter}
              updating={updating}
              notifyingOwner={notifyingOwner}
              canManageLetters={canManageLetters}
              onPostponeDeadline={onPostponeDeadline}
              onEscalate={onEscalate}
              onNotifyOwner={onNotifyOwner}
              onSaveField={onSaveField}
              onChangeOwner={onChangeOwner}
            />

            <LetterApplicant letter={letter} onSave={onSaveField} onUpdate={onLoadLetter} />

            <LetterStatusChanger
              currentStatus={letter.status}
              updating={updating}
              onStatusChange={handleStatusChange}
            />

            {/* Files */}
            <LazySection
              placeholder={<div className="h-32 animate-pulse rounded-2xl bg-slate-800/30" />}
            >
              <FileUpload letterId={letter.id} files={letter.files} onFilesChange={onLoadLetter} />
            </LazySection>

            {/* Related Letters */}
            <LazySection
              placeholder={<div className="h-24 animate-pulse rounded-2xl bg-slate-800/30" />}
            >
              <RelatedLetters currentLetterId={letter.id} organization={letter.org} />
            </LazySection>
          </div>
        </div>
      </main>

      {dialog}

      <QuickActionsMenu actions={quickActions} />
    </div>
  )
})

// Loading state component
export const LetterPageLoading = memo(function LetterPageLoading() {
  return (
    <div className="app-shell flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950">
      <div className="relative">
        {/* Decorative glow */}
        <div className="absolute -inset-4 rounded-full bg-teal-500/20 blur-xl" />
        <Loader2 className="relative h-10 w-10 animate-spin text-teal-400" />
      </div>
      <p className="mt-4 text-sm text-slate-400">Загрузка письма...</p>
    </div>
  )
})

// Error state component
interface LetterPageErrorProps {
  error: string | null
  onRetry: () => void
}

export const LetterPageError = memo(function LetterPageError({
  error,
  onRetry,
}: LetterPageErrorProps) {
  return (
    <div className="app-shell min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950">
      <Header />
      <main className="mx-auto max-w-lg px-4 py-16">
        <div className="text-center">
          {/* Error icon */}
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
            <AlertCircle className="h-8 w-8 text-red-400" />
          </div>

          <h1 className="text-xl font-semibold text-white">Письмо не найдено</h1>
          <p className="mt-2 text-sm text-slate-400">
            {error || 'Проверьте ссылку или обновите страницу.'}
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-2 rounded-xl bg-teal-500 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-teal-400"
            >
              <RefreshCw className="h-4 w-4" />
              Повторить
            </button>
            <Link
              href="/letters"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-5 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-700"
            >
              <ArrowLeft className="h-4 w-4" />К списку писем
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
})
