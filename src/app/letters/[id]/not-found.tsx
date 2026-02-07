import { FileX, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function LetterNotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-8">
      <div className="max-w-sm text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-800/80">
          <FileX className="h-8 w-8 text-slate-400" />
        </div>
        <h2 className="mb-2 text-lg font-bold text-white">Письмо не найдено</h2>
        <p className="mb-6 text-sm text-slate-400">Письмо не существует или было удалено.</p>
        <Link
          href="/letters"
          className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm text-white transition hover:bg-teal-700"
        >
          <ArrowLeft className="h-4 w-4" />К списку писем
        </Link>
      </div>
    </div>
  )
}
