/**
 * Pluralize Russian word "день" (day)
 *
 * @example
 * pluralizeDays(1) // => 'день'
 * pluralizeDays(2) // => 'дня'
 * pluralizeDays(5) // => 'дней'
 */
export function pluralizeDays(n: number): string {
  const abs = Math.abs(n)
  const last = abs % 10
  const last2 = abs % 100
  if (last === 1 && last2 !== 11) return 'день'
  if (last >= 2 && last <= 4 && !(last2 >= 12 && last2 <= 14)) return 'дня'
  return 'дней'
}

/**
 * Get priority label and color
 */
export function getPriorityLabel(priority: number): { label: string; color: string } {
  if (priority >= 70) return { label: 'Высокий', color: 'text-red-600' }
  if (priority >= 40) return { label: 'Средний', color: 'text-yellow-600' }
  return { label: 'Низкий', color: 'text-green-600' }
}

/**
 * Sanitize user input for display
 *
 * Escapes HTML characters to prevent XSS
 */
export function sanitizeInput(text: string | null | undefined, maxLength = 10000): string {
  if (!text) return ''
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .substring(0, maxLength)
    .trim()
}
