'use client'

import { ReactNode } from 'react'
import { useSession } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { useAuthRedirect } from '@/hooks/useAuthRedirect'
import { EnvelopeLoader } from '@/components/ui/EnvelopeLoader'

const PUBLIC_PREFIXES = ['/login', '/portal', '/u']
const PUBLIC_PATHS = ['/request']

export function AuthGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const { status } = useSession()

  const isPublic =
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix)) || PUBLIC_PATHS.includes(pathname)
  useAuthRedirect(isPublic ? 'authenticated' : status)

  if (isPublic) return <>{children}</>

  if (status === 'loading') {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center">
        <EnvelopeLoader />
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return null
  }

  return <>{children}</>
}
