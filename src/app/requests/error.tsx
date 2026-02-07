'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function RequestsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Requests error:', error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-8">
      <div className="max-w-sm text-center">
        <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-red-400" />
        <h2 className="mb-2 text-lg font-bold text-white">Ошибка загрузки заявок</h2>
        <p className="mb-4 text-sm text-slate-400">Не удалось загрузить список заявок.</p>
        <button
          onClick={reset}
          className="mx-auto flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm text-white transition hover:bg-teal-700"
        >
          <RefreshCw className="h-4 w-4" />
          Попробовать снова
        </button>
      </div>
    </div>
  )
}
