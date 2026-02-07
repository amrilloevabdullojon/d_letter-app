import { FileQuestion, Home, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-transparent p-8">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-slate-800/80">
          <FileQuestion className="h-10 w-10 text-slate-400" />
        </div>
        <h1 className="mb-2 text-6xl font-bold text-white">404</h1>
        <h2 className="mb-2 text-xl font-semibold text-slate-300">Страница не найдена</h2>
        <p className="mb-8 text-slate-400">
          Запрашиваемая страница не существует или была перемещена.
        </p>
        <div className="flex justify-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-teal-700"
          >
            <Home className="h-4 w-4" />
            На главную
          </Link>
          <Link
            href="/letters"
            className="flex items-center gap-2 rounded-lg bg-slate-700 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-600"
          >
            <ArrowLeft className="h-4 w-4" />К письмам
          </Link>
        </div>
      </div>
    </div>
  )
}
