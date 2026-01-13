'use client'

import { SessionProvider } from 'next-auth/react'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { ReactNode, useEffect } from 'react'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ToastWrapper } from '@/components/Toast'
import { TRPCProvider } from '@/lib/trpc'
import { installCsrfFetch } from '@/lib/csrf-client'
import { useLocalStorage } from '@/hooks/useLocalStorage'

installCsrfFetch()

export function Providers({ children }: { children: ReactNode }) {
  const [newYearVibe] = useLocalStorage<boolean>('new-year-vibe', false)
  const [personalization] = useLocalStorage<{ backgroundAnimations?: boolean }>(
    'personalization-settings',
    { backgroundAnimations: true }
  )
  const backgroundAnimations = personalization?.backgroundAnimations ?? true

  useEffect(() => {
    const root = document.documentElement
    if (newYearVibe) {
      root.classList.add('new-year')
    } else {
      root.classList.remove('new-year')
    }
  }, [newYearVibe])

  useEffect(() => {
    const root = document.documentElement
    if (!backgroundAnimations) {
      root.classList.add('no-bg-animations')
    } else {
      root.classList.remove('no-bg-animations')
    }
  }, [backgroundAnimations])

  return (
    <TRPCProvider>
      <SessionProvider>
        <ThemeProvider>
          <ErrorBoundary>
            <ToastWrapper>{children}</ToastWrapper>
          </ErrorBoundary>
        </ThemeProvider>
      </SessionProvider>
    </TRPCProvider>
  )
}
