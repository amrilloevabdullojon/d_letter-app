'use client'

import { useState } from 'react'
import { Edit2, Save, X, Loader2 } from 'lucide-react'

interface EditableFieldProps {
  label: string
  value: string | null
  field: string
  onSave: (field: string, value: string) => Promise<void>
  type?: 'text' | 'textarea' | 'url'
  placeholder?: string
  rows?: number
}

export function EditableField({
  label,
  value,
  field,
  onSave,
  type = 'text',
  placeholder = '',
  rows = 3,
}: EditableFieldProps) {
  const [editing, setEditing] = useState(false)
  const [newValue, setNewValue] = useState(value || '')
  const [saving, setSaving] = useState(false)

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
        <h3 className="text-sm font-medium text-gray-400 mb-2">{label}</h3>
        {type === 'textarea' ? (
          <textarea
            rows={rows}
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            placeholder={placeholder}
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500 resize-none"
          />
        ) : (
          <input
            type={type}
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            placeholder={placeholder}
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500"
          />
        )}
        <div className="flex justify-end gap-2 mt-2">
          <button
            onClick={handleCancel}
            disabled={saving}
            className="p-2 text-gray-400 hover:text-white transition disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Сохранить
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-4 group">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-400 mb-2">{label}</h3>
        <button
          onClick={() => setEditing(true)}
          className="p-1 text-gray-600 hover:text-gray-400 opacity-0 group-hover:opacity-100 transition"
        >
          <Edit2 className="w-4 h-4" />
        </button>
      </div>
      {value ? (
        type === 'url' ? (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 transition break-all"
          >
            {value}
          </a>
        ) : (
          <p className="text-white whitespace-pre-wrap">{value}</p>
        )
      ) : (
        <p className="text-gray-500 italic">Не указано</p>
      )}
    </div>
  )
}
