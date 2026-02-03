/**
 * Utility functions module
 *
 * This module re-exports all utility functions for convenient importing.
 *
 * @example
 * import { cn, formatDate, STATUS_LABELS } from '@/lib/utils'
 */

// Class name utility
export { cn } from './cn'

// Status utilities
export {
  STATUS_LABELS,
  STATUS_FROM_LABEL,
  STATUS_COLORS,
  isDoneStatus,
} from './status'

// Date utilities
export {
  parseDateValue,
  formatDate,
  addWorkingDays,
  getDaysUntilDeadline,
  getWorkingDaysUntilDeadline,
} from './date'

// Formatting utilities
export {
  pluralizeDays,
  getPriorityLabel,
  sanitizeInput,
} from './format'

// Export utilities
export {
  exportLetterToPdf,
  downloadCsv,
} from './export'
