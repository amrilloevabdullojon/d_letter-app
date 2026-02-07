'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import Link from 'next/link'

export default function LettersError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Letters error:', error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-8">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/20">
          <AlertTriangle className="h-7 w-7 text-red-400" />
        </div>
        <h2 className="mb-2 text-lg font-bold text-white">Ошибка загрузки писем</h2>
        <p className="mb-6 text-sm text-slate-400">
          Не удалось загрузить список писем. Проверьте подключение и попробуйте снова.
        </p>
        {process.env.NODE_ENV === 'development' && error?.message && (
          <pre className="mb-4 max-h-32 overflow-auto rounded-lg bg-slate-800/80 p-3 text-left text-xs text-red-300">
            {error.message}
          </pre>
        )}
        <div className="flex justify-center gap-3">
          <button
            onClick={reset}
            className="flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm text-white transition hover:bg-teal-700"
          >
            <RefreshCw className="h-4 w-4" />
            Обновить
          </button>
          <Link
            href="/"
            className="flex items-center gap-2 rounded-lg bg-slate-700 px-4 py-2 text-sm text-white transition hover:bg-slate-600"
          >
            <Home className="h-4 w-4" />
            Главная
          </Link>
        </div>
      </div>
    </div>
  )
}
