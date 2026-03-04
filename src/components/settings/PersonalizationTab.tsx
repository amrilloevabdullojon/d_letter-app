'use client'

import { memo, useState, useEffect } from 'react'
import {
  Palette,
  Globe,
  Sparkles,
  Monitor,
  Crown,
  Loader2,
  Snowflake,
  Navigation,
  MousePointerClick,
  List,
  PanelTop,
  ScrollText,
} from 'lucide-react'
import { SettingsToggle } from './SettingsToggle'
import { toast } from 'sonner'
import { useUserPreferences } from '@/hooks/useUserPreferences'

interface PersonalizationSettings {
  theme: 'LIGHT' | 'DARK' | 'VIOLET' | 'AUTO'
  language: string
  density: 'COMPACT' | 'COMFORTABLE' | 'SPACIOUS'
  animations: boolean
  backgroundAnimations: boolean
  pageTransitions: boolean
  microInteractions: boolean
  listAnimations: boolean
  modalAnimations: boolean
  scrollAnimations: boolean
  wallpaperStyle: 'AURORA' | 'NEBULA' | 'GLOW' | 'COSMIC'
  wallpaperIntensity: number
  snowfall: boolean
  particles: boolean
  soundNotifications: boolean
  desktopNotifications: boolean
}

interface PersonalizationTabProps {
  newYearVibe?: boolean
  onNewYearVibeChange?: (v: boolean) => void
}

export const PersonalizationTab = memo(function PersonalizationTab({
  newYearVibe = false,
  onNewYearVibeChange,
}: PersonalizationTabProps) {
  const { setPreferences: setGlobalPreferences } = useUserPreferences()
  const [settings, setSettings] = useState<PersonalizationSettings>({
    theme: 'DARK',
    language: 'ru',
    density: 'COMFORTABLE',
    animations: true,
    backgroundAnimations: true,
    pageTransitions: true,
    microInteractions: true,
    listAnimations: true,
    modalAnimations: true,
    scrollAnimations: true,
    wallpaperStyle: 'AURORA',
    wallpaperIntensity: 60,
    snowfall: false,
    particles: false,
    soundNotifications: true,
    desktopNotifications: true,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Загрузка настроек при монтировании
  useEffect(() => {
    async function loadPreferences() {
      try {
        const response = await fetch('/api/user/preferences')
        if (response.ok) {
          const data = await response.json()
          setSettings({
            theme: data.theme || 'DARK',
            language: data.language || 'ru',
            density: data.density || 'COMFORTABLE',
            animations: data.animations ?? true,
            backgroundAnimations: data.backgroundAnimations ?? true,
            pageTransitions: data.pageTransitions ?? true,
            microInteractions: data.microInteractions ?? true,
            listAnimations: data.listAnimations ?? true,
            modalAnimations: data.modalAnimations ?? true,
            scrollAnimations: data.scrollAnimations ?? true,
            wallpaperStyle: data.wallpaperStyle || 'AURORA',
            wallpaperIntensity: data.wallpaperIntensity ?? 60,
            snowfall: data.snowfall ?? false,
            particles: data.particles ?? false,
            soundNotifications: data.soundNotifications ?? true,
            desktopNotifications: data.desktopNotifications ?? true,
          })
        }
      } catch (error) {
        console.error('Failed to load preferences:', error)
        toast.error('Не удалось загрузить настройки')
      } finally {
        setIsLoading(false)
      }
    }

    loadPreferences()
  }, [])

  const updateSetting = async <K extends keyof PersonalizationSettings>(
    key: K,
    value: PersonalizationSettings[K]
  ) => {
    // Оптимистичное обновление UI
    const previousSettings = settings
    setSettings((prev) => ({ ...prev, [key]: value }))

    setIsSaving(true)
    try {
      const response = await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      })

      if (!response.ok) {
        throw new Error('Failed to save setting')
      }

      // Используем ответ API для обновления локального и глобального состояния
      const savedData = await response.json()

      // Обновляем локальное состояние
      setSettings((prev) => ({
        ...prev,
        theme: savedData.theme || prev.theme,
        language: savedData.language || prev.language,
        density: savedData.density || prev.density,
        animations: savedData.animations ?? prev.animations,
        backgroundAnimations: savedData.backgroundAnimations ?? prev.backgroundAnimations,
        pageTransitions: savedData.pageTransitions ?? prev.pageTransitions,
        microInteractions: savedData.microInteractions ?? prev.microInteractions,
        listAnimations: savedData.listAnimations ?? prev.listAnimations,
        modalAnimations: savedData.modalAnimations ?? prev.modalAnimations,
        scrollAnimations: savedData.scrollAnimations ?? prev.scrollAnimations,
        wallpaperStyle: savedData.wallpaperStyle || prev.wallpaperStyle,
        wallpaperIntensity: savedData.wallpaperIntensity ?? prev.wallpaperIntensity,
        snowfall: savedData.snowfall ?? prev.snowfall,
        particles: savedData.particles ?? prev.particles,
        soundNotifications: savedData.soundNotifications ?? prev.soundNotifications,
        desktopNotifications: savedData.desktopNotifications ?? prev.desktopNotifications,
      }))

      // Обновляем глобальный кэш настроек напрямую (без повторного fetch)
      // чтобы ThemeProvider сразу получил новые данные
      setGlobalPreferences(savedData)
    } catch (error) {
      console.error('Failed to save setting:', error)
      // Откат изменений при ошибке
      setSettings(previousSettings)
      toast.error('Не удалось сохранить настройку')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-teal-500" />
      </div>
    )
  }

  const backgroundAnimationsEnabled = settings.backgroundAnimations ?? true
  const wallpaperStyle = settings.wallpaperStyle ?? 'AURORA'
  const wallpaperIntensity = settings.wallpaperIntensity ?? 60

  return (
    <div className="space-y-6">
      {isSaving && (
        <div className="flex items-center gap-2 rounded-xl border border-teal-500/20 bg-teal-500/10 px-4 py-2 text-xs text-teal-300">
          <Loader2 className="h-3 w-3 animate-spin" />
          Сохранение...
        </div>
      )}

      {/* Theme Section */}
      <div className="panel panel-glass rounded-2xl p-6">
        <div className="mb-6 flex items-center gap-3 border-b border-white/10 pb-4">
          <div className="rounded-full bg-purple-500/10 p-2 text-purple-300">
            <Palette className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Тема оформления</h3>
            <p className="text-xs text-slate-400">
              Выберите светлую, темную или автоматическую тему.
            </p>
          </div>
        </div>

        <div>
          <label className="mb-3 block text-sm font-medium text-white">Цветовая схема</label>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <button
              onClick={() => updateSetting('theme', 'LIGHT')}
              className={`group relative flex flex-col items-center gap-2 rounded-xl border p-4 transition-all ${
                settings.theme === 'LIGHT'
                  ? 'border-sky-400/50 bg-gradient-to-br from-sky-500/15 to-blue-500/10 shadow-lg shadow-sky-500/20'
                  : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
              }`}
            >
              {settings.theme === 'LIGHT' && (
                <div className="absolute right-2 top-2 h-2 w-2 rounded-full bg-sky-400 shadow-lg shadow-sky-400/50" />
              )}
              <div className="rounded-xl bg-gradient-to-br from-sky-100 to-white p-3 text-sky-600 shadow-md">
                <Monitor className="h-5 w-5" />
              </div>
              <div className="text-center">
                <div className="text-sm font-semibold text-white">Светлая</div>
                <div className="text-xs text-slate-400">Дневной режим</div>
              </div>
            </button>

            <button
              onClick={() => updateSetting('theme', 'DARK')}
              className={`group relative flex flex-col items-center gap-2 rounded-xl border p-4 transition-all ${
                settings.theme === 'DARK'
                  ? 'border-teal-400/50 bg-gradient-to-br from-teal-500/15 to-emerald-500/10 shadow-lg shadow-teal-500/20'
                  : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
              }`}
            >
              {settings.theme === 'DARK' && (
                <div className="absolute right-2 top-2 h-2 w-2 rounded-full bg-teal-400 shadow-lg shadow-teal-400/50" />
              )}
              <div className="rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 p-3 text-teal-400 shadow-md">
                <Monitor className="h-5 w-5" />
              </div>
              <div className="text-center">
                <div className="text-sm font-semibold text-white">Тёмная</div>
                <div className="text-xs text-slate-400">Ночной режим</div>
              </div>
            </button>

            <button
              onClick={() => updateSetting('theme', 'VIOLET')}
              className={`group relative flex flex-col items-center gap-2 rounded-xl border p-4 transition-all ${
                settings.theme === 'VIOLET'
                  ? 'border-violet-400/50 bg-gradient-to-br from-violet-500/15 to-purple-500/10 shadow-lg shadow-violet-500/20'
                  : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
              }`}
            >
              {settings.theme === 'VIOLET' && (
                <div className="absolute right-2 top-2 h-2 w-2 rounded-full bg-violet-400 shadow-lg shadow-violet-400/50" />
              )}
              <div className="rounded-xl bg-gradient-to-br from-violet-600 to-purple-800 p-3 text-violet-200 shadow-md">
                <Monitor className="h-5 w-5" />
              </div>
              <div className="text-center">
                <div className="text-sm font-semibold text-white">Фиолетовая</div>
                <div className="text-xs text-slate-400">Глубокий пурпур</div>
              </div>
            </button>

            <button
              onClick={() => updateSetting('theme', 'AUTO')}
              className={`group relative flex flex-col items-center gap-2 rounded-xl border p-4 transition-all ${
                settings.theme === 'AUTO'
                  ? 'border-amber-400/50 bg-gradient-to-br from-amber-500/15 to-orange-500/10 shadow-lg shadow-amber-500/20'
                  : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
              }`}
            >
              {settings.theme === 'AUTO' && (
                <div className="absolute right-2 top-2 h-2 w-2 rounded-full bg-amber-400 shadow-lg shadow-amber-400/50" />
              )}
              <div className="rounded-xl bg-gradient-to-br from-amber-200 via-slate-400 to-slate-800 p-3 text-white shadow-md">
                <Monitor className="h-5 w-5" />
              </div>
              <div className="text-center">
                <div className="text-sm font-semibold text-white">Авто</div>
                <div className="text-xs text-slate-400">По системе</div>
              </div>
            </button>
          </div>
          <p className="mt-3 text-xs text-slate-400">
            {settings.theme === 'AUTO' &&
              'Тема автоматически меняется в зависимости от системных настроек'}
            {settings.theme === 'LIGHT' && 'Светлая тема с комфортными дневными цветами'}
            {settings.theme === 'DARK' && 'Тёмная тема для комфортной работы в темноте'}
            {settings.theme === 'VIOLET' && 'Глубокая фиолетовая тема с пурпурными акцентами'}
          </p>
        </div>
      </div>

      {/* Language Section */}
      <div className="panel panel-glass rounded-2xl p-6">
        <div className="mb-6 flex items-center gap-3 border-b border-white/10 pb-4">
          <div className="rounded-full bg-blue-500/10 p-2 text-blue-300">
            <Globe className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Язык интерфейса</h3>
            <p className="text-xs text-slate-400">Выберите язык для отображения интерфейса.</p>
          </div>
        </div>

        <div>
          <label className="mb-3 block text-sm font-medium text-white">Язык</label>
          <select
            value={settings.language}
            onChange={(e) =>
              updateSetting('language', e.target.value as PersonalizationSettings['language'])
            }
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white transition focus:border-teal-400/50 focus:outline-none focus:ring-2 focus:ring-teal-400/20"
          >
            <option value="ru">Русский</option>
            <option value="en">English</option>
          </select>
          <p className="mt-2 text-xs text-slate-400">
            Интерфейс будет отображаться на выбранном языке. Перезагрузка не требуется.
          </p>
        </div>
      </div>

      {/* Density Section */}
      <div className="panel panel-glass rounded-2xl p-6">
        <div className="mb-6 flex items-center gap-3 border-b border-white/10 pb-4">
          <div className="rounded-full bg-orange-500/10 p-2 text-orange-300">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Плотность интерфейса</h3>
            <p className="text-xs text-slate-400">
              Настройте размер элементов и отступы в интерфейсе.
            </p>
          </div>
        </div>

        <div>
          <label className="mb-3 block text-sm font-medium text-white">Плотность</label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <button
              onClick={() => updateSetting('density', 'COMPACT')}
              className={`rounded-xl border p-4 text-left transition ${
                settings.density === 'COMPACT'
                  ? 'border-teal-400/50 bg-teal-500/15 shadow-[0_0_18px_rgba(20,184,166,0.25)]'
                  : 'border-white/10 bg-white/5 hover:bg-white/10'
              }`}
            >
              <div className="text-sm font-semibold text-white">Компактный</div>
              <div className="text-xs text-slate-400">Больше информации на экране</div>
            </button>

            <button
              onClick={() => updateSetting('density', 'COMFORTABLE')}
              className={`rounded-xl border p-4 text-left transition ${
                settings.density === 'COMFORTABLE'
                  ? 'border-teal-400/50 bg-teal-500/15 shadow-[0_0_18px_rgba(20,184,166,0.25)]'
                  : 'border-white/10 bg-white/5 hover:bg-white/10'
              }`}
            >
              <div className="text-sm font-semibold text-white">Комфортный</div>
              <div className="text-xs text-slate-400">Баланс плотности и читаемости</div>
            </button>

            <button
              onClick={() => updateSetting('density', 'SPACIOUS')}
              className={`rounded-xl border p-4 text-left transition ${
                settings.density === 'SPACIOUS'
                  ? 'border-teal-400/50 bg-teal-500/15 shadow-[0_0_18px_rgba(20,184,166,0.25)]'
                  : 'border-white/10 bg-white/5 hover:bg-white/10'
              }`}
            >
              <div className="text-sm font-semibold text-white">Просторный</div>
              <div className="text-xs text-slate-400">Максимальная читаемость</div>
            </button>
          </div>
        </div>
      </div>

      {/* Animations Section */}
      <div className="panel panel-glass rounded-2xl p-6">
        <div className="mb-6 flex items-center gap-3 border-b border-white/10 pb-4">
          <div className="rounded-full bg-teal-500/10 p-2 text-teal-300">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Анимации и эффекты</h3>
            <p className="text-xs text-slate-400">
              Управляйте анимациями и визуальными эффектами интерфейса.
            </p>
          </div>
        </div>

        <SettingsToggle
          label="Включить анимации"
          description="Использовать плавные переходы и анимации в интерфейсе. Отключение может улучшить производительность."
          icon={<Sparkles className="h-4 w-4" />}
          enabled={settings.animations}
          onToggle={(enabled) => updateSetting('animations', enabled)}
        />
        <div className="mt-4">
          <SettingsToggle
            label="Анимированный фон"
            description="Снег, мерцание и праздничные эффекты в фоне. Отключите, если мешает или тормозит."
            icon={<Sparkles className="h-4 w-4" />}
            enabled={backgroundAnimationsEnabled}
            onToggle={(enabled) => updateSetting('backgroundAnimations', enabled)}
          />
        </div>
        <div
          className={`mt-4 space-y-4 ${
            backgroundAnimationsEnabled ? '' : 'pointer-events-none opacity-60'
          }`}
        >
          <div>
            <label className="mb-2 block text-sm font-medium text-white">Стиль обоев</label>
            <select
              value={wallpaperStyle}
              onChange={(e) =>
                updateSetting(
                  'wallpaperStyle',
                  e.target.value as PersonalizationSettings['wallpaperStyle']
                )
              }
              disabled={!backgroundAnimationsEnabled}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white transition focus:border-teal-400/50 focus:outline-none focus:ring-2 focus:ring-teal-400/20"
            >
              <option value="AURORA">Аврора</option>
              <option value="NEBULA">Небула</option>
              <option value="GLOW">Сияние</option>
              <option value="COSMIC">Космос</option>
            </select>
            <p className="mt-1 text-xs text-slate-400">
              Выберите характер фона: мягкая аврора, глубокая небула, чистое сияние или космическая
              атмосфера.
            </p>
          </div>
          <div>
            <label className="mb-2 flex items-center justify-between text-sm font-medium text-white">
              <span>Интенсивность</span>
              <span className="text-xs text-slate-400">{wallpaperIntensity}%</span>
            </label>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={wallpaperIntensity}
              onChange={(e) => updateSetting('wallpaperIntensity', Number(e.target.value))}
              disabled={!backgroundAnimationsEnabled}
              className="w-full accent-teal-400"
            />
            <p className="mt-1 text-xs text-slate-400">
              Пользуйтесь слайдером, чтобы усилить или ослабить эффект.
            </p>
          </div>

          <div className="mt-4 space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
            <h4 className="text-sm font-semibold text-white">Дополнительные эффекты</h4>

            {onNewYearVibeChange !== undefined && (
              <SettingsToggle
                label="Новогодний вайб"
                description="Праздничное оформление интерфейса: снег, гирлянды и новогодняя атмосфера."
                icon={<Crown className="h-4 w-4" />}
                enabled={newYearVibe}
                onToggle={onNewYearVibeChange}
              />
            )}

            <SettingsToggle
              label="Падающий снег"
              description="Анимация падающих снежинок с реалистичным движением и вращением."
              icon={<Snowflake className="h-4 w-4" />}
              enabled={settings.snowfall ?? false}
              onToggle={(enabled) => updateSetting('snowfall', enabled)}
            />

            <SettingsToggle
              label="Плавающие частицы"
              description="Всплывающие светящиеся частицы для атмосферного эффекта."
              icon={<Sparkles className="h-4 w-4" />}
              enabled={settings.particles ?? false}
              onToggle={(enabled) => updateSetting('particles', enabled)}
            />
          </div>

          <div className="mt-4 space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
            <h4 className="text-sm font-semibold text-white">Переходы и взаимодействия</h4>

            <SettingsToggle
              label="Переходы между страницами"
              description="Плавные анимации при навигации между страницами приложения."
              icon={<Navigation className="h-4 w-4" />}
              enabled={settings.pageTransitions ?? true}
              onToggle={(enabled) => updateSetting('pageTransitions', enabled)}
            />

            <SettingsToggle
              label="Микро-взаимодействия"
              description="Анимации при наведении и взаимодействии с кнопками и формами."
              icon={<MousePointerClick className="h-4 w-4" />}
              enabled={settings.microInteractions ?? true}
              onToggle={(enabled) => updateSetting('microInteractions', enabled)}
            />

            <SettingsToggle
              label="Анимации списков"
              description="Плавное появление и сортировка элементов в списках."
              icon={<List className="h-4 w-4" />}
              enabled={settings.listAnimations ?? true}
              onToggle={(enabled) => updateSetting('listAnimations', enabled)}
            />

            <SettingsToggle
              label="Анимации модальных окон"
              description="Плавное открытие и закрытие диалогов и модальных окон."
              icon={<PanelTop className="h-4 w-4" />}
              enabled={settings.modalAnimations ?? true}
              onToggle={(enabled) => updateSetting('modalAnimations', enabled)}
            />

            <SettingsToggle
              label="Анимации при прокрутке"
              description="Эффекты появления элементов при прокрутке страницы."
              icon={<ScrollText className="h-4 w-4" />}
              enabled={settings.scrollAnimations ?? true}
              onToggle={(enabled) => updateSetting('scrollAnimations', enabled)}
            />
          </div>
        </div>
      </div>
    </div>
  )
})
