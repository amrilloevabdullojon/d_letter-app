import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import { MyProgressPageClient } from './MyProgressPageClient'

export const metadata = {
  title: 'Мой прогресс | DMED',
  description: 'Статистика и история отработанных писем',
}

export default function MyProgressPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
        </div>
      }
    >
      <MyProgressPageClient />
    </Suspense>
  )
}
