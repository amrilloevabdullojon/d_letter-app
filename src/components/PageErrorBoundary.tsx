'use client'

import { ReactNode } from 'react'
import { ErrorBoundary } from './ErrorBoundary'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import Link from 'next/link'

interface PageErrorBoundaryProps {
  children: ReactNode
  /** Page name for error messages */
  pageName?: string
}

/**
 * Error Boundary specifically designed for page-level errors
 *
 * Provides a full-page error UI with navigation options
 *
 * @example
 * ```tsx
 * // In a page component
 * export default function LettersPage() {
 *   return (
 *     <PageErrorBoundary pageName="Письма">
 *       <LettersContent />
 *     </PageErrorBoundary>
 *   )
 * }
 * ```
 */
export function PageErrorBoundary({ children, pageName }: PageErrorBoundaryProps) {
  return (
    <ErrorBoundary
      onError={(error) => {
        console.error(`Error in ${pageName || 'page'}:`, error)
      }}
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center p-8">
          <div className="max-w-lg text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10">
              <AlertTriangle className="h-10 w-10 text-red-500" />
            </div>

            <h1 className="mb-3 text-2xl font-bold text-white">
              Ошибка загрузки {pageName ? `страницы "${pageName}"` : 'страницы'}
            </h1>

            <p className="mb-8 text-gray-400">
              Произошла ошибка при загрузке содержимого. Попробуйте обновить страницу
              или вернитесь на главную.
            </p>

            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <button
                onClick={() => window.location.reload()}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 font-medium text-white transition hover:bg-emerald-700 sm:w-auto"
              >
                <RefreshCw className="h-5 w-5" />
                Обновить страницу
              </button>

              <Link
                href="/"
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-6 py-3 font-medium text-white transition hover:bg-gray-700 sm:w-auto"
              >
                Вернуться на главную
              </Link>
            </div>
          </div>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  )
}

/**
 * Error Boundary for sections within a page
 *
 * Shows a smaller, inline error message
 */
export function SectionErrorBoundary({
  children,
  sectionName,
}: {
  children: ReactNode
  sectionName?: string
}) {
  return (
    <ErrorBoundary
      fallback={
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-6 text-center">
          <AlertTriangle className="mx-auto mb-2 h-6 w-6 text-red-500" />
          <p className="text-sm text-red-400">
            Не удалось загрузить {sectionName || 'раздел'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 text-xs text-gray-400 underline hover:text-white"
          >
            Обновить страницу
          </button>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  )
}
