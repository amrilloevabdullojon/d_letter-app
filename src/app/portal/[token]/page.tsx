import { prisma } from '@/lib/prisma'
import { STATUS_LABELS, formatDate, isDoneStatus } from '@/lib/utils'

type PageProps = {
  params: { token: string }
}

export default async function ApplicantPortalPage({ params }: PageProps) {
  const letter = await prisma.letter.findFirst({
    where: {
      applicantAccessToken: params.token,
    },
    include: {
      comments: {
        include: {
          author: {
            select: { name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
      owner: {
        select: { name: true, email: true },
      },
    },
  })

  if (!letter) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white px-4">
        <div className="max-w-lg text-center space-y-3">
          <h1 className="text-2xl font-semibold">Ссылка не найдена</h1>
          <p className="text-gray-400">
            Проверьте ссылку или запросите новую у исполнителя.
          </p>
        </div>
      </div>
    )
  }

  if (letter.applicantAccessTokenExpiresAt && letter.applicantAccessTokenExpiresAt < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white px-4">
        <div className="max-w-lg text-center space-y-3">
          <h1 className="text-2xl font-semibold">Ссылка истекла</h1>
          <p className="text-gray-400">
            Запросите новую ссылку у исполнителя.
          </p>
        </div>
      </div>
    )
  }

  const isDone = isDoneStatus(letter.status)

  return (
    <div className="min-h-screen bg-gray-900 px-4 py-10 text-white">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-6 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-gray-400">Номер обращения</p>
              <p className="text-xl font-semibold text-emerald-400">№{letter.number}</p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-sm ${
                isDone ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-600/50 text-slate-200'
              }`}
            >
              {STATUS_LABELS[letter.status]}
            </span>
          </div>
          <div className="mt-4 space-y-2 text-sm text-gray-300">
            <div>
              <span className="text-gray-500">Организация:</span> {letter.org}
            </div>
            <div>
              <span className="text-gray-500">Дата письма:</span> {formatDate(letter.date)}
            </div>
            <div>
              <span className="text-gray-500">Срок исполнения:</span> {formatDate(letter.deadlineDate)}
            </div>
            <div>
              <span className="text-gray-500">Ответственный:</span>{' '}
              {letter.owner?.name || letter.owner?.email || 'не назначен'}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-6 shadow-xl">
          <h2 className="text-lg font-semibold mb-4">Комментарии</h2>
          {letter.comments.length === 0 ? (
            <p className="text-sm text-gray-400">Комментариев пока нет.</p>
          ) : (
            <div className="space-y-4">
              {letter.comments.map((comment) => (
                <div key={comment.id} className="rounded-xl border border-gray-800/80 bg-gray-900/50 p-4">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className="font-medium text-gray-200">
                      {comment.author?.name || comment.author?.email || 'Сотрудник'}
                    </span>
                    <span>{new Date(comment.createdAt).toLocaleString('ru-RU')}</span>
                  </div>
                  <p className="mt-2 text-sm text-gray-200 whitespace-pre-wrap">{comment.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
