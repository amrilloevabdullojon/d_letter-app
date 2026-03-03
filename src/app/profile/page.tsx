'use client'

import { useSession } from 'next-auth/react'
import { Header } from '@/components/Header'
import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Loader2,
  Mail,
  Phone,
  MapPin,
  Building2,
  Briefcase,
  Globe2,
  Shield,
  Crown,
  FileText,
  MessageSquare,
  Clock,
  Save,
  UserCircle,
  Eye,
  EyeOff,
  Upload,
  Link2,
  Copy,
  RefreshCw,
  ExternalLink,
  X,
  Plus,
  AlertCircle,
} from 'lucide-react'
import { useToast } from '@/components/Toast'
import { formatDate } from '@/lib/utils'
import { useAuthRedirect } from '@/hooks/useAuthRedirect'

interface ProfileData {
  bio: string | null
  phone: string | null
  position: string | null
  department: string | null
  location: string | null
  timezone: string | null
  skills: string[]
  avatarUrl: string | null
  coverUrl: string | null
  publicEmail: boolean
  publicPhone: boolean
  publicBio: boolean
  publicPosition: boolean
  publicDepartment: boolean
  publicLocation: boolean
  publicTimezone: boolean
  publicSkills: boolean
  publicLastLogin: boolean
  publicProfileEnabled: boolean
  publicProfileToken: string | null
  visibility: 'INTERNAL' | 'PRIVATE'
}

interface UserSummary {
  id: string
  name: string | null
  email: string | null
  image: string | null
  role: 'SUPERADMIN' | 'ADMIN' | 'MANAGER' | 'AUDITOR' | 'EMPLOYEE' | 'VIEWER'
  lastLoginAt: string | null
  _count: {
    letters: number
    comments: number
    sessions: number
  }
}

interface ActivityLetter {
  id: string
  number: string
  org: string
  status: string
  updatedAt: string
}

interface ActivityComment {
  id: string
  text: string
  createdAt: string
  letter: { id: string; number: string; org: string }
}

interface ActivityAssignment {
  id: string
  createdAt: string
  user: { id: string; name: string | null; email: string | null } | null
  letter: { id: string; number: string; org: string }
}

interface ActivityData {
  letters: ActivityLetter[]
  comments: ActivityComment[]
  assignments: ActivityAssignment[]
}

const ROLE_LABELS: Record<UserSummary['role'], string> = {
  SUPERADMIN: 'Суперадмин',
  ADMIN: 'Админ',
  MANAGER: 'Менеджер',
  AUDITOR: 'Аудитор',
  EMPLOYEE: 'Сотрудник',
  VIEWER: 'Наблюдатель',
}

const ROLE_BADGE_CLASSES: Record<UserSummary['role'], string> = {
  SUPERADMIN:
    'bg-gradient-to-r from-yellow-500/30 via-amber-400/30 to-yellow-600/30 text-yellow-100 border border-yellow-400/40 shadow-[0_0_12px_rgba(251,191,36,0.35)]',
  ADMIN: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
  MANAGER: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  AUDITOR: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
  EMPLOYEE: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
  VIEWER: 'bg-slate-500/20 text-slate-400 border border-slate-500/30',
}

const fieldBase =
  'rounded-xl border border-slate-700/50 bg-slate-800/50 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/20 transition-colors'

const emptyProfile: ProfileData = {
  bio: null,
  phone: null,
  position: null,
  department: null,
  location: null,
  timezone: null,
  skills: [],
  avatarUrl: null,
  coverUrl: null,
  publicEmail: false,
  publicPhone: false,
  publicBio: true,
  publicPosition: true,
  publicDepartment: true,
  publicLocation: true,
  publicTimezone: true,
  publicSkills: true,
  publicLastLogin: false,
  publicProfileEnabled: false,
  publicProfileToken: null,
  visibility: 'INTERNAL',
}

// Toggle switch component
function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={[
        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent',
        'transition-colors duration-200 ease-in-out focus-visible:outline-none',
        checked ? 'bg-teal-500' : 'bg-slate-600',
        disabled ? 'cursor-not-allowed opacity-50' : 'hover:opacity-90',
      ].join(' ')}
    >
      <span
        className={[
          'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg',
          'ring-0 transition-transform duration-200 ease-in-out',
          checked ? 'translate-x-4' : 'translate-x-0',
        ].join(' ')}
      />
    </button>
  )
}

// Section header component
function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 border-b border-slate-700/50 pb-3">
      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-500/15">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-white">{title}</h3>
    </div>
  )
}

// Field label component
function FieldLabel({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="mb-1.5 flex items-center gap-1.5 text-xs text-slate-400">
      {icon}
      {label}
    </div>
  )
}

export default function ProfilePage() {
  const toast = useToast()
  const { data: session, status: authStatus, update: updateSession } = useSession()
  useAuthRedirect(authStatus)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [coverUploading, setCoverUploading] = useState(false)
  const [origin, setOrigin] = useState('')
  const [user, setUser] = useState<UserSummary | null>(null)
  const [profile, setProfile] = useState<ProfileData>(emptyProfile)
  const [originalProfile, setOriginalProfile] = useState<ProfileData>(emptyProfile)
  const [newSkillInput, setNewSkillInput] = useState('')
  const [activity, setActivity] = useState<ActivityData | null>(null)

  const fetchedRef = useRef(false)

  const hasUnsavedChanges = useMemo(() => {
    return JSON.stringify(profile) !== JSON.stringify(originalProfile)
  }, [profile, originalProfile])

  useEffect(() => {
    if (authStatus === 'authenticated' && !fetchedRef.current) {
      fetchedRef.current = true
      setLoading(true)
      fetch('/api/profile')
        .then((res) => {
          if (!res.ok) throw new Error('Failed to load profile')
          return res.json()
        })
        .then((data) => {
          setUser(data.user)
          const nextProfile: ProfileData = data.profile || emptyProfile
          setProfile(nextProfile)
          setOriginalProfile(nextProfile)
          setActivity(data.activity || null)
        })
        .catch((error) => {
          console.error('Failed to load profile:', error)
          toast.error('Не удалось загрузить профиль')
        })
        .finally(() => {
          setLoading(false)
        })
    }
  }, [authStatus])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin)
    }
  }, [])

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to save profile')
      }
      const data = await res.json()
      const saved = data.profile || profile
      setProfile(saved)
      setOriginalProfile(saved)
      toast.success('Профиль обновлен')
    } catch (error) {
      console.error('Failed to save profile:', error)
      toast.error('Не удалось сохранить профиль')
    } finally {
      setSaving(false)
    }
  }

  const handleAssetUpload = async (type: 'avatar' | 'cover', file: File) => {
    const setUploading = type === 'avatar' ? setAvatarUploading : setCoverUploading
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', type)
      const res = await fetch('/api/profile/assets', {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to upload file')
      }
      const data = await res.json()
      setProfile((prev) => ({ ...prev, ...data.profile }))
      setOriginalProfile((prev) => ({ ...prev, ...data.profile }))
      if (type === 'avatar' && updateSession) {
        await updateSession({ image: data.profile?.avatarUrl || null })
      }
      toast.success(type === 'avatar' ? 'Аватар обновлён' : 'Обложка обновлена')
    } catch (error) {
      console.error('Failed to upload asset:', error)
      toast.error('Не удалось загрузить файл')
    } finally {
      setUploading(false)
    }
  }

  const handleRotateToken = async () => {
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rotatePublicToken: true }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to rotate token')
      }
      const data = await res.json()
      setProfile((prev) => ({ ...prev, ...data.profile }))
      setOriginalProfile((prev) => ({ ...prev, ...data.profile }))
      toast.success('Ссылка обновлена')
    } catch (error) {
      console.error('Failed to rotate token:', error)
      toast.error('Не удалось обновить ссылку')
    }
  }

  const handleCopyLink = async () => {
    if (!publicProfileUrl) return
    try {
      await navigator.clipboard.writeText(publicProfileUrl)
      toast.success('Ссылка скопирована')
    } catch (error) {
      console.error('Failed to copy link:', error)
      toast.error('Не удалось скопировать')
    }
  }

  const addSkill = useCallback(() => {
    const s = newSkillInput.trim()
    if (!s || profile.skills.includes(s)) {
      setNewSkillInput('')
      return
    }
    setProfile((prev) => ({ ...prev, skills: [...prev.skills, s] }))
    setNewSkillInput('')
  }, [newSkillInput, profile.skills])

  const removeSkill = useCallback((skill: string) => {
    setProfile((prev) => ({ ...prev, skills: prev.skills.filter((s) => s !== skill) }))
  }, [])

  if (authStatus === 'loading' || (authStatus === 'authenticated' && loading)) {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-teal-400" />
      </div>
    )
  }

  if (!session || !user) {
    return null
  }

  const displayAvatar = profile.avatarUrl || user.image
  const coverUrl = profile.coverUrl
  const publicProfileUrl =
    origin && profile.publicProfileEnabled && profile.publicProfileToken
      ? `${origin}/u/${profile.publicProfileToken}`
      : ''

  return (
    <div className="app-shell min-h-screen">
      <Header />

      <main className="animate-pageIn mx-auto max-w-[1400px] px-4 pb-24 pt-6 sm:px-6 sm:pb-10 sm:pt-8 lg:px-8">
        {/* ─── Hero Section ─── */}
        <div className="mb-6 overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-800/60 shadow-xl">
          {/* Cover image */}
          <div className="group relative h-36 sm:h-48">
            {coverUrl ? (
              <Image src={coverUrl} alt="Cover" fill className="object-cover" unoptimized />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-slate-700/80 via-slate-800/80 to-slate-900/80" />
            )}
            {/* Cover upload overlay */}
            <label className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/40 group-hover:opacity-100">
              <div className="flex items-center gap-2 rounded-xl bg-black/60 px-3 py-2 text-sm text-white backdrop-blur-sm">
                {coverUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                Изменить обложку
              </div>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleAssetUpload('cover', file)
                  e.currentTarget.value = ''
                }}
              />
            </label>
          </div>

          {/* Avatar + Info row */}
          <div className="px-4 pb-5 sm:px-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              {/* Avatar — overlaps cover */}
              <div className="group relative -mt-10 shrink-0 sm:-mt-14">
                <div className="h-20 w-20 overflow-hidden rounded-full border-4 border-slate-800 bg-slate-700 sm:h-28 sm:w-28">
                  {displayAvatar ? (
                    <Image
                      src={displayAvatar}
                      alt={user.name || user.email || 'User'}
                      width={112}
                      height={112}
                      className="h-full w-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <UserCircle className="h-12 w-12 text-slate-400 sm:h-16 sm:w-16" />
                    </div>
                  )}
                </div>
                {/* Avatar upload hover */}
                <label className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-black/0 opacity-0 transition-all group-hover:bg-black/60 group-hover:opacity-100">
                  {avatarUploading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-white" />
                  ) : (
                    <Upload className="h-5 w-5 text-white" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleAssetUpload('avatar', file)
                      e.currentTarget.value = ''
                    }}
                  />
                </label>
              </div>

              {/* Name + role + email */}
              <div className="min-w-0 flex-1 sm:pb-1 sm:pt-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-bold text-white sm:text-2xl">
                    {user.name || 'Без имени'}
                  </h1>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${ROLE_BADGE_CLASSES[user.role]}`}
                  >
                    {user.role === 'SUPERADMIN' ? (
                      <Crown className="h-3 w-3 text-yellow-200" />
                    ) : (
                      <Shield className="h-3 w-3" />
                    )}
                    {ROLE_LABELS[user.role]}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-sm text-slate-400">
                  <Mail className="h-3.5 w-3.5" />
                  <span className="truncate">{user.email || '—'}</span>
                </div>
              </div>

              {/* Stats */}
              <div className="flex gap-6 sm:pb-1">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{user._count.letters}</div>
                  <div className="text-xs text-slate-500">Писем</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{user._count.comments}</div>
                  <div className="text-xs text-slate-500">Коммент.</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{user._count.sessions}</div>
                  <div className="text-xs text-slate-500">Сессий</div>
                </div>
              </div>

              {/* Save area */}
              <div className="flex shrink-0 items-center gap-3 sm:pb-1">
                {hasUnsavedChanges && (
                  <div className="flex items-center gap-1.5 text-xs text-amber-400">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Есть изменения</span>
                  </div>
                )}
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-teal-500/25 transition-all hover:brightness-110 disabled:opacity-60"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Сохранить
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Main grid ─── */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* ── Left column: basic info ── */}
          <div className="space-y-5">
            {/* Bio + fields */}
            <div className="panel panel-glass space-y-5 rounded-2xl p-5">
              <SectionHeader
                icon={<UserCircle className="h-4 w-4 text-teal-400" />}
                title="Основное"
              />

              <div>
                <FieldLabel icon={null} label="О себе" />
                <textarea
                  value={profile.bio || ''}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  className={`${fieldBase} min-h-[100px] w-full px-3 py-2 text-sm`}
                  placeholder="Коротко о себе"
                  aria-label="Bio"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <div>
                  <FieldLabel
                    icon={<Briefcase className="h-3.5 w-3.5 text-teal-400" />}
                    label="Должность"
                  />
                  <input
                    value={profile.position || ''}
                    onChange={(e) => setProfile({ ...profile, position: e.target.value })}
                    className={`${fieldBase} w-full px-3 py-2 text-sm`}
                    placeholder="Должность"
                  />
                </div>
                <div>
                  <FieldLabel
                    icon={<Building2 className="h-3.5 w-3.5 text-teal-400" />}
                    label="Отдел"
                  />
                  <input
                    value={profile.department || ''}
                    onChange={(e) => setProfile({ ...profile, department: e.target.value })}
                    className={`${fieldBase} w-full px-3 py-2 text-sm`}
                    placeholder="Отдел"
                  />
                </div>
                <div>
                  <FieldLabel
                    icon={<MapPin className="h-3.5 w-3.5 text-teal-400" />}
                    label="Локация"
                  />
                  <input
                    value={profile.location || ''}
                    onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                    className={`${fieldBase} w-full px-3 py-2 text-sm`}
                    placeholder="Город, страна"
                  />
                </div>
                <div>
                  <FieldLabel
                    icon={<Globe2 className="h-3.5 w-3.5 text-teal-400" />}
                    label="Часовой пояс"
                  />
                  <input
                    value={profile.timezone || ''}
                    onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
                    className={`${fieldBase} w-full px-3 py-2 text-sm`}
                    placeholder="UTC+5"
                  />
                </div>
                <div>
                  <FieldLabel
                    icon={<Phone className="h-3.5 w-3.5 text-teal-400" />}
                    label="Телефон"
                  />
                  <input
                    value={profile.phone || ''}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    className={`${fieldBase} w-full px-3 py-2 text-sm`}
                    placeholder="+998 90 000 00 00"
                  />
                </div>
                <div>
                  <FieldLabel
                    icon={<Mail className="h-3.5 w-3.5 text-slate-500" />}
                    label="Email"
                  />
                  <input
                    value={user.email || ''}
                    disabled
                    className={`${fieldBase} w-full px-3 py-2 text-sm opacity-60`}
                  />
                </div>
              </div>
            </div>

            {/* Last login */}
            <div className="panel panel-glass flex items-center gap-3 rounded-xl px-4 py-3 text-sm">
              <Clock className="h-4 w-4 shrink-0 text-slate-500" />
              <span className="text-slate-400">Последний вход:</span>
              <span className="font-medium text-white">{formatDate(user.lastLoginAt) || '—'}</span>
            </div>
          </div>

          {/* ── Right column: skills + visibility + activity ── */}
          <div className="space-y-5 lg:col-span-2">
            {/* Skills */}
            <div className="panel panel-glass space-y-4 rounded-2xl p-5">
              <SectionHeader icon={<FileText className="h-4 w-4 text-teal-400" />} title="Навыки" />

              {profile.skills.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1.5 rounded-full border border-teal-500/30 bg-teal-500/10 px-3 py-1 text-sm text-teal-200"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => removeSkill(skill)}
                        className="rounded-full text-teal-400 transition hover:text-white"
                        aria-label={`Удалить ${skill}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <input
                  value={newSkillInput}
                  onChange={(e) => setNewSkillInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addSkill()
                    }
                  }}
                  className={`${fieldBase} min-w-0 flex-1 px-3 py-2 text-sm`}
                  placeholder="Введите навык и нажмите Enter"
                  aria-label="Новый навык"
                />
                <button
                  type="button"
                  onClick={addSkill}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-600/50 bg-slate-700/50 px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-700 hover:text-white"
                >
                  <Plus className="h-4 w-4" />
                  Добавить
                </button>
              </div>
            </div>

            {/* Visibility */}
            <div className="panel panel-glass space-y-5 rounded-2xl p-5">
              <SectionHeader
                icon={<Eye className="h-4 w-4 text-teal-400" />}
                title="Видимость профиля"
              />

              <div className="grid gap-5 sm:grid-cols-[220px_1fr]">
                {/* Visibility level */}
                <div className="space-y-4">
                  <div>
                    <div className="mb-2 text-xs text-slate-400">Уровень доступа</div>
                    <div className="space-y-2">
                      {(['INTERNAL', 'PRIVATE'] as const).map((v) => (
                        <label
                          key={v}
                          className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-700/50 bg-slate-800/40 px-3 py-2.5 transition hover:border-slate-600/50"
                        >
                          <input
                            type="radio"
                            name="visibility"
                            value={v}
                            checked={profile.visibility === v}
                            onChange={() => setProfile({ ...profile, visibility: v })}
                            className="accent-teal-500"
                          />
                          <div>
                            <div className="text-sm font-medium text-slate-200">
                              {v === 'INTERNAL' ? 'Внутри системы' : 'Только я'}
                            </div>
                            <div className="text-xs text-slate-500">
                              {v === 'INTERNAL'
                                ? 'Видно коллегам в системе'
                                : 'Скрыт от всех, кроме вас'}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Public profile toggle */}
                  <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 px-3 py-3">
                    <label className="flex cursor-pointer items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Link2 className="h-4 w-4 text-slate-400" />
                        <div>
                          <div className="text-sm font-medium text-slate-200">Публичная ссылка</div>
                          <div className="text-xs text-slate-500">Доступна вне системы</div>
                        </div>
                      </div>
                      <Toggle
                        checked={profile.publicProfileEnabled}
                        onChange={(v) => setProfile({ ...profile, publicProfileEnabled: v })}
                      />
                    </label>
                  </div>

                  {profile.visibility === 'PRIVATE' && (
                    <div className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-400">
                      <EyeOff className="h-4 w-4 shrink-0" />
                      Профиль виден только вам и админам
                    </div>
                  )}
                </div>

                {/* Toggle fields */}
                <div>
                  <div className="mb-3 text-xs text-slate-400">Показывать в профиле</div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {[
                      { key: 'publicBio', label: 'О себе' },
                      { key: 'publicPosition', label: 'Должность' },
                      { key: 'publicDepartment', label: 'Отдел' },
                      { key: 'publicLocation', label: 'Локация' },
                      { key: 'publicTimezone', label: 'Часовой пояс' },
                      { key: 'publicSkills', label: 'Навыки' },
                      { key: 'publicLastLogin', label: 'Последний вход' },
                      { key: 'publicEmail', label: 'Email' },
                      { key: 'publicPhone', label: 'Телефон' },
                    ].map(({ key, label }) => (
                      <label
                        key={key}
                        className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-2 py-1.5 transition hover:bg-slate-700/30"
                      >
                        <span className="text-sm text-slate-300">{label}</span>
                        <Toggle
                          checked={profile[key as keyof ProfileData] as boolean}
                          onChange={(v) => setProfile({ ...profile, [key]: v })}
                          disabled={key === 'publicEmail' && !user.email}
                        />
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Public profile URL */}
              {profile.publicProfileEnabled && (
                <div className="rounded-xl border border-teal-500/20 bg-teal-500/5 p-3">
                  <div className="mb-2 flex items-center gap-2 text-xs text-teal-400">
                    <Link2 className="h-3.5 w-3.5" />
                    Публичная ссылка
                  </div>
                  {publicProfileUrl ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <a
                        href={publicProfileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="min-w-0 flex-1 truncate text-xs text-teal-300 transition hover:text-teal-200"
                      >
                        {publicProfileUrl}
                      </a>
                      <div className="flex shrink-0 gap-1.5">
                        <button
                          onClick={handleCopyLink}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-600/50 bg-slate-700/50 px-2 py-1 text-xs text-slate-200 transition hover:bg-slate-700"
                        >
                          <Copy className="h-3 w-3" />
                          Копировать
                        </button>
                        <button
                          onClick={handleRotateToken}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-600/50 bg-slate-700/50 px-2 py-1 text-xs text-slate-200 transition hover:bg-slate-700"
                        >
                          <RefreshCw className="h-3 w-3" />
                          Обновить
                        </button>
                        <a
                          href={publicProfileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-600/50 bg-slate-700/50 px-2 py-1 text-xs text-slate-200 transition hover:bg-slate-700"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Открыть
                        </a>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">Доступно после сохранения.</p>
                  )}
                </div>
              )}
            </div>

            {/* Activity */}
            <div className="panel panel-glass space-y-4 rounded-2xl p-5">
              <SectionHeader
                icon={<Clock className="h-4 w-4 text-teal-400" />}
                title="Последняя активность"
              />

              {activity ? (
                <div className="grid gap-4 text-sm md:grid-cols-3">
                  {/* Letters */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                      <FileText className="h-3.5 w-3.5" />
                      Письма
                    </div>
                    {activity.letters.length > 0 ? (
                      activity.letters.map((item) => (
                        <Link
                          key={item.id}
                          href={`/letters/${item.id}`}
                          className="block rounded-xl border border-slate-700/50 bg-slate-800/40 px-3 py-2.5 transition hover:border-teal-500/30 hover:bg-slate-800/60"
                        >
                          <div className="font-medium text-white">№{item.number}</div>
                          <div className="mt-0.5 truncate text-xs text-slate-400">{item.org}</div>
                        </Link>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500">Нет писем</p>
                    )}
                  </div>

                  {/* Comments */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                      <MessageSquare className="h-3.5 w-3.5" />
                      Комментарии
                    </div>
                    {activity.comments.length > 0 ? (
                      activity.comments.map((item) => (
                        <Link
                          key={item.id}
                          href={`/letters/${item.letter.id}`}
                          className="block rounded-xl border border-slate-700/50 bg-slate-800/40 px-3 py-2.5 transition hover:border-teal-500/30 hover:bg-slate-800/60"
                        >
                          <div className="font-medium text-white">№{item.letter.number}</div>
                          <div className="mt-0.5 line-clamp-2 text-xs text-slate-400">
                            {item.text}
                          </div>
                        </Link>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500">Нет комментариев</p>
                    )}
                  </div>

                  {/* Assignments */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                      <Shield className="h-3.5 w-3.5" />
                      Назначения
                    </div>
                    {activity.assignments.length > 0 ? (
                      activity.assignments.map((item) => (
                        <Link
                          key={item.id}
                          href={`/letters/${item.letter.id}`}
                          className="block rounded-xl border border-slate-700/50 bg-slate-800/40 px-3 py-2.5 transition hover:border-teal-500/30 hover:bg-slate-800/60"
                        >
                          <div className="font-medium text-white">№{item.letter.number}</div>
                          <div className="mt-0.5 truncate text-xs text-slate-400">
                            {item.letter.org}
                          </div>
                        </Link>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500">Нет назначений</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Загрузка...
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
