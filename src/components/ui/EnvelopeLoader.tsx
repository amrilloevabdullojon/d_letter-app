import { cn } from '@/lib/utils'
import { BouncingDots } from './BouncingDots'

interface EnvelopeLoaderProps {
  className?: string
  showDots?: boolean
}

export function EnvelopeLoader({ className, showDots = true }: EnvelopeLoaderProps) {
  return (
    <div className={cn('flex flex-col items-center gap-5', className)}>
      <div style={{ animation: 'envelope-pulse 2s ease-in-out infinite' }}>
        <svg
          viewBox="0 0 80 56"
          className="h-20 w-24 text-teal-400"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Envelope body */}
          <rect
            x="4"
            y="16"
            width="72"
            height="36"
            rx="4"
            fill="rgba(20,184,166,0.08)"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          {/* Flap top fold line */}
          <path
            d="M4 20 L40 42 L76 20"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
            fill="none"
          />
          {/* Bottom corner seams */}
          <path
            d="M4 52 L30 34 M76 52 L50 34"
            stroke="currentColor"
            strokeWidth="1"
            strokeOpacity="0.4"
          />
          {/* Flap (top triangle) */}
          <path
            d="M4 16 L40 2 L76 16"
            fill="rgba(20,184,166,0.12)"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {showDots && <BouncingDots />}
    </div>
  )
}
