import { EqualizerLoader } from '@/components/ui/EqualizerLoader'

export default function ReportsLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <EqualizerLoader />
    </div>
  )
}
