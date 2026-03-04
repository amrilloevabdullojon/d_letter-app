export default function HelpLoading() {
  return (
    <div className="min-h-screen px-4 sm:px-6 lg:px-8">
      {/* Hero skeleton */}
      <div className="mx-auto max-w-[1200px] pt-6">
        <div className="skeleton mb-10 h-5 w-24 rounded" />
        <div className="py-20 text-center">
          <div className="skeleton mx-auto mb-6 h-8 w-40 rounded-full" />
          <div className="skeleton mx-auto mb-4 h-16 w-3/4 max-w-lg rounded-2xl" />
          <div className="skeleton mx-auto mb-4 h-10 w-1/2 max-w-sm rounded-2xl" />
          <div className="skeleton mx-auto mb-10 h-6 w-2/3 max-w-md rounded-xl" />
          <div className="flex justify-center gap-4">
            <div className="skeleton h-11 w-36 rounded-xl" />
            <div className="skeleton h-11 w-36 rounded-xl" />
          </div>
          {/* Stats */}
          <div className="mt-14 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton h-20 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>

      {/* Slider skeleton */}
      <div className="mx-auto max-w-[1200px] py-10">
        <div className="skeleton mx-auto mb-12 h-10 w-64 rounded-xl" />
        <div className="skeleton h-80 w-full rounded-3xl" />
      </div>

      {/* Features skeleton */}
      <div className="mx-auto max-w-[1200px] py-10">
        <div className="skeleton mx-auto mb-12 h-10 w-56 rounded-xl" />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="skeleton h-36 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  )
}
