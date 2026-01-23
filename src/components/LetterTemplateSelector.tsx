'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { FileText, X, ChevronDown, Search, Globe, Lock, Loader2, Eye, Sparkles } from 'lucide-react'
import { substituteLetterVariables } from '@/lib/letter-template-variables'

// Используем минимальный тип для совместимости с разными источниками данных
type LetterForTemplate = {
  number?: string | null
  org?: string | null
  date?: Date | string | null
  deadlineDate?: Date | string | null
  status?: string
  type?: string | null
  content?: string | null
  zordoc?: string | null
  jiraLink?: string | null
  applicantName?: string | null
  applicantEmail?: string | null
  applicantPhone?: string | null
  contacts?: string | null
  owner?: {
    name?: string | null
    email?: string | null
  } | null
  [key: string]: unknown // Разрешаем дополнительные поля
}

interface LetterTemplate {
  id: string
  name: string
  subject: string | null
  body: string
  signature: string | null
  category: string | null
  variables: string[]
  isPublic: boolean
  usageCount: number
  createdBy: {
    id: string
    name: string | null
    email: string | null
  }
}

interface LetterTemplateSelectorProps {
  onSelect: (content: string) => void
  currentUserId: string
  letter: LetterForTemplate
  field?: 'answer' | 'content'
}

export function LetterTemplateSelector({
  onSelect,
  currentUserId: _currentUserId,
  letter,
  field = 'answer',
}: LetterTemplateSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [templates, setTemplates] = useState<LetterTemplate[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [previewTemplate, setPreviewTemplate] = useState<LetterTemplate | null>(null)
  const [previewContent, setPreviewContent] = useState('')

  const loadTemplates = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedCategory) params.set('category', selectedCategory)

      const res = await fetch(`/api/letters/templates?${params}`)
      const data = await res.json()

      const loadedTemplates = data.templates || []
      setTemplates(loadedTemplates)

      // Extract unique categories
      const cats: string[] = Array.from(
        new Set(
          loadedTemplates
            .map((t: LetterTemplate) => t.category)
            .filter((c: string | null): c is string => !!c)
        )
      )
      setCategories(cats)
    } catch (error) {
      console.error('Failed to load letter templates:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedCategory])

  useEffect(() => {
    if (isOpen) {
      loadTemplates()
    }
  }, [isOpen, loadTemplates])

  const handleSelect = async (template: LetterTemplate) => {
    // Создаём полный текст из шаблона
    const parts: string[] = []

    if (template.subject && field === 'content') {
      parts.push(`Тема: ${template.subject}`)
      parts.push('')
    }

    parts.push(template.body)

    if (template.signature) {
      parts.push('')
      parts.push(template.signature)
    }

    const fullText = parts.join('\n')

    // Заменяем переменные
    const substituted = substituteLetterVariables(fullText, letter)

    // Отправляем в родительский компонент
    onSelect(substituted)

    // Увеличиваем счётчик использований
    try {
      await fetch(`/api/letters/templates/${template.id}/use`, {
        method: 'POST',
      })
    } catch (err) {
      console.error('Failed to increment template usage:', err)
    }

    setIsOpen(false)
  }

  const handlePreview = (template: LetterTemplate) => {
    const parts: string[] = []

    if (template.subject) {
      parts.push(`Тема: ${template.subject}`)
      parts.push('')
    }

    parts.push(template.body)

    if (template.signature) {
      parts.push('')
      parts.push(template.signature)
    }

    const fullText = parts.join('\n')
    const substituted = substituteLetterVariables(fullText, letter)

    setPreviewTemplate(template)
    setPreviewContent(substituted)
  }

  const filteredTemplates = templates.filter((t) => {
    if (search && !t.name.toLowerCase().includes(search.toLowerCase())) {
      return false
    }
    if (selectedCategory && t.category !== selectedCategory) {
      return false
    }
    return true
  })

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-2 rounded-lg bg-gray-700 px-3 py-1.5 text-sm text-white transition hover:bg-gray-600"
        >
          <FileText className="h-4 w-4" />
          Использовать шаблон
          <ChevronDown className={`h-4 w-4 transition ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <>
            {/* Overlay */}
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

            {/* Dropdown */}
            <div className="absolute right-0 top-full z-50 mt-2 flex max-h-[600px] w-[450px] flex-col rounded-lg border border-gray-700 bg-gray-800 shadow-xl">
              {/* Header */}
              <div className="border-b border-gray-700 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-emerald-400" />
                    <h3 className="font-medium text-white">Шаблоны писем</h3>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1 text-gray-400 transition hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Поиск шаблонов..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full rounded border border-gray-600 bg-gray-700 py-1.5 pl-8 pr-3 text-sm text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                {/* Categories */}
                {categories.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    <button
                      onClick={() => setSelectedCategory(null)}
                      className={`rounded px-2 py-0.5 text-xs transition ${
                        !selectedCategory
                          ? 'bg-emerald-500 text-white'
                          : 'bg-gray-700 text-gray-400 hover:text-white'
                      }`}
                    >
                      Все
                    </button>
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`rounded px-2 py-0.5 text-xs transition ${
                          selectedCategory === cat
                            ? 'bg-emerald-500 text-white'
                            : 'bg-gray-700 text-gray-400 hover:text-white'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Templates List */}
              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
                  </div>
                ) : filteredTemplates.length === 0 ? (
                  <div className="py-8 text-center text-sm text-gray-500">
                    {templates.length === 0 ? (
                      <div>
                        <FileText className="mx-auto mb-2 h-12 w-12 text-gray-600" />
                        <p>Нет шаблонов.</p>
                        <Link
                          href="/letters/templates"
                          className="mt-2 inline-block text-emerald-400 hover:text-emerald-300"
                        >
                          Создайте первый шаблон
                        </Link>
                      </div>
                    ) : (
                      'Шаблоны не найдены'
                    )}
                  </div>
                ) : (
                  <div className="divide-y divide-gray-700">
                    {filteredTemplates.map((template) => (
                      <div key={template.id} className="group p-3 transition hover:bg-gray-700/50">
                        <div className="flex items-start gap-2">
                          <button
                            onClick={() => handleSelect(template)}
                            className="flex-1 text-left"
                          >
                            <div className="mb-1 flex items-center gap-2">
                              <span className="text-sm font-medium text-white">
                                {template.name}
                              </span>
                              {template.isPublic ? (
                                <Globe className="h-3 w-3 text-emerald-500" />
                              ) : (
                                <Lock className="h-3 w-3 text-gray-500" />
                              )}
                            </div>

                            {template.category && (
                              <span className="mb-1 inline-block rounded bg-gray-700 px-1.5 py-0.5 text-xs text-emerald-400">
                                {template.category}
                              </span>
                            )}

                            {template.subject && (
                              <p className="mb-1 text-xs text-gray-400">
                                <span className="text-gray-500">Тема:</span> {template.subject}
                              </p>
                            )}

                            <p className="line-clamp-2 text-xs text-gray-400">{template.body}</p>

                            {template.variables.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {template.variables.slice(0, 3).map((v) => (
                                  <code
                                    key={v}
                                    className="rounded bg-gray-900 px-1 py-0.5 text-xs text-blue-400"
                                  >
                                    {'{{'}
                                    {v}
                                    {'}}'}
                                  </code>
                                ))}
                                {template.variables.length > 3 && (
                                  <span className="text-xs text-gray-500">
                                    +{template.variables.length - 3}
                                  </span>
                                )}
                              </div>
                            )}

                            <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                              <span>{template.usageCount} исп.</span>
                              <span>•</span>
                              <span>{template.createdBy.name || template.createdBy.email}</span>
                            </div>
                          </button>

                          <button
                            onClick={() => handlePreview(template)}
                            className="p-1.5 text-gray-500 opacity-0 transition hover:text-emerald-400 group-hover:opacity-100"
                            title="Предпросмотр"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-gray-700 p-3">
                <Link
                  href="/letters/templates"
                  target="_blank"
                  className="block text-center text-sm text-emerald-400 transition hover:text-emerald-300"
                >
                  Управление шаблонами →
                </Link>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Preview Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-70 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-gray-700 bg-gray-800">
            <div className="p-6">
              <div className="mb-6 flex items-start justify-between">
                <div>
                  <h2 className="mb-1 text-2xl font-bold text-white">{previewTemplate.name}</h2>
                  {previewTemplate.category && (
                    <span className="inline-block rounded bg-gray-700 px-2 py-1 text-xs text-emerald-400">
                      {previewTemplate.category}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => {
                    setPreviewTemplate(null)
                    setPreviewContent('')
                  }}
                  className="text-gray-400 transition hover:text-white"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="mb-4 rounded-lg border border-gray-700 bg-gray-900 p-6">
                <div className="whitespace-pre-wrap font-mono text-sm text-gray-300">
                  {previewContent}
                </div>
              </div>

              {previewTemplate.variables.length > 0 && (
                <div className="mb-4 rounded-lg border border-blue-700 bg-blue-900/20 p-4">
                  <p className="mb-2 text-sm font-medium text-blue-300">Используемые переменные:</p>
                  <div className="flex flex-wrap gap-2">
                    {previewTemplate.variables.map((v) => (
                      <code key={v} className="rounded bg-gray-900 px-2 py-1 text-xs text-blue-400">
                        {'{{'}
                        {v}
                        {'}}'}
                      </code>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    handleSelect(previewTemplate)
                    setPreviewTemplate(null)
                    setPreviewContent('')
                  }}
                  className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-white transition hover:bg-emerald-700"
                >
                  Использовать шаблон
                </button>
                <button
                  onClick={() => {
                    setPreviewTemplate(null)
                    setPreviewContent('')
                  }}
                  className="rounded-lg border border-gray-600 px-4 py-2 text-white transition hover:bg-gray-700"
                >
                  Закрыть
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
