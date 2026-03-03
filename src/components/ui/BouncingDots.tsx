import { cn } from '@/lib/utils'

interface BouncingDotsProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  color?: string
}

export function BouncingDots({ className, size = 'md', color = 'bg-teal-400' }: BouncingDotsProps) {
  const dotSize = {
    sm: 'h-1 w-1',
    md: 'h-1.5 w-1.5',
    lg: 'h-2 w-2',
  }[size]

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={cn('animate-bounce rounded-full', dotSize, color)}
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  )
}
