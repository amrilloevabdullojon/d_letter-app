'use client'

import { useSession } from 'next-auth/react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useCallback } from 'react'
import Link from 'next/link'
import { Header } from '@/components/Header'
import {
  Loader2,
  Users,
  Shield,
  RefreshCw,
  History,
  Bell,
  Palette,
  Settings,
  Tags,
  ArrowLeft,
  Database,
  BrainCircuit,
} from 'lucide-react'
import { useToast } from '@/components/Toast'
import { hasPermission } from '@/lib/permissions'
import { useAuthRedirect } from '@/hooks/useAuthRedirect'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { useIsMobileOrTablet } from '@/hooks/useMediaQuery'
import dynamic from 'next/dynamic'
import { ScrollIndicator } from '@/components/mobile/ScrollIndicator'
import { MobileTabs } from '@/components/mobile/MobileTabs'
import { TabSkeleton } from '@/components/settings/TabSkeleton'
import { AnimatePresence, motion } from 'framer-motion'

// Lazy load tab components for better performance
const PermissionsManager = dynamic(
  () =>
    import('@/components/PermissionsManager').then((mod) => ({ default: mod.PermissionsManager })),
  {
    loading: () => <TabSkeleton />,
  }
)
const UsersTab = dynamic(
  () => import('@/components/settings/UsersTab').then((mod) => ({ default: mod.UsersTab })),
  {
    loading: () => <TabSkeleton />,
  }
)
const SyncTab = dynamic(
  () => import('@/components/settings/SyncTab').then((mod) => ({ default: mod.SyncTab })),
  {
    loading: () => <TabSkeleton />,
  }
)
const LoginAuditTab = dynamic(
  () =>
    import('@/components/settings/LoginAuditTab').then((mod) => ({ default: mod.LoginAuditTab })),
  {
    loading: () => <TabSkeleton />,
  }
)
const NotificationsTab = dynamic(
  () =>
    import('@/components/settings/NotificationsTab').then((mod) => ({
      default: mod.NotificationsTab,
    })),
  {
    loading: () => <TabSkeleton />,
  }
)
const MobileNotificationsTab = dynamic(
  () =>
    import('@/components/settings/MobileNotificationsTab').then((mod) => ({
      default: mod.MobileNotificationsTab,
    })),
  {
    loading: () => (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-teal-500" />
      </div>
    ),
  }
)
const PersonalizationTab = dynamic(
  () =>
    import('@/components/settings/PersonalizationTab').then((mod) => ({
      default: mod.PersonalizationTab,
    })),
  {
    loading: () => <TabSkeleton />,
  }
)
const WorkflowTab = dynamic(
  () => import('@/components/settings/WorkflowTab').then((mod) => ({ default: mod.WorkflowTab })),
  {
    loading: () => <TabSkeleton />,
  }
)
const StatusConfigTab = dynamic(
  () =>
    import('@/components/settings/StatusConfigTab').then((mod) => ({
      default: mod.StatusConfigTab,
    })),
  {
    loading: () => <TabSkeleton />,
  }
)

const JiraTab = dynamic(
  () => import('@/components/settings/JiraTab').then((mod) => ({ default: mod.JiraTab })),
  { loading: () => <TabSkeleton /> }
)

const AiSettingsTab = dynamic(
  () =>
    import('@/components/settings/AiSettingsTab').then((mod) => ({ default: mod.AiSettingsTab })),
  {
    loading: () => <TabSkeleton />,
  }
)

type TabType =
  | 'permissions'
  | 'users'
  | 'sync'
  | 'audit'
  | 'notifications'
  | 'personalization'
  | 'workflow'
  | 'statuses'
  | 'jira'
  | 'ai'

const TAB_INFO: Record<TabType, string> = {
  permissions: 'Роли и права доступа',
  users: 'Управление аккаунтами',
  sync: 'Интеграция с Google Sheets',
  audit: 'Журнал входов и действий',
  notifications: 'Каналы и события уведомлений',
  personalization: 'Тема, язык и эффекты',
  workflow: 'Параметры рабочего процесса',
  statuses: 'Конфигурация статусов писем',
  jira: 'Интеграция с Jira',
  ai: 'ИИ и Нейросети',
}

export default function SettingsPage() {
  const { data: session, status: authStatus } = useSession()
  useAuthRedirect(authStatus)
  const toast = useToast()
  const searchParams = useSearchParams()
  const router = useRouter()
  const isMobile = useIsMobileOrTablet()

  const [newYearVibe, setNewYearVibe] = useLocalStorage<boolean>('new-year-vibe', false)
  const [bannerDismissed, setBannerDismissed] = useLocalStorage<boolean>(
    'new-year-banner-dismissed',
    false
  )

  // Get active tab from URL, defaulting to 'users'
  const tabParam = searchParams.get('tab') as string
  const isValidTab = Object.keys(TAB_INFO).includes(tabParam)
  const activeTab = (isValidTab ? tabParam : 'users') as TabType

  const isSuperAdmin = session?.user?.role === 'SUPERADMIN'

  // Handle tab changes - update URL when tab is changed
  const handleTabChange = (tab: TabType) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', tab)
    router.replace(`/settings?${params.toString()}`, { scroll: false })
  }

  const handleSuccess = useCallback(
    (message: string) => {
      toast.success(message)
    },
    [toast]
  )

  const handleError = useCallback(
    (message: string) => {
      toast.error(message)
    },
    [toast]
  )

  const handleNewYearVibeToggle = (enabled: boolean) => {
    setNewYearVibe(enabled)
    if (enabled && bannerDismissed) {
      setBannerDismissed(false)
    }
  }

  if (authStatus === 'loading') {
    return null
  }

  if (!session || !hasPermission(session.user.role, 'MANAGE_USERS')) {
    return null
  }

  // Mobile tabs configuration
  const mobileTabs = [
    ...(isSuperAdmin
      ? [
          {
            value: 'permissions' as TabType,
            label: 'Роли',
            icon: <Shield className="h-5 w-5" />,
          },
        ]
      : []),
    {
      value: 'users' as TabType,
      label: 'Пользователи',
      icon: <Users className="h-5 w-5" />,
    },
    {
      value: 'sync' as TabType,
      label: 'Синхр.',
      icon: <RefreshCw className="h-5 w-5" />,
    },
    {
      value: 'audit' as TabType,
      label: 'Аудит',
      icon: <History className="h-5 w-5" />,
    },
    {
      value: 'notifications' as TabType,
      label: 'Уведомления',
      icon: <Bell className="h-5 w-5" />,
    },
    {
      value: 'personalization' as TabType,
      label: 'Тема',
      icon: <Palette className="h-5 w-5" />,
    },
    {
      value: 'workflow' as TabType,
      label: 'Процесс',
      icon: <Settings className="h-5 w-5" />,
    },
    {
      value: 'statuses' as TabType,
      label: 'Статусы',
      icon: <Tags className="h-5 w-5" />,
    },
    ...(isSuperAdmin
      ? [
          {
            value: 'jira' as TabType,
            label: 'Jira',
            icon: <Database className="h-5 w-5" />,
          },
          {
            value: 'ai' as TabType,
            label: 'ИИ',
            icon: <BrainCircuit className="h-5 w-5" />,
          },
        ]
      : []),
  ]
  const handleMobileTabChange = (tab: string) => {
    handleTabChange(tab as TabType)
  }

  return (
    <div className="app-shell min-h-screen">
      <Header />

      <main
        id="main-content"
        tabIndex={-1}
        className="animate-pageIn relative mx-auto max-w-[1600px] px-4 py-6 outline-none sm:px-6 sm:py-8 lg:px-8"
      >
        {/* Back link */}
        <div className="mb-4">
          <Link
            href="/letters"
            className="group inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            <span>Письма</span>
          </Link>
        </div>

        {/* Header with gradient */}
        <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800/80 via-slate-800/60 to-slate-900/80 p-4 sm:p-6">
          {/* Decorative elements */}
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-purple-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-teal-500/10 blur-2xl" />

          <div className="relative flex items-center gap-4">
            <div className="rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 p-3 shadow-lg shadow-purple-500/25">
              <Settings className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">Настройки</h1>
              <p className="mt-0.5 text-sm text-slate-400">{TAB_INFO[activeTab]}</p>
            </div>
          </div>
        </div>

        {/* Tabs - Mobile vs Desktop */}
        {isMobile ? (
          <div className="mb-6">
            <MobileTabs tabs={mobileTabs} activeTab={activeTab} onChange={handleMobileTabChange} />
          </div>
        ) : (
          <div className="mb-6 overflow-hidden rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/80 to-slate-800/60 p-2">
            <ScrollIndicator className="no-scrollbar flex gap-1 md:flex-wrap" showArrows={true}>
              {isSuperAdmin && (
                <button
                  onClick={() => handleTabChange('permissions')}
                  className={`tap-highlight touch-target-sm group flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                    activeTab === 'permissions'
                      ? 'bg-teal-500/15 text-teal-300 ring-1 ring-teal-500/30'
                      : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div
                    className={`rounded-lg p-1.5 ${activeTab === 'permissions' ? 'bg-teal-500/20' : 'bg-slate-700/50 group-hover:bg-slate-600/50'}`}
                  >
                    <Shield className="h-4 w-4" />
                  </div>
                  Разрешения
                </button>
              )}
              <button
                onClick={() => handleTabChange('users')}
                className={`tap-highlight touch-target-sm group flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                  activeTab === 'users'
                    ? 'bg-teal-500/15 text-teal-300 ring-1 ring-teal-500/30'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div
                  className={`rounded-lg p-1.5 ${activeTab === 'users' ? 'bg-teal-500/20' : 'bg-slate-700/50 group-hover:bg-slate-600/50'}`}
                >
                  <Users className="h-4 w-4" />
                </div>
                Пользователи
              </button>
              <button
                onClick={() => handleTabChange('sync')}
                className={`tap-highlight touch-target-sm group flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                  activeTab === 'sync'
                    ? 'bg-teal-500/15 text-teal-300 ring-1 ring-teal-500/30'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div
                  className={`rounded-lg p-1.5 ${activeTab === 'sync' ? 'bg-teal-500/20' : 'bg-slate-700/50 group-hover:bg-slate-600/50'}`}
                >
                  <RefreshCw className="h-4 w-4" />
                </div>
                Синхронизация
              </button>
              <button
                onClick={() => handleTabChange('audit')}
                className={`tap-highlight touch-target-sm group flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                  activeTab === 'audit'
                    ? 'bg-teal-500/15 text-teal-300 ring-1 ring-teal-500/30'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div
                  className={`rounded-lg p-1.5 ${activeTab === 'audit' ? 'bg-teal-500/20' : 'bg-slate-700/50 group-hover:bg-slate-600/50'}`}
                >
                  <History className="h-4 w-4" />
                </div>
                Аудит
              </button>
              <button
                onClick={() => handleTabChange('notifications')}
                className={`tap-highlight touch-target-sm group flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                  activeTab === 'notifications'
                    ? 'bg-teal-500/15 text-teal-300 ring-1 ring-teal-500/30'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div
                  className={`rounded-lg p-1.5 ${activeTab === 'notifications' ? 'bg-teal-500/20' : 'bg-slate-700/50 group-hover:bg-slate-600/50'}`}
                >
                  <Bell className="h-4 w-4" />
                </div>
                Уведомления
              </button>
              <button
                onClick={() => handleTabChange('personalization')}
                className={`tap-highlight touch-target-sm group flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                  activeTab === 'personalization'
                    ? 'bg-teal-500/15 text-teal-300 ring-1 ring-teal-500/30'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div
                  className={`rounded-lg p-1.5 ${activeTab === 'personalization' ? 'bg-teal-500/20' : 'bg-slate-700/50 group-hover:bg-slate-600/50'}`}
                >
                  <Palette className="h-4 w-4" />
                </div>
                Персонализация
              </button>
              <button
                onClick={() => handleTabChange('workflow')}
                className={`tap-highlight touch-target-sm group flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                  activeTab === 'workflow'
                    ? 'bg-teal-500/15 text-teal-300 ring-1 ring-teal-500/30'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div
                  className={`rounded-lg p-1.5 ${activeTab === 'workflow' ? 'bg-teal-500/20' : 'bg-slate-700/50 group-hover:bg-slate-600/50'}`}
                >
                  <Settings className="h-4 w-4" />
                </div>
                Рабочий процесс
              </button>
              <button
                onClick={() => handleTabChange('statuses')}
                className={`tap-highlight touch-target-sm group flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                  activeTab === 'statuses'
                    ? 'bg-teal-500/15 text-teal-300 ring-1 ring-teal-500/30'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div
                  className={`rounded-lg p-1.5 ${activeTab === 'statuses' ? 'bg-teal-500/20' : 'bg-slate-700/50 group-hover:bg-slate-600/50'}`}
                >
                  <Tags className="h-4 w-4" />
                </div>
                Статусы
              </button>
              {isSuperAdmin && (
                <button
                  onClick={() => handleTabChange('jira')}
                  className={`tap-highlight touch-target-sm group flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                    activeTab === 'jira'
                      ? 'bg-teal-500/15 text-teal-300 ring-1 ring-teal-500/30'
                      : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div
                    className={`rounded-lg p-1.5 ${activeTab === 'jira' ? 'bg-teal-500/20' : 'bg-slate-700/50 group-hover:bg-slate-600/50'}`}
                  >
                    <Database className="h-4 w-4" />
                  </div>
                  Jira API
                </button>
              )}
              {isSuperAdmin && (
                <button
                  onClick={() => handleTabChange('ai')}
                  className={`tap-highlight touch-target-sm group flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                    activeTab === 'ai'
                      ? 'bg-teal-500/15 text-teal-300 ring-1 ring-teal-500/30'
                      : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div
                    className={`rounded-lg p-1.5 ${activeTab === 'ai' ? 'bg-teal-500/20' : 'bg-slate-700/50 group-hover:bg-slate-600/50'}`}
                  >
                    <BrainCircuit className="h-4 w-4" />
                  </div>
                  ИИ и Нейросети
                </button>
              )}
            </ScrollIndicator>
          </div>
        )}

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            {activeTab === 'permissions' && isSuperAdmin && (
              <div className="panel panel-glass mb-8 rounded-2xl p-6">
                <PermissionsManager />
              </div>
            )}

            {activeTab === 'users' && (
              <UsersTab
                session={session}
                isSuperAdmin={isSuperAdmin}
                onSuccess={handleSuccess}
                onError={handleError}
              />
            )}

            {activeTab === 'sync' && <SyncTab onSuccess={handleSuccess} onError={handleError} />}

            {activeTab === 'audit' && <LoginAuditTab onError={handleError} />}

            {activeTab === 'notifications' &&
              (isMobile ? <MobileNotificationsTab /> : <NotificationsTab />)}

            {activeTab === 'personalization' && (
              <PersonalizationTab
                newYearVibe={newYearVibe}
                onNewYearVibeChange={handleNewYearVibeToggle}
              />
            )}

            {activeTab === 'workflow' && <WorkflowTab />}

            {activeTab === 'statuses' && (
              <div className="panel panel-glass rounded-2xl p-6">
                <StatusConfigTab />
              </div>
            )}

            {activeTab === 'jira' && isSuperAdmin && (
              <div className="panel panel-glass rounded-2xl p-6">
                <JiraTab />
              </div>
            )}

            {activeTab === 'ai' && isSuperAdmin && (
              <div className="panel panel-glass rounded-2xl p-6">
                <AiSettingsTab />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}
