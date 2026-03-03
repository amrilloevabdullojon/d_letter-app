'use client'

import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
}

/**
 * Base skeleton component with pulse animation.
 */
export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn('skeleton', className)} />
}

/**
 * Skeleton for letter card in list view.
 */
export function LetterCardSkeleton() {
  return (
    <div className="space-y-3 rounded-lg border border-gray-700 bg-gray-800 p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <div className="flex items-center gap-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-16" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
  )
}

/**
 * Skeleton for letters list page.
 */
export function LettersListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {/* Filters skeleton */}
      <div className="mb-6 flex flex-wrap gap-3">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-48" />
        <Skeleton className="ml-auto h-10 w-24" />
      </div>

      {/* Letter cards */}
      {Array.from({ length: count }).map((_, i) => (
        <LetterCardSkeleton key={i} />
      ))}

      {/* Pagination skeleton */}
      <div className="mt-6 flex items-center justify-center gap-2">
        <Skeleton className="h-10 w-10" />
        <Skeleton className="h-10 w-10" />
        <Skeleton className="h-10 w-10" />
      </div>
    </div>
  )
}

/**
 * Skeleton for letter detail page.
 */
export function LetterDetailSkeleton() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      {/* Back button */}
      <div className="mb-6 flex items-center justify-between">
        <Skeleton className="h-6 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Header card */}
          <div className="rounded-lg border border-gray-700 bg-gray-800 p-6">
            <div className="mb-4 flex items-start justify-between">
              <div className="space-y-2">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-8 w-64" />
              </div>
              <Skeleton className="h-8 w-24 rounded-full" />
            </div>
          </div>

          {/* Content card */}
          <div className="space-y-4 rounded-lg border border-gray-700 bg-gray-800 p-6">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-16 w-full" />
          </div>

          {/* Comments card */}
          <div className="space-y-4 rounded-lg border border-gray-700 bg-gray-800 p-6">
            <Skeleton className="h-6 w-32" />
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Info card */}
          <div className="space-y-4 rounded-lg border border-gray-700 bg-gray-800 p-6">
            <Skeleton className="h-6 w-32" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-5 w-5" />
                <div className="space-y-1">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
            ))}
          </div>

          {/* Status card */}
          <div className="space-y-2 rounded-lg border border-gray-700 bg-gray-800 p-6">
            <Skeleton className="mb-4 h-6 w-40" />
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>

          {/* Files card */}
          <div className="space-y-3 rounded-lg border border-gray-700 bg-gray-800 p-6">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Skeleton for dashboard stats.
 */
export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-lg border border-gray-700 bg-gray-800 p-4">
          <Skeleton className="mb-2 h-4 w-24" />
          <Skeleton className="h-8 w-16" />
        </div>
      ))}
    </div>
  )
}

/**
 * Skeleton for user card.
 */
export function UserCardSkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-gray-700 bg-gray-800 p-4">
      <Skeleton className="h-12 w-12 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-48" />
      </div>
      <Skeleton className="h-6 w-20 rounded-full" />
    </div>
  )
}

/**
 * Skeleton for table rows.
 */
export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <tr>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  )
}

/**
 * Skeleton for reports/charts.
 */
export function ChartSkeleton() {
  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800 p-6">
      <Skeleton className="mb-4 h-6 w-48" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}

/**
 * Full page loading skeleton.
 */
export function PageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header skeleton */}
      <div className="flex h-16 items-center justify-between border-b border-gray-700 bg-gray-800 px-4">
        <Skeleton className="h-10 w-32" />
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>

      {/* Content skeleton */}
      <div className="mx-auto max-w-7xl px-4 py-8">
        <Skeleton className="mb-6 h-8 w-64" />
        <LettersListSkeleton count={3} />
      </div>
    </div>
  )
}
