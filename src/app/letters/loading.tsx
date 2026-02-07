import { Loader2 } from 'lucide-react'

export default function LettersLoading() {
  return (
    <div className="app-shell min-h-screen">
      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {/* Header skeleton */}
        <div className="mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800/80 via-slate-800/60 to-slate-900/80 p-6 md:p-8">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 animate-pulse rounded-xl bg-slate-700/50" />
            <div className="space-y-2">
              <div className="h-8 w-32 animate-pulse rounded-lg bg-slate-700/50" />
              <div className="h-4 w-24 animate-pulse rounded bg-slate-700/30" />
            </div>
          </div>
        </div>

        {/* Filters skeleton */}
        <div className="mb-6 rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/80 to-slate-800/60 p-4">
          <div className="h-12 w-full animate-pulse rounded-xl bg-slate-700/30" />
        </div>

        {/* Content skeleton */}
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-teal-400" />
        </div>
      </div>
    </div>
  )
}
