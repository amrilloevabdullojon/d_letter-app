/**
 * Parse date from various formats
 *
 * Supports:
 * - Date objects
 * - ISO format (2024-01-15)
 * - Russian format with dots (15.01.2024)
 * - US format with slashes (15/01/2024)
 */
export function parseDateValue(value: Date | string | null | undefined): Date | null {
  if (!value) return null
  if (value instanceof Date) return value

  const trimmed = value.trim()

  const isExactDate = (date: Date, year: number, month: number, day: number) =>
    date.getFullYear() === year && date.getMonth() === month && date.getDate() === day

  // Russian format: DD.MM.YYYY
  const dotMatch = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  if (dotMatch) {
    const day = parseInt(dotMatch[1], 10)
    const month = parseInt(dotMatch[2], 10) - 1
    const year = parseInt(dotMatch[3], 10)
    const parsed = new Date(year, month, day)
    return !isNaN(parsed.getTime()) && isExactDate(parsed, year, month, day) ? parsed : null
  }

  // US format: DD/MM/YYYY
  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (slashMatch) {
    const day = parseInt(slashMatch[1], 10)
    const month = parseInt(slashMatch[2], 10) - 1
    const year = parseInt(slashMatch[3], 10)
    const parsed = new Date(year, month, day)
    return !isNaN(parsed.getTime()) && isExactDate(parsed, year, month, day) ? parsed : null
  }

  // ISO format: YYYY-MM-DD
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10)
    const month = parseInt(isoMatch[2], 10) - 1
    const day = parseInt(isoMatch[3], 10)
    const parsed = new Date(year, month, day)
    return !isNaN(parsed.getTime()) && isExactDate(parsed, year, month, day) ? parsed : null
  }

  // Try native Date parsing
  const parsed = new Date(trimmed)
  return isNaN(parsed.getTime()) ? null : parsed
}

/**
 * Format date for display in Russian locale
 */
export function formatDate(date: Date | string | null): string {
  const parsed = parseDateValue(date)
  if (!parsed) return ''
  return parsed.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/**
 * Add working days (excluding weekends) to a date
 */
export function addWorkingDays(date: Date, days: number): Date {
  const result = new Date(date)
  if (days === 0) return result

  const direction = days > 0 ? 1 : -1
  let remaining = Math.abs(days)

  while (remaining > 0) {
    result.setDate(result.getDate() + direction)
    if (result.getDay() !== 0 && result.getDay() !== 6) {
      remaining -= 1
    }
  }
  return result
}

/**
 * Get calendar days until deadline
 */
export function getDaysUntilDeadline(deadline: Date | string): number {
  const parsed = parseDateValue(deadline)
  if (!parsed) return 0
  const now = new Date()
  const deadlineUtc = Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate())
  const nowUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.ceil((deadlineUtc - nowUtc) / (1000 * 60 * 60 * 24))
}

/**
 * Get working days until deadline (excluding weekends)
 */
export function getWorkingDaysUntilDeadline(
  deadline: Date | string,
  fromDate: Date = new Date()
): number {
  const parsed = parseDateValue(deadline)
  if (!parsed) return 0

  const start = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate())
  const end = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate())

  if (start.getTime() === end.getTime()) return 0

  const direction = start < end ? 1 : -1
  let days = 0
  const cursor = new Date(start)

  while ((direction > 0 && cursor < end) || (direction < 0 && cursor > end)) {
    cursor.setDate(cursor.getDate() + direction)
    const day = cursor.getDay()
    if (day !== 0 && day !== 6) {
      days += direction
    }
  }

  return days
}
