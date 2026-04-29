import { useState, useEffect } from 'react'
import { useToast } from '@/components/Toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Link as LinkIcon, Database } from 'lucide-react'

export function JiraTab() {
  const [settings, setSettings] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const toast = useToast()

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings/jira')
      if (res.ok) {
        const data = await res.json()
        setSettings(data)
      } else {
        toast.error('Ошибка загрузки настроек Jira')
      }
    } catch (err) {
      toast.error('Ошибка соединения')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/admin/settings/jira', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })

      if (res.ok) {
        toast.success('Настройки Jira сохранены')
        // Очищаем токен из стейта после сохранения
        setSettings({ ...settings, jiraToken: '', hasToken: true })
      } else {
        toast.error('Ошибка сохранения настроек')
      }
    } catch (err) {
      toast.error('Ошибка соединения')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="mb-6">
        <h2 className="flex items-center gap-2 text-xl font-semibold text-white">
          <Database className="h-5 w-5 text-teal-400" />
          Интеграция с Jira
        </h2>
        <p className="text-sm text-slate-400">
          Настройте параметры подключения к Atlassian Jira для автоматического создания задач и
          отслеживания их статусов.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">Jira Host URL</label>
          <Input
            value={settings?.jiraHost || ''}
            onChange={(e) => setSettings({ ...settings, jiraHost: e.target.value })}
            placeholder="https://your-domain.atlassian.net"
            required
            className="border-slate-700 bg-slate-800/50"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">Jira Email</label>
          <Input
            type="email"
            value={settings?.jiraEmail || ''}
            onChange={(e) => setSettings({ ...settings, jiraEmail: e.target.value })}
            placeholder="admin@example.com"
            required
            className="border-slate-700 bg-slate-800/50"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">
            Jira API Token
            {settings?.hasToken && <span className="ml-2 text-xs text-teal-400">(Установлен)</span>}
          </label>
          <Input
            type="password"
            value={settings?.jiraToken || ''}
            onChange={(e) => setSettings({ ...settings, jiraToken: e.target.value })}
            placeholder={
              settings?.hasToken ? 'Введите новый токен для обновления' : 'Введите API токен'
            }
            required={!settings?.hasToken}
            className="border-slate-700 bg-slate-800/50"
          />
          <p className="text-xs text-slate-500">
            Сгенерируйте токен в настройках безопасности вашего Atlassian аккаунта.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">Ключ проекта (Project Key)</label>
          <Input
            value={settings?.jiraProjectKey || ''}
            onChange={(e) => setSettings({ ...settings, jiraProjectKey: e.target.value })}
            placeholder="MAIL"
            required
            className="border-slate-700 bg-slate-800/50"
          />
        </div>

        <div className="pt-4">
          <Button type="submit" disabled={saving} className="bg-teal-600 hover:bg-teal-500">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Сохранить настройки
          </Button>
        </div>
      </form>
    </div>
  )
}
