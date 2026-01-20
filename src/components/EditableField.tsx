'use client'

import { useEffect, useState } from 'react'
import { Edit2, Save, X, Loader2 } from 'lucide-react'

interface EditableFieldProps {
  label: string
  value: string | null
  field: string
  onSave: (field: string, value: string) => Promise<void>
  type?: 'text' | 'textarea' | 'url'
  placeholder?: string
  rows?: number
  collapsible?: boolean
  maxPreviewChars?: number
}

export function EditableField({
  label,
  value,
  field,
  onSave,
  type = 'text',
  placeholder = '',
  rows = 3,
  collapsible = false,
  maxPreviewChars = 260,
}: EditableFieldProps) {
  const [editing, setEditing] = useState(false)
  const [newValue, setNewValue] = useState(value || '')
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (!editing) {
      setNewValue(value || '')
    }
    setExpanded(false)
  }, [value, field, editing])

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(field, newValue)
      setEditing(false)
    } catch (error) {
      console.error('Save error:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setNewValue(value || '')
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="mb-4">
        <h3 className="mb-2 text-sm font-medium text-gray-400">{label}</h3>
        {type === 'textarea' ? (
          <textarea
            rows={rows}
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            placeholder={placeholder}
            className="w-full resize-none rounded-lg border border-gray-600 bg-gray-700 px-4 py-2 text-white placeholder-gray-400 focus:border-emerald-500 focus:outline-none"
          />
        ) : (
          <input
            type={type}
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            placeholder={placeholder}
            className="w-full rounded-lg border border-gray-600 bg-gray-700 px-4 py-2 text-white placeholder-gray-400 focus:border-emerald-500 focus:outline-none"
          />
        )}
        <div className="mt-2 flex justify-end gap-2">
          <button
            onClick={handleCancel}
            disabled={saving}
            className="p-2 text-gray-400 transition hover:text-white disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-white transition hover:bg-emerald-600 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {'\u0421\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c'}
          </button>
        </div>
      </div>
    )
  }

  const stringValue = value ?? ''
  const hasValue = Boolean(stringValue.trim())
  const canCollapse = collapsible && type === 'textarea' && stringValue.length > maxPreviewChars
  const displayValue =
    canCollapse && !expanded ? `${stringValue.slice(0, maxPreviewChars).trimEnd()}...` : stringValue

  return (
    <div className="group mb-4">
      <div className="flex items-center justify-between">
        <h3 className="mb-2 text-sm font-medium text-gray-400">{label}</h3>
        <button
          onClick={() => setEditing(true)}
          className="p-1 text-gray-600 opacity-0 transition hover:text-gray-400 group-hover:opacity-100"
        >
          <Edit2 className="h-4 w-4" />
        </button>
      </div>
      {hasValue ? (
        type === 'url' ? (
          <a
            href={stringValue}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all text-blue-400 transition hover:text-blue-300"
          >
            {stringValue}
          </a>
        ) : (
          <div>
            <p className="whitespace-pre-wrap text-white">{displayValue}</p>
            {canCollapse && (
              <button
                type="button"
                onClick={() => setExpanded((prev) => !prev)}
                className="mt-2 text-xs text-emerald-300 transition hover:text-emerald-200"
              >
                {expanded
                  ? '\u0421\u043a\u0440\u044b\u0442\u044c'
                  : '\u041f\u043e\u043a\u0430\u0437\u0430\u0442\u044c \u043f\u043e\u043b\u043d\u043e\u0441\u0442\u044c\u044e'}
              </button>
            )}
          </div>
        )
      ) : (
        <p className="italic text-gray-500">
          {'\u041d\u0435\u0442 \u0434\u0430\u043d\u043d\u044b\u0445'}
        </p>
      )}
    </div>
  )
}
