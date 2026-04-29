import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Bot, MessageSquare, FileText, CheckCircle2 } from 'lucide-react'
import { useToast } from '@/components/Toast'

export function AiSettingsTab() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const toast = useToast()

  const [settings, setSettings] = useState({
    aiEnabled: true,
    aiChatEnabled: true,
    aiParsingEnabled: true,
  })

  useEffect(() => {
    fetch('/api/admin/settings/ai')
      .then((res) => res.json())
      .then((data) => {
        if (data && !data.error) {
          setSettings({
            aiEnabled: data.aiEnabled ?? true,
            aiChatEnabled: data.aiChatEnabled ?? true,
            aiParsingEnabled: data.aiParsingEnabled ?? true,
          })
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  const handleToggle = (key: keyof typeof settings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/settings/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (!res.ok) throw new Error('Failed to save')
      toast.success('Настройки ИИ успешно сохранены')
    } catch (error) {
      toast.error('Ошибка при сохранении настроек ИИ')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-slate-400">Загрузка настроек...</div>
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div>
        <h2 className="flex items-center gap-2 text-lg font-medium text-white">
          <Bot className="h-5 w-5 text-teal-400" />
          Управление Искусственным Интеллектом
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Здесь вы можете точечно включать и отключать функции ИИ в системе.
        </p>
      </div>

      <div className="grid gap-4">
        {/* Global AI Switch */}
        <div className="flex items-start justify-between rounded-2xl border border-slate-700/50 bg-slate-800/30 p-5">
          <div className="flex gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-500/10 text-teal-400">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-white">Включить ИИ (Глобально)</h3>
              <p className="mt-1 text-sm text-slate-400">
                Полностью включает или отключает все функции ИИ в системе.
              </p>
            </div>
          </div>
          <button
            onClick={() => handleToggle('aiEnabled')}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${
              settings.aiEnabled ? 'bg-teal-500' : 'bg-slate-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.aiEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* AI Chat Switch */}
        <div
          className={`flex items-start justify-between rounded-2xl border border-slate-700/50 bg-slate-800/30 p-5 ${!settings.aiEnabled ? 'pointer-events-none opacity-50' : ''}`}
        >
          <div className="flex gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-white">Умный RAG-чат (Grok-тян)</h3>
              <p className="mt-1 text-sm text-slate-400">
                Виджет ИИ-ассистента, который отвечает на вопросы по базе писем.
              </p>
            </div>
          </div>
          <button
            onClick={() => handleToggle('aiChatEnabled')}
            disabled={!settings.aiEnabled}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
              settings.aiChatEnabled && settings.aiEnabled ? 'bg-teal-500' : 'bg-slate-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.aiChatEnabled && settings.aiEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* AI Parsing Switch */}
        <div
          className={`flex items-start justify-between rounded-2xl border border-slate-700/50 bg-slate-800/30 p-5 ${!settings.aiEnabled ? 'pointer-events-none opacity-50' : ''}`}
        >
          <div className="flex gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-white">Умный парсинг писем</h3>
              <p className="mt-1 text-sm text-slate-400">
                Автоматическое извлечение данных (номер, организация) из загружаемых файлов.
              </p>
            </div>
          </div>
          <button
            onClick={() => handleToggle('aiParsingEnabled')}
            disabled={!settings.aiEnabled}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
              settings.aiParsingEnabled && settings.aiEnabled ? 'bg-teal-500' : 'bg-slate-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.aiParsingEnabled && settings.aiEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-teal-500 px-6 py-2.5 text-sm font-medium text-white transition-all hover:bg-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50"
        >
          {saving ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <CheckCircle2 className="h-5 w-5" />
          )}
          Сохранить настройки
        </button>
      </div>
    </motion.div>
  )
}
