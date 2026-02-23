'use client'

import { useState, useEffect, useRef } from 'react'

interface LettersBadge {
  overdue: number
  urgent: number
}

const POLL_INTERVAL_MS = 5 * 60 * 1000 // 5 минут

export function useLettersBadge(): LettersBadge {
  const [badge, setBadge] = useState<LettersBadge>({ overdue: 0, urgent: 0 })
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchStats() {
      try {
        const res = await fetch('/api/stats', { cache: 'no-store' })
        if (!res.ok || cancelled) return
        const data = await res.json()
        const overdue = data?.summary?.overdue ?? 0
        const urgent = data?.summary?.urgent ?? 0
        if (!cancelled) setBadge({ overdue, urgent })
      } catch {
        // silent — badge simply stays 0
      }
    }

    fetchStats()
    timerRef.current = setInterval(fetchStats, POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  return badge
}
