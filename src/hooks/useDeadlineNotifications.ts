import { useCallback, useEffect, useMemo, useState } from 'react'
import { getWorkingDaysUntilDeadline } from '@/lib/utils'
import { useFetch } from '@/hooks/useFetch'

interface DeadlineLetter {
  id: string
  number: string
  org: string
  deadlineDate: string
  owner?: { id: string; name: string | null; email: string | null } | null
}

type UnifiedKind = 'DEADLINE_OVERDUE' | 'DEADLINE_URGENT'

export interface DeadlineNotification {
  id: string
  kind: UnifiedKind
  title: string
  body: null
  priority: 'CRITICAL' | 'HIGH'
  isRead?: boolean
  createdAt: string
  letter: DeadlineLetter
  daysLeft: number
}

const SNOOZE_KEY = 'notification-deadline-snoozes'
const DEADLINES_LIMIT = 100

const getTomorrowStartIso = () => {
  const now = new Date()
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  return tomorrow.toISOString()
}

export function useDeadlineNotifications(options: { enabled: boolean; refetchInterval?: number }) {
  const [snoozedDeadlines, setSnoozedDeadlines] = useState<Record<string, string>>({})

  // Load snoozes from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const stored = localStorage.getItem(SNOOZE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as Record<string, string>
        if (parsed && typeof parsed === 'object') {
          setSnoozedDeadlines(parsed)
        }
      }
    } catch {
      // Ignore
    }
  }, [])

  // Persist snoozes to localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(SNOOZE_KEY, JSON.stringify(snoozedDeadlines))
    } catch {
      // Ignore
    }
  }, [snoozedDeadlines])

  const overdueQuery = useFetch<{ letters?: DeadlineLetter[] }>(
    `/api/letters?filter=overdue&limit=${DEADLINES_LIMIT}`,
    {
      initialData: { letters: [] },
      skip: !options.enabled,
      refetchInterval: options.enabled ? options.refetchInterval : undefined,
    }
  )

  const urgentQuery = useFetch<{ letters?: DeadlineLetter[] }>(
    `/api/letters?filter=urgent&limit=${DEADLINES_LIMIT}`,
    {
      initialData: { letters: [] },
      skip: !options.enabled,
      refetchInterval: options.enabled ? options.refetchInterval : undefined,
    }
  )

  const notifications = useMemo<DeadlineNotification[]>(() => {
    if (!options.enabled) return []

    const overdue: DeadlineNotification[] = (overdueQuery.data?.letters || []).map((letter) => ({
      id: `deadline-overdue-${letter.id}`,
      kind: 'DEADLINE_OVERDUE' as const,
      title: '',
      body: null,
      priority: 'CRITICAL' as const,
      createdAt: letter.deadlineDate,
      letter,
      daysLeft: getWorkingDaysUntilDeadline(letter.deadlineDate),
    }))

    const urgent: DeadlineNotification[] = (urgentQuery.data?.letters || []).map((letter) => ({
      id: `deadline-urgent-${letter.id}`,
      kind: 'DEADLINE_URGENT' as const,
      title: '',
      body: null,
      priority: 'HIGH' as const,
      createdAt: letter.deadlineDate,
      letter,
      daysLeft: getWorkingDaysUntilDeadline(letter.deadlineDate),
    }))

    return [...overdue, ...urgent].filter((item) => {
      const letterId = item.letter?.id
      if (!letterId) return true
      const snoozedUntil = snoozedDeadlines[letterId]
      if (!snoozedUntil) return true
      return new Date(snoozedUntil).getTime() <= Date.now()
    })
  }, [options.enabled, overdueQuery.data?.letters, urgentQuery.data?.letters, snoozedDeadlines])

  const snoozeDeadline = useCallback((letterId: string) => {
    setSnoozedDeadlines((prev) => ({ ...prev, [letterId]: getTomorrowStartIso() }))
  }, [])

  const snoozeAll = useCallback(() => {
    setSnoozedDeadlines((prev) => {
      const next = { ...prev }
      notifications.forEach((notif) => {
        if (notif.letter?.id) {
          next[notif.letter.id] = getTomorrowStartIso()
        }
      })
      return next
    })
  }, [notifications])

  const clearSnoozes = useCallback(() => {
    setSnoozedDeadlines({})
  }, [])

  const pruneSnoozes = useCallback(() => {
    const now = Date.now()
    setSnoozedDeadlines((prev) => {
      const next = Object.fromEntries(
        Object.entries(prev).filter(([, until]) => new Date(until).getTime() > now)
      )
      return Object.keys(next).length === Object.keys(prev).length ? prev : next
    })
  }, [])

  const hasActiveSnoozes = useMemo(() => {
    const now = Date.now()
    return Object.values(snoozedDeadlines).some((until) => new Date(until).getTime() > now)
  }, [snoozedDeadlines])

  const refetch = useCallback(() => {
    overdueQuery.refetch()
    urgentQuery.refetch()
  }, [overdueQuery, urgentQuery])

  return {
    notifications,
    snoozeDeadline,
    snoozeAll,
    clearSnoozes,
    pruneSnoozes,
    hasActiveSnoozes,
    refetch,
  }
}
