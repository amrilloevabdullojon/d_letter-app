import { EnvelopeLoader } from '@/components/ui/EnvelopeLoader'

export default function RootLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-transparent">
      <EnvelopeLoader />
    </div>
  )
}
