import { EnvelopeLoader } from '@/components/ui/EnvelopeLoader'

export default function AnalyticsLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <EnvelopeLoader />
    </div>
  )
}
