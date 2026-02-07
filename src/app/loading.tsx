import { Loader2 } from 'lucide-react'

export default function RootLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-transparent">
      <Loader2 className="h-10 w-10 animate-spin text-teal-500" />
    </div>
  )
}
