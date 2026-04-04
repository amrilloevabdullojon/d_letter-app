export function TabSkeleton() {
  return (
    <div className="flex flex-col space-y-4 p-6">
      <div className="skeleton h-8 w-1/4 rounded-xl" />
      <div className="skeleton h-32 w-full rounded-2xl" />
      <div className="flex gap-4">
        <div className="skeleton h-16 w-1/3 rounded-xl" />
        <div className="skeleton h-16 w-1/3 rounded-xl" />
        <div className="skeleton h-16 w-1/3 rounded-xl" />
      </div>
    </div>
  )
}
