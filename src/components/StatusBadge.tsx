'use client'

import type { LetterStatus } from '@/types/prisma'
import { STATUS_LABELS } from '@/lib/utils'
import {
  Circle,
  CircleDot,
  Clock,
  HelpCircle,
  CheckCircle,
  CheckCircle2,
  Snowflake,
  XCircle,
  RefreshCw,
} from 'lucide-react'

interface StatusBadgeProps {
  status: LetterStatus
  size?: 'xs' | 'sm' | 'md' | 'lg'
  /**
   * When true, uses mobile-optimized sizing: larger touch targets and better readability
   * @default false
   */
  mobileOptimized?: boolean
}

export function StatusBadge({ status, size = 'md', mobileOptimized = false }: StatusBadgeProps) {
  const sizeClasses = {
    xs: 'text-[10px] px-1.5 py-0.5 gap-1',
    sm: 'text-xs px-2 py-0.5 gap-1.5',
    md: mobileOptimized
      ? 'text-sm px-3 py-1.5 gap-2 md:px-2.5 md:py-1'
      : 'text-sm px-2.5 py-1 gap-2',
    lg: mobileOptimized
      ? 'text-base px-4 py-2 gap-2.5 md:text-sm md:px-3 md:py-1.5'
      : 'text-sm px-3 py-1.5 gap-2.5',
  }

  const iconSizes = {
    xs: 'h-2.5 w-2.5',
    sm: 'h-3 w-3',
    md: mobileOptimized ? 'h-4 w-4 md:h-3.5 md:w-3.5' : 'h-3.5 w-3.5',
    lg: mobileOptimized ? 'h-5 w-5 md:h-4 md:w-4' : 'h-4 w-4',
  }

  const statusStyles: Record<
    LetterStatus,
    { bg: string; text: string; border: string; icon: React.ComponentType<{ className?: string }> }
  > = {
    NOT_REVIEWED: {
      bg: 'bg-slate-100 dark:bg-slate-500/10',
      text: 'text-slate-700 dark:text-slate-300',
      border: 'border-slate-300 dark:border-slate-400/30',
      icon: Circle,
    },
    ACCEPTED: {
      bg: 'bg-sky-100 dark:bg-sky-500/10',
      text: 'text-sky-700 dark:text-sky-300',
      border: 'border-sky-300 dark:border-sky-400/30',
      icon: CircleDot,
    },
    IN_PROGRESS: {
      bg: 'bg-amber-100 dark:bg-amber-500/10',
      text: 'text-amber-700 dark:text-amber-300',
      border: 'border-amber-300 dark:border-amber-400/30',
      icon: Clock,
    },
    CLARIFICATION: {
      bg: 'bg-cyan-100 dark:bg-cyan-500/10',
      text: 'text-cyan-700 dark:text-cyan-300',
      border: 'border-cyan-300 dark:border-cyan-400/30',
      icon: HelpCircle,
    },
    READY: {
      bg: 'bg-emerald-100 dark:bg-emerald-500/10',
      text: 'text-emerald-700 dark:text-emerald-300',
      border: 'border-emerald-300 dark:border-emerald-400/30',
      icon: CheckCircle,
    },
    DONE: {
      bg: 'bg-teal-100 dark:bg-teal-500/10',
      text: 'text-teal-700 dark:text-teal-300',
      border: 'border-teal-300 dark:border-teal-400/30',
      icon: CheckCircle2,
    },
    FROZEN: {
      bg: 'bg-blue-100 dark:bg-blue-500/10',
      text: 'text-blue-700 dark:text-blue-300',
      border: 'border-blue-300 dark:border-blue-400/30',
      icon: Snowflake,
    },
    REJECTED: {
      bg: 'bg-red-100 dark:bg-red-500/10',
      text: 'text-red-700 dark:text-red-300',
      border: 'border-red-300 dark:border-red-400/30',
      icon: XCircle,
    },
    PROCESSED: {
      bg: 'bg-purple-100 dark:bg-purple-500/10',
      text: 'text-purple-700 dark:text-purple-300',
      border: 'border-purple-300 dark:border-purple-400/30',
      icon: RefreshCw,
    },
  }

  const styles = statusStyles[status]
  const IconComponent = styles.icon

  return (
    <span
      className={`inline-flex flex-shrink-0 items-center whitespace-nowrap rounded-full border font-medium leading-none ${sizeClasses[size]} ${styles.bg} ${styles.text} ${styles.border}`}
    >
      <IconComponent className={iconSizes[size]} aria-hidden="true" />
      {STATUS_LABELS[status]}
    </span>
  )
}
