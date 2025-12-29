'use client'

import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-gray-700/50',
        className
      )}
    />
  )
}

// Скелетон для карточки письма
export function LetterCardSkeleton() {
  return (
    <div className="relative bg-gray-800 rounded-xl border border-gray-700/50 overflow-hidden">
      {/* Priority bar skeleton */}
      <Skeleton className="absolute top-0 left-0 right-0 h-1 rounded-none" />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-20 rounded" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-6 w-3/4" />
          </div>
        </div>

        {/* Status badge */}
        <div className="mb-4">
          <Skeleton className="h-7 w-24 rounded-full" />
        </div>

        {/* Content preview */}
        <div className="space-y-2 mb-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>

        {/* Meta info */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <Skeleton className="h-6 w-24 rounded" />
          <Skeleton className="h-6 w-20 rounded" />
        </div>

        {/* Deadline section */}
        <div className="pt-4 border-t border-gray-700/50">
          <Skeleton className="h-1.5 w-full rounded-full mb-3" />
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-6 w-20 rounded" />
          </div>
        </div>
      </div>
    </div>
  )
}

// Скелетон для строки таблицы
export function TableRowSkeleton() {
  return (
    <tr className="border-b border-gray-700">
      <td className="px-4 py-3">
        <Skeleton className="h-5 w-5" />
      </td>
      <td className="px-4 py-3">
        <Skeleton className="h-5 w-20" />
      </td>
      <td className="px-4 py-3">
        <Skeleton className="h-5 w-48" />
      </td>
      <td className="px-4 py-3">
        <Skeleton className="h-5 w-24" />
      </td>
      <td className="px-4 py-3">
        <div className="space-y-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      </td>
      <td className="px-4 py-3">
        <Skeleton className="h-6 w-24 rounded-full" />
      </td>
      <td className="px-4 py-3">
        <Skeleton className="h-5 w-16" />
      </td>
      <td className="px-4 py-3">
        <Skeleton className="h-5 w-24" />
      </td>
      <td className="px-4 py-3">
        <Skeleton className="h-5 w-5" />
      </td>
    </tr>
  )
}

// Скелетон для списка таблицы
export function TableSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-900/50 border-b border-gray-700">
              <th className="px-4 py-3 w-10"><Skeleton className="h-5 w-5" /></th>
              <th className="px-4 py-3 text-left"><Skeleton className="h-4 w-16" /></th>
              <th className="px-4 py-3 text-left"><Skeleton className="h-4 w-24" /></th>
              <th className="px-4 py-3 text-left"><Skeleton className="h-4 w-12" /></th>
              <th className="px-4 py-3 text-left"><Skeleton className="h-4 w-16" /></th>
              <th className="px-4 py-3 text-left"><Skeleton className="h-4 w-16" /></th>
              <th className="px-4 py-3 text-left"><Skeleton className="h-4 w-10" /></th>
              <th className="px-4 py-3 text-left"><Skeleton className="h-4 w-24" /></th>
              <th className="px-4 py-3 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, i) => (
              <TableRowSkeleton key={i} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Скелетон для карточек
export function CardsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <LetterCardSkeleton key={i} />
      ))}
    </div>
  )
}

// Скелетон для статистики на главной
export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="bg-gray-800 rounded-lg p-5 border border-gray-700">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-8 w-12" />
            </div>
            <Skeleton className="h-8 w-8 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}

// Скелетон для детальной страницы письма
export function LetterDetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-6 w-16 rounded" />
            </div>
            <Skeleton className="h-8 w-64" />
          </div>
          <Skeleton className="h-8 w-28 rounded-full" />
        </div>
      </div>

      {/* Content */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <Skeleton className="h-6 w-48 mb-4" />
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
