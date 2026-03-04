'use client'

import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Header } from '@/components/Header'
import { BulkCreateLetters } from '@/components/BulkCreateLetters'
import { useAuthRedirect } from '@/hooks/useAuthRedirect'

export default function BulkLettersPage() {
  const { data: session, status } = useSession()
  useAuthRedirect(status)

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-transparent">
        <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="app-shell min-h-screen">
      <Header />

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <Link
          href="/letters"
          className="mb-6 inline-flex items-center gap-2 text-slate-300 transition hover:text-white"
        >
          <ArrowLeft className="h-5 w-5" />
          Назад к письмам
        </Link>

        <BulkCreateLetters />
      </main>
    </div>
  )
}
