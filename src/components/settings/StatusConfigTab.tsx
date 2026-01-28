'use client'

import { useState, useEffect, useCallback, memo } from 'react'
import { Loader2, GripVertical, Check, X, Eye, EyeOff, RefreshCw, AlertCircle } from 'lucide-react'
import { useToast } from '@/components/Toast'

interface StatusConfig {
  id: string
  status: string
  label: string
  color: string
  order: number
  isActive: boolean
}

// Компонент выбора цвета
const ColorPicker = memo(function ColorPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (color: string) => void
}) {
  const presetColors = [
    '#6B7280', // gray
    '#EF4444', // red
    '#F59E0B', // amber
    '#22C55E', // green
    '#14B8A6', // teal
    '#3B82F6', // blue
    '#8B5CF6', // violet
    '#EC4899', // pink
    '#A855F7', // purple
  ]

  return (
    <div className="flex flex-wrap gap-2">
      {presetColors.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          className={`h-7 w-7 rounded-lg border-2 transition ${
            value === color ? 'scale-110 border-white' : 'border-transparent hover:scale-105'
          }`}
          style={{ backgroundColor: color }}
          title={color}
        />
      ))}
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 w-7 cursor-pointer rounded-lg border-0 bg-transparent"
        title="Выбрать свой цвет"
      />
    </div>
  )
})

// Строка статуса с inline редактированием
const StatusRow = memo(function StatusRow({
  config,
  onUpdate,
  onToggleActive,
  isDragging,
}: {
  config: StatusConfig
  onUpdate: (status: string, field: string, value: string | number | boolean) => Promise<void>
  onToggleActive: (status: string) => Promise<void>
  isDragging?: boolean
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editLabel, setEditLabel] = useState(config.label)
  const [editColor, setEditColor] = useState(config.color)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!editLabel.trim()) return
    setSaving(true)
    try {
      if (editLabel !== config.label) {
        await onUpdate(config.status, 'label', editLabel)
      }
      if (editColor !== config.color) {
        await onUpdate(config.status, 'color', editColor)
      }
      setIsEditing(false)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setEditLabel(config.label)
    setEditColor(config.color)
    setIsEditing(false)
  }

  return (
    <div
      className={`group flex items-center gap-4 rounded-xl border border-slate-700/50 bg-slate-800/40 p-4 transition ${
        isDragging ? 'scale-105 opacity-50' : ''
      } ${!config.isActive ? 'opacity-50' : ''}`}
    >
      {/* Drag Handle */}
      <div className="cursor-grab text-slate-500 hover:text-slate-300">
        <GripVertical className="h-5 w-5" />
      </div>

      {/* Color Badge */}
      <div
        className="h-8 w-8 shrink-0 rounded-lg shadow-lg"
        style={{ backgroundColor: config.color }}
      />

      {/* Content */}
      <div className="min-w-0 flex-1">
        {isEditing ? (
          <div className="space-y-3">
            <input
              type="text"
              value={editLabel}
              onChange={(e) => setEditLabel(e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-700/50 px-3 py-2 text-sm text-white focus:border-teal-500 focus:outline-none"
              placeholder="Название статуса"
              autoFocus
            />
            <ColorPicker value={editColor} onChange={setEditColor} />
            <div className="flex items-center gap-2">
              <button
                onClick={handleSave}
                disabled={saving || !editLabel.trim()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-teal-500 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-teal-400 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Сохранить
              </button>
              <button
                onClick={handleCancel}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-slate-500 disabled:opacity-50"
              >
                <X className="h-4 w-4" />
                Отмена
              </button>
            </div>
          </div>
        ) : (
          <div
            className="cursor-pointer"
            onClick={() => setIsEditing(true)}
            onKeyDown={(e) => e.key === 'Enter' && setIsEditing(true)}
            role="button"
            tabIndex={0}
          >
            <div className="font-medium text-white">{config.label}</div>
            <div className="text-xs text-slate-500">{config.status}</div>
          </div>
        )}
      </div>

      {/* Actions */}
      {!isEditing && (
        <div className="flex items-center gap-2 opacity-0 transition group-hover:opacity-100">
          <button
            onClick={() => onToggleActive(config.status)}
            className={`rounded-lg p-2 transition ${
              config.isActive
                ? 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                : 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
            }`}
            title={config.isActive ? 'Скрыть статус' : 'Показать статус'}
          >
            {config.isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </button>
        </div>
      )}
    </div>
  )
})

export function StatusConfigTab() {
  const toast = useToast()
  const [configs, setConfigs] = useState<StatusConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDefault, setIsDefault] = useState(false)
  const [initializing, setInitializing] = useState(false)

  // Загрузка конфигураций
  const loadConfigs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/letter-status-config')
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setConfigs(data.configs || [])
      setIsDefault(data.isDefault || false)
    } catch (err) {
      console.error('Failed to load configs:', err)
      setError('Не удалось загрузить настройки статусов')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadConfigs()
  }, [loadConfigs])

  // Инициализация дефолтных настроек
  const initializeDefaults = async () => {
    setInitializing(true)
    try {
      const res = await fetch('/api/letter-status-config', { method: 'POST' })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setConfigs(data.configs || [])
      setIsDefault(false)
      toast.success('Настройки инициализированы')
    } catch (err) {
      console.error('Failed to initialize:', err)
      toast.error('Не удалось инициализировать настройки')
    } finally {
      setInitializing(false)
    }
  }

  // Обновление конфигурации
  const updateConfig = async (status: string, field: string, value: string | number | boolean) => {
    try {
      const res = await fetch(`/api/letter-status-config/${status}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      setConfigs((prev) => prev.map((c) => (c.status === status ? { ...c, [field]: value } : c)))
      toast.success('Настройка обновлена')
    } catch (err) {
      console.error('Failed to update config:', err)
      toast.error('Не удалось обновить настройку')
      throw err
    }
  }

  // Переключение активности
  const toggleActive = async (status: string) => {
    const config = configs.find((c) => c.status === status)
    if (!config) return
    await updateConfig(status, 'isActive', !config.isActive)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-teal-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <AlertCircle className="mb-4 h-12 w-12 text-red-400" />
        <div className="text-lg font-medium text-white">{error}</div>
        <button
          onClick={loadConfigs}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-600"
        >
          <RefreshCw className="h-4 w-4" />
          Повторить
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Статусы писем</h2>
          <p className="text-sm text-slate-400">
            Настройте отображение статусов: названия, цвета и порядок
          </p>
        </div>
        {isDefault && (
          <button
            onClick={initializeDefaults}
            disabled={initializing}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-400 disabled:opacity-50"
          >
            {initializing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Инициализировать настройки
          </button>
        )}
      </div>

      {/* Info Banner */}
      {isDefault && (
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 shrink-0 text-yellow-400" />
            <div>
              <div className="font-medium text-yellow-300">Используются настройки по умолчанию</div>
              <div className="mt-1 text-sm text-yellow-400/80">
                Нажмите &quot;Инициализировать настройки&quot; чтобы сохранить их в базу данных и
                иметь возможность редактирования.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status List */}
      <div className="space-y-3">
        {configs.map((config) => (
          <StatusRow
            key={config.id}
            config={config}
            onUpdate={updateConfig}
            onToggleActive={toggleActive}
          />
        ))}
      </div>

      {/* Help Text */}
      <div className="rounded-xl bg-slate-800/30 p-4 text-sm text-slate-400">
        <p>
          <strong className="text-slate-300">Подсказка:</strong> Нажмите на название статуса для
          редактирования. Скрытые статусы не будут отображаться в выпадающих списках, но письма с
          этими статусами останутся доступными.
        </p>
      </div>
    </div>
  )
}
