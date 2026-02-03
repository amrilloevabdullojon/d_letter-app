import type { LetterStatus } from '@/types/prisma'

/**
 * Status labels for UI display (Russian)
 */
export const STATUS_LABELS: Record<LetterStatus, string> = {
  NOT_REVIEWED: 'не рассмотрен',
  ACCEPTED: 'принят',
  IN_PROGRESS: 'взято в работу',
  CLARIFICATION: 'на уточнении',
  READY: 'готово',
  DONE: 'сделано',
}

/**
 * Reverse mapping for importing from Google Sheets (lowercase)
 */
export const STATUS_FROM_LABEL: Record<string, LetterStatus> = {
  'не рассмотрен': 'NOT_REVIEWED',
  'принят': 'ACCEPTED',
  'взято в работу': 'IN_PROGRESS',
  'на уточнении': 'CLARIFICATION',
  'готово': 'READY',
  'сделано': 'DONE',
}

/**
 * Tailwind CSS classes for status badges
 */
export const STATUS_COLORS: Record<LetterStatus, string> = {
  NOT_REVIEWED: 'bg-slate-500/20 text-slate-200 ring-1 ring-slate-400/30',
  ACCEPTED: 'bg-sky-500/20 text-sky-200 ring-1 ring-sky-400/30',
  IN_PROGRESS: 'bg-amber-500/20 text-amber-200 ring-1 ring-amber-400/40',
  CLARIFICATION: 'bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-400/40',
  READY: 'bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-400/40',
  DONE: 'bg-teal-500/20 text-teal-200 ring-1 ring-teal-400/40',
}

/**
 * Check if status represents a completed state
 */
export function isDoneStatus(status: LetterStatus): boolean {
  return status === 'READY' || status === 'DONE'
}
