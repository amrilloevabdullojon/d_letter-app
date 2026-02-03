/**
 * Export letter to PDF (opens print dialog)
 */
export function exportLetterToPdf(letterId: string): void {
  const url = `/api/export/pdf?id=${encodeURIComponent(letterId)}`
  const printWindow = window.open(url, '_blank')
  if (printWindow) {
    printWindow.onload = () => {
      printWindow.print()
    }
  }
}

/**
 * Download data as CSV file
 *
 * @param data - 2D array of string values
 * @param filename - Name of the file to download
 *
 * @example
 * downloadCsv([
 *   ['Name', 'Email'],
 *   ['John', 'john@example.com'],
 * ], 'users.csv')
 */
export function downloadCsv(data: string[][], filename: string): void {
  const BOM = '\uFEFF' // UTF-8 BOM for Excel compatibility

  const escapeCSV = (value: string) => {
    if (
      value.includes('"') ||
      value.includes(',') ||
      value.includes('\n') ||
      value.includes('\r')
    ) {
      return `"${value.replace(/"/g, '""')}"`
    }
    return value
  }

  const csv = BOM + data.map((row) => row.map(escapeCSV).join(',')).join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
