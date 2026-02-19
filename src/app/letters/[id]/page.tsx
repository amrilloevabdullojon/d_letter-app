'use client'

import { useSession } from 'next-auth/react'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect } from 'react'
import { useAuthRedirect } from '@/hooks/useAuthRedirect'
import { hasPermission } from '@/lib/permissions'
import { useLetterData, useLetterActions, useLetterComments } from './hooks'
import { LetterPageLayout, LetterPageLoading, LetterPageError } from './components'
import { PageErrorBoundary } from '@/components/PageErrorBoundary'

const isEditableElement = (target: EventTarget | null) => {
  const element = target as HTMLElement | null
  if (!element) return false
  const tagName = element.tagName?.toLowerCase()
  if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') return true
  return element.isContentEditable
}

function LetterDetailPageContent() {
  const { data: session, status: authStatus } = useSession()
  useAuthRedirect(authStatus)

  const params = useParams()
  const router = useRouter()

  const currentUserId = session?.user?.id ?? ''
  const canManageLetters = hasPermission(session?.user.role, 'MANAGE_LETTERS')
  const canEditIdentity = session?.user?.role === 'ADMIN' || session?.user?.role === 'SUPERADMIN'
  const letterId = params.id as string

  // Data hook
  const {
    letter,
    neighbors,
    loading,
    error: loadError,
    refresh: loadLetter,
    updateLetter,
  } = useLetterData({
    letterId,
    onCommentsLoaded: () => {}, // Comments handled by separate hook
  })

  // Actions hook
  const {
    updating,
    deleting,
    duplicating,
    togglingFavorite,
    togglingWatch,
    notifyingOwner,
    updateField,
    saveField,
    changeOwner,
    deleteLetter,
    duplicateLetter,
    toggleFavorite,
    toggleWatch,
    notifyOwner,
    postponeDeadline,
    escalate,
    printPage,
    ConfirmDialog,
  } = useLetterActions({
    letter,
    onUpdate: loadLetter,
    onLetterChange: updateLetter,
    canManageLetters,
  })

  // Comments hook
  const {
    comments,
    filter: commentFilter,
    includeReplies,
    page: commentsPage,
    hasMore: commentsHasMore,
    total: commentsTotal,
    loading: commentsLoading,
    error: commentsError,
    submitting: commentsSubmitting,
    editingId: editingCommentId,
    editingText: editingCommentText,
    expandedReplyIds,
    expandedHistoryIds,
    commentHistory,
    historyLoading: commentHistoryLoading,
    historyError: commentHistoryError,
    replyCache,
    replyLoading,
    setFilter: setCommentFilter,
    setIncludeReplies,
    loadComments,
    refreshComments,
    addComment,
    startEdit: startEditComment,
    cancelEdit: cancelEditComment,
    saveEdit: saveEditComment,
    deleteComment,
    setEditingText: setEditingCommentText,
    toggleReplyThread,
    toggleCommentHistory,
    canEditComment,
  } = useLetterComments({
    letterId: letter?.id ?? null,
    currentUserId,
    canManageLetters,
  })

  // Load more comments handler
  const handleLoadMoreComments = useCallback(() => {
    void loadComments(commentsPage + 1, true)
  }, [commentsPage, loadComments])

  // Refresh handler
  const handleRefresh = useCallback(() => {
    void loadLetter()
    refreshComments()
  }, [loadLetter, refreshComments])

  // Add comment handler
  const handleAddComment = useCallback(
    async (text: string): Promise<boolean> => {
      const author = {
        id: session?.user?.id || 'unknown',
        name: session?.user?.name || null,
        email: session?.user?.email || null,
      }
      return addComment(text, author)
    },
    [addComment, session?.user]
  )

  // Keyboard shortcuts
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
      if (key === 'r') {
        event.preventDefault()
        handleRefresh()
        return
      }
      if (key === 'p') {
        event.preventDefault()
        printPage()
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
  }, [handleRefresh, letter, neighbors, printPage, router, toggleFavorite])

  // Reset body overflow
  useEffect(() => {
    document.body.style.overflow = ''
  }, [])

  // Loading state
  if (authStatus === 'loading' || (authStatus === 'authenticated' && loading)) {
    return <LetterPageLoading />
  }

  // Not authenticated
  if (!session) {
    return null
  }

  // Error state
  if (!letter) {
    return <LetterPageError error={loadError} onRetry={loadLetter} />
  }

  return (
    <LetterPageLayout
      letter={letter}
      neighbors={neighbors}
      currentUserId={currentUserId}
      canManageLetters={canManageLetters}
      canEditIdentity={canEditIdentity}
      // Actions state
      updating={updating}
      deleting={deleting}
      duplicating={duplicating}
      togglingFavorite={togglingFavorite}
      togglingWatch={togglingWatch}
      notifyingOwner={notifyingOwner}
      // Actions handlers
      onSaveField={saveField}
      onUpdateField={updateField}
      onDelete={deleteLetter}
      onDuplicate={duplicateLetter}
      onPrint={printPage}
      onToggleFavorite={toggleFavorite}
      onToggleWatch={toggleWatch}
      onNotifyOwner={notifyOwner}
      onPostponeDeadline={postponeDeadline}
      onEscalate={escalate}
      onRefresh={handleRefresh}
      onLoadLetter={loadLetter}
      onChangeOwner={changeOwner}
      // Comments props
      comments={comments}
      commentFilter={commentFilter}
      includeReplies={includeReplies}
      commentsHasMore={commentsHasMore}
      commentsTotal={commentsTotal}
      commentsLoading={commentsLoading}
      commentsError={commentsError}
      commentsSubmitting={commentsSubmitting}
      editingCommentId={editingCommentId}
      editingCommentText={editingCommentText}
      expandedReplyIds={expandedReplyIds}
      expandedHistoryIds={expandedHistoryIds}
      commentHistory={commentHistory}
      commentHistoryLoading={commentHistoryLoading}
      commentHistoryError={commentHistoryError}
      replyCache={replyCache}
      replyLoading={replyLoading}
      onSetCommentFilter={setCommentFilter}
      onSetIncludeReplies={setIncludeReplies}
      onLoadMoreComments={handleLoadMoreComments}
      onRefreshComments={refreshComments}
      onAddComment={handleAddComment}
      onStartEditComment={startEditComment}
      onCancelEditComment={cancelEditComment}
      onSaveEditComment={saveEditComment}
      onDeleteComment={deleteComment}
      onSetEditingCommentText={setEditingCommentText}
      onToggleReplyThread={toggleReplyThread}
      onToggleCommentHistory={toggleCommentHistory}
      canEditComment={canEditComment}
      dialog={ConfirmDialog}
    />
  )
}

export default function LetterDetailPage() {
  return (
    <PageErrorBoundary pageName="Письмо">
      <LetterDetailPageContent />
    </PageErrorBoundary>
  )
}
