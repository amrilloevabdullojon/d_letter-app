'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import Link from 'next/link'

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Root error boundary:', error)
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center bg-transparent p-8">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20">
          <AlertTriangle className="h-8 w-8 text-red-500" />
        </div>
        <h2 className="mb-2 text-xl font-bold text-white">Что-то пошло не так</h2>
        <p className="mb-6 text-slate-400">
          Произошла непредвиденная ошибка. Попробуйте обновить страницу.
        </p>
        {process.env.NODE_ENV === 'development' && error?.message && (
          <details className="mb-6 rounded-lg bg-slate-800/80 p-4 text-left">
            <summary className="mb-2 cursor-pointer text-sm text-red-400">Детали ошибки</summary>
            <pre className="max-h-40 overflow-auto text-xs text-slate-400">{error.message}</pre>
          </details>
        )}
        <div className="flex justify-center gap-3">
          <button
            onClick={reset}
            className="flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-white transition hover:bg-teal-700"
          >
            <RefreshCw className="h-4 w-4" />
            Попробовать снова
          </button>
          <Link
            href="/"
            className="flex items-center gap-2 rounded-lg bg-slate-700 px-4 py-2 text-white transition hover:bg-slate-600"
          >
            <Home className="h-4 w-4" />
            На главную
          </Link>
        </div>
      </div>
    </div>
  )
}
