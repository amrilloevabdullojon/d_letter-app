import { cn } from '@/lib/utils'
import { BouncingDots } from './BouncingDots'

interface EqualizerLoaderProps {
  className?: string
  showDots?: boolean
}

const BARS = [0.45, 0.75, 0.55, 0.9, 0.6, 0.4, 0.7]

export function EqualizerLoader({ className, showDots = true }: EqualizerLoaderProps) {
  return (
    <div className={cn('flex flex-col items-center gap-5', className)}>
      <div className="flex h-12 items-end gap-1">
        {BARS.map((maxH, i) => (
          <div
            key={i}
            className="w-1.5 origin-bottom rounded-full bg-teal-400"
            style={{
              height: `${maxH * 100}%`,
              animation: `equalizerBar 0.7s ease-in-out ${i * 0.1}s infinite alternate`,
            }}
          />
        ))}
      </div>

      {showDots && <BouncingDots />}
    </div>
  )
}
