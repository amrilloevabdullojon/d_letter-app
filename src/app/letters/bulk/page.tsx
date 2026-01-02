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
      <div className="min-h-screen flex items-center justify-center bg-transparent">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen app-shell">
      <Header />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <Link
          href="/letters"
          className="inline-flex items-center gap-2 text-slate-300 hover:text-white mb-6 transition"
        >
          <ArrowLeft className="w-5 h-5" />
          Назад к письмам
        </Link>

        <BulkCreateLetters />
      </main>
    </div>
  )
}
