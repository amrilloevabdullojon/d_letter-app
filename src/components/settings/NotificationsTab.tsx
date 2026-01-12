'use client'

import { memo } from 'react'
import { Bell, Mail, Volume2, Rss } from 'lucide-react'
import { SettingsToggle } from './SettingsToggle'
import { useLocalStorage } from '@/hooks/useLocalStorage'

interface NotificationSettings {
  emailNotifications: boolean
  emailDigest: 'instant' | 'daily' | 'weekly' | 'never'
  soundNotifications: boolean
  pushNotifications: boolean
  notifyOnNewLetter: boolean
  notifyOnStatusChange: boolean
  notifyOnComment: boolean
  notifyOnAssignment: boolean
}

export const NotificationsTab = memo(function NotificationsTab() {
  const [settings, setSettings] = useLocalStorage<NotificationSettings>('notification-settings', {
    emailNotifications: true,
    emailDigest: 'instant',
    soundNotifications: true,
    pushNotifications: false,
    notifyOnNewLetter: true,
    notifyOnStatusChange: true,
    notifyOnComment: true,
    notifyOnAssignment: true,
  })

  const updateSetting = <K extends keyof NotificationSettings>(
    key: K,
    value: NotificationSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="space-y-6">
      {/* Email Notifications Section */}
      <div className="panel panel-glass rounded-2xl p-6">
        <div className="mb-6 flex items-center gap-3 border-b border-white/10 pb-4">
          <div className="rounded-full bg-blue-500/10 p-2 text-blue-300">
            <Mail className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Email-уведомления</h3>
            <p className="text-xs text-gray-400">
              Получайте уведомления о важных событиях на вашу почту.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <SettingsToggle
            label="Email-уведомления"
            description="Получать уведомления на email."
            icon={<Mail className="h-4 w-4" />}
            enabled={settings.emailNotifications}
            onToggle={(enabled) => updateSetting('emailNotifications', enabled)}
          />

          {settings.emailNotifications && (
            <div className="ml-11 space-y-3 border-l-2 border-white/10 pl-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-white">
                  Частота отправки
                </label>
                <select
                  value={settings.emailDigest}
                  onChange={(e) =>
                    updateSetting(
                      'emailDigest',
                      e.target.value as NotificationSettings['emailDigest']
                    )
                  }
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white transition focus:border-emerald-400/50 focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
                >
                  <option value="instant">Мгновенно</option>
                  <option value="daily">Ежедневная сводка</option>
                  <option value="weekly">Еженедельная сводка</option>
                  <option value="never">Никогда</option>
                </select>
                <p className="mt-1 text-xs text-gray-400">
                  {settings.emailDigest === 'instant' &&
                    'Уведомления отправляются сразу после события'}
                  {settings.emailDigest === 'daily' && 'Все уведомления за день в одном письме'}
                  {settings.emailDigest === 'weekly' && 'Все уведомления за неделю в одном письме'}
                  {settings.emailDigest === 'never' && 'Email-уведомления отключены'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* System Notifications Section */}
      <div className="panel panel-glass rounded-2xl p-6">
        <div className="mb-6 flex items-center gap-3 border-b border-white/10 pb-4">
          <div className="rounded-full bg-purple-500/10 p-2 text-purple-300">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Системные уведомления</h3>
            <p className="text-xs text-gray-400">Настройки звука и браузерных уведомлений.</p>
          </div>
        </div>

        <div className="space-y-4">
          <SettingsToggle
            label="Звуковые уведомления"
            description="Воспроизводить звук при новых уведомлениях."
            icon={<Volume2 className="h-4 w-4" />}
            enabled={settings.soundNotifications}
            onToggle={(enabled) => updateSetting('soundNotifications', enabled)}
          />

          <SettingsToggle
            label="Push-уведомления"
            description="Получать уведомления в браузере даже когда вкладка неактивна."
            icon={<Bell className="h-4 w-4" />}
            enabled={settings.pushNotifications}
            onToggle={(enabled) => updateSetting('pushNotifications', enabled)}
          />
        </div>
      </div>

      {/* Event Notifications Section */}
      <div className="panel panel-glass rounded-2xl p-6">
        <div className="mb-6 flex items-center gap-3 border-b border-white/10 pb-4">
          <div className="rounded-full bg-teal-500/10 p-2 text-teal-300">
            <Rss className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">События для уведомлений</h3>
            <p className="text-xs text-gray-400">
              Выберите, о каких событиях вы хотите получать уведомления.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <SettingsToggle
            label="Новые письма"
            description="Уведомлять о создании новых писем."
            enabled={settings.notifyOnNewLetter}
            onToggle={(enabled) => updateSetting('notifyOnNewLetter', enabled)}
          />

          <SettingsToggle
            label="Изменение статуса"
            description="Уведомлять об изменении статуса письма."
            enabled={settings.notifyOnStatusChange}
            onToggle={(enabled) => updateSetting('notifyOnStatusChange', enabled)}
          />

          <SettingsToggle
            label="Новые комментарии"
            description="Уведомлять о новых комментариях к письмам."
            enabled={settings.notifyOnComment}
            onToggle={(enabled) => updateSetting('notifyOnComment', enabled)}
          />

          <SettingsToggle
            label="Назначения"
            description="Уведомлять когда вас назначили исполнителем письма."
            enabled={settings.notifyOnAssignment}
            onToggle={(enabled) => updateSetting('notifyOnAssignment', enabled)}
          />
        </div>
      </div>
    </div>
  )
})
