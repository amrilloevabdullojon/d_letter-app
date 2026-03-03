export default function SettingsLoading() {
  return (
    <div className="app-shell min-h-screen">
      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {/* Back link skeleton */}
        <div className="skeleton mb-4 h-5 w-20 rounded" />

        {/* Header skeleton */}
        <div className="mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800/80 via-slate-800/60 to-slate-900/80 p-4 sm:p-6">
          <div className="flex items-center gap-4">
            <div className="skeleton h-12 w-12 rounded-xl" />
            <div className="space-y-2">
              <div className="skeleton h-7 w-32 rounded-lg" />
              <div className="skeleton h-4 w-48 rounded" />
            </div>
          </div>
        </div>

        {/* Tabs skeleton */}
        <div className="mb-6 overflow-hidden rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/80 to-slate-800/60 p-2">
          <div className="flex gap-1">
            {[80, 96, 112, 72, 108, 120, 128, 80].map((w, i) => (
              <div key={i} className={`skeleton h-9 rounded-xl`} style={{ width: w }} />
            ))}
          </div>
        </div>

        {/* Content skeleton */}
        <div className="skeleton h-64 w-full rounded-2xl" />
      </div>
    </div>
  )
}
