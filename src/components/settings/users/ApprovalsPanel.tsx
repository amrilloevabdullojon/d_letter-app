'use client'

import { useCallback, useEffect, useState } from 'react'
import { ShieldAlert, RefreshCw, Loader2, CheckCircle, XCircle } from 'lucide-react'
import type { AdminApproval, UserRole } from '@/lib/settings-types'
import { ROLE_LABELS } from '@/lib/settings-types'

function formatDate(date: string): string {
  return new Date(date).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface ApprovalsPanelProps {
  sessionUserId: string
  isSuperAdmin: boolean
  onSuccess: (message: string) => void
  onError: (message: string) => void
  onApprovalDone: () => void // e.g. loadUsers
}

export function ApprovalsPanel({
  sessionUserId,
  isSuperAdmin,
  onSuccess,
  onError,
  onApprovalDone,
}: ApprovalsPanelProps) {
  const [approvals, setApprovals] = useState<AdminApproval[]>([])
  const [approvalsLoading, setApprovalsLoading] = useState(false)
  const [approvalActionId, setApprovalActionId] = useState<string | null>(null)

  const loadApprovals = useCallback(
    async (forceRefresh = false) => {
      if (!isSuperAdmin) return
      setApprovalsLoading(true)
      try {
        const ts = forceRefresh ? `&t=${Date.now()}` : ''
        const res = await fetch(`/api/approvals?status=PENDING${ts}`)
        if (res.ok) {
          const data = await res.json()
          setApprovals(data.approvals || [])
        }
      } catch (error) {
        console.error('Failed to load approvals:', error)
      } finally {
        setApprovalsLoading(false)
      }
    },
    [isSuperAdmin]
  )

  useEffect(() => {
    loadApprovals()
  }, [loadApprovals])

  const handleApproval = useCallback(
    async (approvalId: string, action: 'approve' | 'reject') => {
      setApprovalActionId(approvalId)
      try {
        const res = await fetch(`/api/approvals/${approvalId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        })
        if (res.ok) {
          onSuccess(action === 'approve' ? 'Запрос подтверждён' : 'Запрос отклонён')
          loadApprovals(true)
          onApprovalDone()
        } else {
          const data = await res.json().catch(() => ({}))
          onError(data.error || 'Ошибка обработки запроса')
        }
      } catch (error) {
        console.error('Approval action failed:', error)
        onError('Ошибка обработки запроса')
      } finally {
        setApprovalActionId(null)
      }
    },
    [loadApprovals, onApprovalDone, onSuccess, onError]
  )

  if (!isSuperAdmin) return null

  return (
    <div className="panel-soft panel-glass mb-6 rounded-2xl p-4">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <ShieldAlert className="h-4 w-4 text-amber-400" />
          Запросы на подтверждение
        </div>
        <button
          onClick={() => loadApprovals(true)}
          aria-label="Обновить запросы"
          className="p-2 text-slate-400 transition hover:text-white"
          title="Обновить"
        >
          <RefreshCw className={`h-4 w-4 ${approvalsLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {approvalsLoading && approvals.length === 0 ? (
        <div className="text-xs text-slate-500">Загрузка...</div>
      ) : approvals.length > 0 ? (
        <div className="space-y-3">
          {approvals.map((approval) => {
            const approvalTitle =
              approval.action === 'DEMOTE_ADMIN' ? 'Понижение роли админа' : 'Удаление админа'
            const requester =
              approval.requestedBy.name || approval.requestedBy.email || 'Неизвестный'
            const targetLabel = approval.targetUser.name || approval.targetUser.email || 'Без имени'
            const needsSecondAdmin = approval.requestedBy.id === sessionUserId

            return (
              <div
                key={approval.id}
                className="panel-soft panel-glass flex flex-col gap-3 rounded-xl p-3"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-1">
                    <div className="text-sm text-white">{approvalTitle}</div>
                    <div className="text-xs text-slate-400">
                      {targetLabel} · {ROLE_LABELS[approval.targetUser.role as UserRole]}
                    </div>
                    {approval.action === 'DEMOTE_ADMIN' && approval.payload?.newRole && (
                      <div className="text-xs text-teal-400">
                        Новая роль: {ROLE_LABELS[approval.payload.newRole as UserRole]}
                      </div>
                    )}
                    <div className="text-xs text-slate-500">
                      {requester} · {formatDate(approval.createdAt)}
                      {needsSecondAdmin && (
                        <span className="ml-2 text-amber-400">Нужен второй админ</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleApproval(approval.id, 'approve')}
                      disabled={approvalActionId === approval.id || needsSecondAdmin}
                      title={needsSecondAdmin ? 'Нужен второй админ' : undefined}
                      className="inline-flex items-center gap-2 rounded bg-teal-600 px-3 py-1.5 text-xs text-white transition hover:bg-teal-500 disabled:opacity-50"
                    >
                      {approvalActionId === approval.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <CheckCircle className="h-3 w-3" />
                      )}
                      Подтвердить
                    </button>
                    <button
                      onClick={() => handleApproval(approval.id, 'reject')}
                      disabled={approvalActionId === approval.id || needsSecondAdmin}
                      title={needsSecondAdmin ? 'Нужен второй админ' : undefined}
                      className="btn-secondary inline-flex items-center gap-2 rounded px-3 py-1.5 text-xs transition disabled:opacity-50"
                    >
                      <XCircle className="h-3 w-3" />
                      Отклонить
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-xs text-slate-500">Нет запросов на подтверждение</div>
      )}
    </div>
  )
}
