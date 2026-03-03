export default function NotificationsLoading() {
  return (
    <div className="app-shell min-h-screen">
      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {/* Header skeleton */}
        <div className="mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800/80 via-slate-800/60 to-slate-900/80 p-4 sm:p-6">
          <div className="flex items-center gap-4">
            <div className="skeleton h-12 w-12 rounded-xl" />
            <div className="space-y-2">
              <div className="skeleton h-7 w-36 rounded-lg" />
              <div className="skeleton h-4 w-52 rounded" />
            </div>
          </div>
        </div>

        {/* List skeleton */}
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="skeleton h-16 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  )
}
