export default function MyProgressLoading() {
  return (
    <div className="app-shell min-h-screen">
      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {/* Header skeleton */}
        <div className="mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800/80 via-slate-800/60 to-slate-900/80 p-4 sm:p-6">
          <div className="flex items-center gap-4">
            <div className="skeleton h-12 w-12 rounded-xl" />
            <div className="space-y-2">
              <div className="skeleton h-7 w-40 rounded-lg" />
              <div className="skeleton h-4 w-56 rounded" />
            </div>
          </div>
        </div>

        {/* Stats skeleton */}
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton h-24 rounded-2xl" />
          ))}
        </div>

        {/* Content skeleton */}
        <div className="skeleton h-80 w-full rounded-2xl" />
      </div>
    </div>
  )
}
