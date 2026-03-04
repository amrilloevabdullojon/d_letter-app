'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { FileText, Plus, Trash2, Edit, Eye, Globe, Lock, TrendingUp, Search, X } from 'lucide-react'
import { useLetterTemplates } from '@/hooks/useLetterTemplates'

type LetterTemplate = {
  id: string
  name: string
  subject: string | null
  body: string
  signature: string | null
  category: string | null
  variables: string[]
  isPublic: boolean
  usageCount: number
  createdById: string
  createdBy: {
    id: string
    name: string | null
    email: string | null
  }
  createdAt: string
  updatedAt: string
}

export default function LetterTemplatesPage() {
  const { data: session, status } = useSession()
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<LetterTemplate | null>(null)
  const [showPreviewModal, setShowPreviewModal] = useState(false)

  const { templates, loading, error, refetch } = useLetterTemplates()

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
          <p className="text-slate-600">Загрузка...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    redirect('/auth/signin')
  }

  const filteredTemplates = templates.filter((t) => {
    const query = searchQuery.toLowerCase()
    return (
      t.name.toLowerCase().includes(query) ||
      t.body.toLowerCase().includes(query) ||
      (t.category && t.category.toLowerCase().includes(query)) ||
      (t.subject && t.subject.toLowerCase().includes(query))
    )
  })

  const handleCreateOrEdit = () => {
    setShowCreateModal(true)
  }

  const handlePreview = (template: LetterTemplate) => {
    setSelectedTemplate(template)
    setShowPreviewModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить шаблон?')) return

    try {
      const res = await fetch(`/api/letters/templates?id=${id}`, {
        method: 'DELETE',
        headers: {
          'x-csrf-token':
            document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || '',
        },
      })

      if (res.ok) {
        refetch()
      } else {
        const data = await res.json()
        alert(data.error || 'Ошибка удаления')
      }
    } catch (err) {
      console.error(err)
      alert('Ошибка удаления шаблона')
    }
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-3 text-3xl font-bold text-gray-900">
              <FileText className="h-8 w-8 text-blue-600" />
              Шаблоны писем
            </h1>
            <p className="mt-2 text-slate-600">
              Создавайте шаблоны ответов с автоматической подстановкой данных
            </p>
          </div>
          <button
            onClick={() => {
              setSelectedTemplate(null)
              handleCreateOrEdit()
            }}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
          >
            <Plus className="h-5 w-5" />
            Создать шаблон
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по названию, содержанию, категории..."
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-10 focus:border-transparent focus:ring-2 focus:ring-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Loading/Error States */}
      {loading && (
        <div className="py-12 text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
          <p className="text-slate-600">Загрузка шаблонов...</p>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          Ошибка загрузки шаблонов: {error}
        </div>
      )}

      {/* Templates Grid */}
      {!loading && !error && (
        <>
          {filteredTemplates.length === 0 ? (
            <div className="rounded-lg bg-gray-50 py-12 text-center">
              <FileText className="mx-auto mb-4 h-16 w-16 text-slate-400" />
              <p className="mb-2 text-lg text-slate-600">
                {searchQuery ? 'Шаблоны не найдены' : 'Нет шаблонов'}
              </p>
              <p className="mb-4 text-slate-500">
                {searchQuery
                  ? 'Попробуйте изменить запрос'
                  : 'Создайте первый шаблон для быстрых ответов'}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => {
                    setSelectedTemplate(null)
                    handleCreateOrEdit()
                  }}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                >
                  <Plus className="h-5 w-5" />
                  Создать шаблон
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  currentUserId={session.user.id}
                  onEdit={() => {
                    setSelectedTemplate(template)
                    handleCreateOrEdit()
                  }}
                  onPreview={() => handlePreview(template)}
                  onDelete={() => handleDelete(template.id)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <TemplateEditorModal
          template={selectedTemplate}
          onClose={() => {
            setShowCreateModal(false)
            setSelectedTemplate(null)
          }}
          onSuccess={() => {
            setShowCreateModal(false)
            setSelectedTemplate(null)
            refetch()
          }}
        />
      )}

      {/* Preview Modal */}
      {showPreviewModal && selectedTemplate && (
        <TemplatePreviewModal
          template={selectedTemplate}
          onClose={() => {
            setShowPreviewModal(false)
            setSelectedTemplate(null)
          }}
        />
      )}
    </div>
  )
}

function TemplateCard({
  template,
  currentUserId,
  onEdit,
  onPreview,
  onDelete,
}: {
  template: LetterTemplate
  currentUserId: string
  onEdit: () => void
  onPreview: () => void
  onDelete: () => void
}) {
  const isOwner = template.createdById === currentUserId

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 transition-shadow hover:shadow-lg">
      {/* Header */}
      <div className="mb-3 flex items-start justify-between">
        <div className="flex-1">
          <h3 className="mb-1 text-lg font-semibold text-gray-900">{template.name}</h3>
          {template.category && (
            <span className="inline-block rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
              {template.category}
            </span>
          )}
        </div>
        <div className="ml-2 flex items-center gap-2">
          {template.isPublic ? (
            <span title="Публичный">
              <Globe className="h-4 w-4 text-green-600" />
            </span>
          ) : (
            <span title="Личный">
              <Lock className="h-4 w-4 text-slate-400" />
            </span>
          )}
        </div>
      </div>

      {/* Subject */}
      {template.subject && (
        <p className="mb-2 text-sm text-slate-600">
          <span className="font-medium">Тема:</span> {template.subject}
        </p>
      )}

      {/* Body Preview */}
      <p className="mb-3 line-clamp-3 text-sm text-slate-600">{template.body}</p>

      {/* Stats */}
      <div className="mb-3 flex items-center gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-1">
          <TrendingUp className="h-4 w-4" />
          <span>{template.usageCount} исп.</span>
        </div>
        {template.variables.length > 0 && (
          <div className="flex items-center gap-1">
            <FileText className="h-4 w-4" />
            <span>{template.variables.length} пер.</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 border-t border-white/10 pt-3">
        <button
          onClick={onPreview}
          className="flex flex-1 items-center justify-center gap-1 rounded px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
        >
          <Eye className="h-4 w-4" />
          Просмотр
        </button>
        {isOwner && (
          <>
            <button
              onClick={onEdit}
              className="flex flex-1 items-center justify-center gap-1 rounded px-3 py-2 text-sm text-blue-700 transition-colors hover:bg-blue-50"
            >
              <Edit className="h-4 w-4" />
              Изменить
            </button>
            <button
              onClick={onDelete}
              className="flex items-center justify-center gap-1 rounded px-3 py-2 text-sm text-red-700 transition-colors hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {/* Creator */}
      <div className="mt-3 border-t border-white/10 pt-3 text-xs text-slate-500">
        Автор: {template.createdBy.name || template.createdBy.email}
      </div>
    </div>
  )
}

function TemplateEditorModal({
  template,
  onClose,
  onSuccess,
}: {
  template: LetterTemplate | null
  onClose: () => void
  onSuccess: () => void
}) {
  const [formData, setFormData] = useState({
    name: template?.name || '',
    subject: template?.subject || '',
    body: template?.body || '',
    signature: template?.signature || '',
    category: template?.category || '',
    isPublic: template?.isPublic || false,
  })
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const url = template ? `/api/letters/templates?id=${template.id}` : '/api/letters/templates'
      const method = template ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token':
            document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || '',
        },
        body: JSON.stringify({
          ...formData,
          subject: formData.subject || null,
          signature: formData.signature || null,
          category: formData.category || null,
        }),
      })

      if (res.ok) {
        onSuccess()
      } else {
        const data = await res.json()
        alert(data.error || 'Ошибка сохранения')
      }
    } catch (err) {
      console.error(err)
      alert('Ошибка сохранения шаблона')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white">
        <form onSubmit={handleSubmit} className="p-6">
          <h2 className="mb-6 text-2xl font-bold">
            {template ? 'Редактировать шаблон' : 'Создать шаблон'}
          </h2>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Название *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500"
                placeholder="Ответ на запрос о регистрации"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Категория</label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500"
                placeholder="Регистрация"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Тема письма</label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500"
                placeholder="Ответ на письмо {{'{{'}}letter.number{{'}}'}}"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Тело письма *</label>
              <textarea
                required
                value={formData.body}
                onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                rows={10}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm focus:ring-2 focus:ring-blue-500"
                placeholder="Уважаемый(-ая) {{'{{'}}applicant.name{{'}}'}},&#10;&#10;По вашему письму {{'{{'}}letter.number{{'}}'}} от {{'{{'}}letter.date{{'}}'}}..."
              />
              <p className="mt-1 text-xs text-slate-500">
                Используйте переменные: {'{{letter.number}}'}, {'{{applicant.name}}'},{' '}
                {'{{owner.name}}'} и др.
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Подпись</label>
              <textarea
                value={formData.signature}
                onChange={(e) => setFormData({ ...formData, signature: e.target.value })}
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500"
                placeholder="С уважением,&#10;{{'{{'}}owner.name{{'}}'}}"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isPublic"
                checked={formData.isPublic}
                onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                className="h-4 w-4 rounded text-blue-600 focus:ring-2 focus:ring-blue-500"
              />
              <label htmlFor="isPublic" className="text-sm text-gray-700">
                Публичный шаблон (доступен всем пользователям)
              </label>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3 border-t border-gray-200 pt-4">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:bg-gray-400"
            >
              {submitting ? 'Сохранение...' : template ? 'Сохранить' : 'Создать'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 transition-colors hover:bg-gray-50"
            >
              Отмена
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function TemplatePreviewModal({
  template,
  onClose,
}: {
  template: LetterTemplate
  onClose: () => void
}) {
  const [preview, setPreview] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useState(() => {
    // Import preview function dynamically
    import('@/lib/letter-template-variables').then(({ previewTemplate }) => {
      const fullText = [
        template.subject && `Тема: ${template.subject}`,
        '',
        template.body,
        '',
        template.signature,
      ]
        .filter(Boolean)
        .join('\n')

      setPreview(previewTemplate(fullText))
      setLoading(false)
    })
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white">
        <div className="p-6">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold">Предпросмотр: {template.name}</h2>
            <button
              onClick={onClose}
              className="text-slate-400 transition-colors hover:text-slate-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {loading ? (
            <div className="py-8 text-center">
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
              <p className="text-slate-600">Генерация предпросмотра...</p>
            </div>
          ) : (
            <div className="whitespace-pre-wrap rounded-lg border border-gray-200 bg-gray-50 p-6 font-mono text-sm">
              {preview}
            </div>
          )}

          {template.variables.length > 0 && (
            <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
              <p className="mb-2 text-sm font-medium text-blue-900">Используемые переменные:</p>
              <div className="flex flex-wrap gap-2">
                {template.variables.map((v) => (
                  <code key={v} className="rounded bg-white px-2 py-1 text-xs text-blue-700">
                    {'{{'}
                    {v}
                    {'}}'}
                  </code>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 border-t border-gray-200 pt-4">
            <button
              onClick={onClose}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 transition-colors hover:bg-gray-50"
            >
              Закрыть
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
