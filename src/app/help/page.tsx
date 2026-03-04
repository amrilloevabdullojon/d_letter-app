'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  Mail,
  FileText,
  BarChart3,
  Bell,
  Search,
  ChevronLeft,
  ChevronRight,
  Shield,
  TrendingUp,
  ArrowLeft,
  Zap,
  CheckCircle,
  ClipboardList,
  Settings,
  UserCheck,
  Tag,
  BookOpen,
  ChevronDown,
} from 'lucide-react'

/* ─────────────────────────────────────────────────────────────
   CSS keyframes (injected once)
───────────────────────────────────────────────────────────── */
const KEYFRAMES = `
  @keyframes float-env {
    0%, 100% { transform: rotate(var(--rot, -8deg)) translateY(0px); }
    50%       { transform: rotate(calc(var(--rot, -8deg) + 6deg)) translateY(-20px); }
  }
  @keyframes hero-blob {
    0%, 100% { transform: translate(0, 0) scale(1); }
    33%       { transform: translate(22px, -16px) scale(1.04); }
    66%       { transform: translate(-12px, 12px) scale(0.97); }
  }
  @keyframes fade-slide-in {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes badge-pulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(20,184,166,0.4); }
    50%       { box-shadow: 0 0 0 8px rgba(20,184,166,0); }
  }
  @keyframes grad-shift {
    0%, 100% { background-position: 0% 50%; }
    50%       { background-position: 100% 50%; }
  }
  @keyframes progress-line {
    from { transform: scaleX(0); }
    to   { transform: scaleX(1); }
  }
  @keyframes count-up {
    from { opacity: 0; transform: scale(0.5); }
    to   { opacity: 1; transform: scale(1); }
  }
`

/* ─────────────────────────────────────────────────────────────
   Hooks
───────────────────────────────────────────────────────────── */
function useScrollY() {
  const [y, setY] = useState(0)
  useEffect(() => {
    const fn = () => setY(window.scrollY)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])
  return y
}

function useInView(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setVisible(true)
      },
      { threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return [ref, visible] as const
}

/* ─────────────────────────────────────────────────────────────
   Data
───────────────────────────────────────────────────────────── */
const STEPS = [
  {
    num: '01',
    title: 'Вход в систему',
    subtitle: 'Авторизация и роли доступа',
    desc: 'Войдите с вашими учётными данными. Система поддерживает три уровня прав: Суперадмин контролирует всё, Администратор управляет документами, Пользователь работает со своими задачами.',
    points: [
      'Безопасный вход по логину и паролю',
      'Три роли с разными правами доступа',
      'Автоматическое сохранение сессии',
    ],
    accent: '#14b8a6',
    Icon: UserCheck,
  },
  {
    num: '02',
    title: 'Работа с письмами',
    subtitle: 'Создание, отправка, шаблоны',
    desc: 'Создавайте входящие и исходящие письма, используйте готовые шаблоны. Назначайте исполнителей, прикрепляйте документы и отслеживайте статус обработки в режиме реального времени.',
    points: [
      'Входящие, исходящие, внутренние типы',
      'Готовые шаблоны для типовых писем',
      'Статусы: Черновик → Получено → Выполнено',
    ],
    accent: '#3b82f6',
    Icon: Mail,
  },
  {
    num: '03',
    title: 'Заявки и задачи',
    subtitle: 'Управление запросами',
    desc: 'Подавайте заявки и следите за их прохождением по этапам. Прикрепляйте файлы, добавляйте теги для категоризации. Система уведомит о любых изменениях мгновенно.',
    points: [
      'Создание заявок с вложениями и тегами',
      'Визуальный пайплайн статусов',
      'Мгновенные уведомления об изменениях',
    ],
    accent: '#f59e0b',
    Icon: ClipboardList,
  },
  {
    num: '04',
    title: 'Аналитика и отчёты',
    subtitle: 'Данные и визуализация',
    desc: 'Просматривайте интерактивные графики динамики, сравнивайте периоды, анализируйте KPI. Экспортируйте готовые отчёты в PDF или Excel одним кликом.',
    points: [
      'Интерактивные графики и статистика',
      'Сравнение периодов и KPI',
      'Экспорт в PDF и Excel',
    ],
    accent: '#8b5cf6',
    Icon: BarChart3,
  },
  {
    num: '05',
    title: 'Настройки системы',
    subtitle: 'Персонализация и управление',
    desc: 'Настройте тему оформления, каналы уведомлений, отображение данных и эффекты интерфейса. Управляйте пользователями и правами доступа (для администраторов).',
    points: [
      'Тёмная, светлая и фиолетовая темы',
      'Гибкие настройки уведомлений',
      'Эффекты анимации и обои фона',
    ],
    accent: '#ec4899',
    Icon: Settings,
  },
]

const FEATURES = [
  {
    Icon: Shield,
    title: 'Ролевой доступ',
    desc: 'Три уровня прав: Суперадмин, Администратор, Пользователь — каждый видит ровно то, что ему нужно.',
    color: 'teal',
  },
  {
    Icon: Search,
    title: 'Умный поиск',
    desc: 'Полнотекстовый поиск по всей системе. Ctrl+K — мгновенный глобальный поиск с фильтрами по любому полю.',
    color: 'blue',
  },
  {
    Icon: Bell,
    title: 'Уведомления',
    desc: 'Уведомления о изменении статусов, новых задачах и дедлайнах. Настройте каналы и частоту под себя.',
    color: 'amber',
  },
  {
    Icon: TrendingUp,
    title: 'Аналитика',
    desc: 'Динамика выполнения задач, сравнение периодов, индивидуальный KPI — полный контроль продуктивности.',
    color: 'purple',
  },
  {
    Icon: Zap,
    title: 'Горячие клавиши',
    desc: 'Создавайте документы, переходите по разделам и выполняйте ключевые действия без мыши.',
    color: 'green',
  },
  {
    Icon: FileText,
    title: 'Шаблоны',
    desc: 'Готовые шаблоны для типовых писем и заявок. Создавайте свои заготовки для повторяющихся документов.',
    color: 'rose',
  },
]

const SHORTCUTS = [
  { keys: ['Ctrl', 'N'], label: 'Новое письмо' },
  { keys: ['Ctrl', 'K'], label: 'Быстрый поиск' },
  { keys: ['Ctrl', 'Shift', 'R'], label: 'Новая заявка' },
  { keys: ['G', 'L'], label: 'Перейти: Письма' },
  { keys: ['G', 'R'], label: 'Перейти: Заявки' },
  { keys: ['G', 'A'], label: 'Перейти: Аналитика' },
  { keys: ['G', 'S'], label: 'Перейти: Настройки' },
  { keys: ['?'], label: 'Список клавиш' },
]

const TIPS = [
  {
    q: 'Как быстро создать письмо?',
    a: 'Нажмите Ctrl+N или кнопку «+» в верхней шапке. Заполните обязательные поля — тип, тему, содержание — и сохраните. Письмо попадёт в черновики и его можно отредактировать позже.',
  },
  {
    q: 'Как найти нужный документ?',
    a: 'Ctrl+K открывает глобальный поиск по всей системе. Ищите по номеру, теме, автору или содержанию. На страницах Писем и Заявок есть расширенные фильтры по статусу, типу, дате и тегам.',
  },
  {
    q: 'Что означают статусы письма?',
    a: 'ЧЕРНОВИК — создан, не опубликован. ПОЛУЧЕНО — письмо зафиксировано в системе. НА РАССМОТРЕНИИ — в работе у исполнителя. ВЫПОЛНЕНО — обработка завершена. ПРОСРОЧЕНО — истёк срок исполнения.',
  },
  {
    q: 'Как настроить уведомления?',
    a: 'Откройте Настройки → вкладка «Уведомления». Выберите типы событий (новые задачи, изменение статуса, дедлайны) и каналы доставки (в браузере или на email).',
  },
  {
    q: 'Как экспортировать отчёт?',
    a: 'На странице «Отчёты» выберите период и нужные фильтры, затем нажмите кнопку «Экспорт» в правом верхнем углу. Доступны форматы PDF и Excel.',
  },
  {
    q: 'Как поменять тему оформления?',
    a: 'Настройки → вкладка «Персонализация». Выберите тёмную, светлую или фиолетовую тему. Изменение применяется мгновенно без перезагрузки страницы.',
  },
]

/* ─────────────────────────────────────────────────────────────
   Step Visuals (SVG mockups)
───────────────────────────────────────────────────────────── */
function AuthVisual({ accent }: { accent: string }) {
  return (
    <svg viewBox="0 0 300 210" fill="none" className="mx-auto w-full max-w-xs lg:max-w-sm">
      {/* Card */}
      <rect
        x="30"
        y="10"
        width="240"
        height="190"
        rx="18"
        fill="rgba(18,28,43,0.9)"
        stroke={`${accent}35`}
        strokeWidth="1.5"
      />
      {/* Header bar */}
      <rect x="30" y="10" width="240" height="46" rx="18" fill={`${accent}18`} />
      <rect x="30" y="38" width="240" height="18" fill={`${accent}18`} />
      <circle cx="150" cy="33" r="14" fill={`${accent}25`} stroke={accent} strokeWidth="1.5" />
      <path
        d="M144 33 L148 37 L157 28"
        stroke={accent}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Role badges */}
      <rect
        x="42"
        y="62"
        width="62"
        height="20"
        rx="10"
        fill="rgba(20,184,166,0.15)"
        stroke="rgba(20,184,166,0.35)"
        strokeWidth="1"
      />
      <rect x="49" y="69" width="48" height="6" rx="3" fill="rgba(20,184,166,0.5)" />
      <rect
        x="114"
        y="62"
        width="72"
        height="20"
        rx="10"
        fill="rgba(56,189,248,0.15)"
        stroke="rgba(56,189,248,0.35)"
        strokeWidth="1"
      />
      <rect x="121" y="69" width="58" height="6" rx="3" fill="rgba(56,189,248,0.5)" />
      <rect
        x="196"
        y="62"
        width="62"
        height="20"
        rx="10"
        fill="rgba(139,92,246,0.15)"
        stroke="rgba(139,92,246,0.35)"
        strokeWidth="1"
      />
      <rect x="203" y="69" width="48" height="6" rx="3" fill="rgba(139,92,246,0.5)" />
      {/* Input: Login */}
      <rect
        x="42"
        y="96"
        width="216"
        height="28"
        rx="10"
        fill="rgba(255,255,255,0.05)"
        stroke="rgba(255,255,255,0.1)"
        strokeWidth="1"
      />
      <circle cx="60" cy="110" r="6" fill={`${accent}50`} />
      <rect x="72" y="106" width="90" height="8" rx="4" fill="rgba(255,255,255,0.15)" />
      {/* Input: Password */}
      <rect
        x="42"
        y="132"
        width="216"
        height="28"
        rx="10"
        fill="rgba(255,255,255,0.05)"
        stroke="rgba(255,255,255,0.1)"
        strokeWidth="1"
      />
      <circle cx="60" cy="146" r="6" fill={`${accent}50`} />
      <rect x="72" y="142" width="60" height="8" rx="4" fill="rgba(255,255,255,0.1)" />
      {/* Button */}
      <rect x="42" y="170" width="216" height="24" rx="12" fill={accent} />
      <rect x="100" y="178" width="100" height="8" rx="4" fill="rgba(255,255,255,0.55)" />
    </svg>
  )
}

function LettersVisual({ accent }: { accent: string }) {
  const rows = [
    { y: 62, status: '#22c55e', w: 48, label: 'ВЫПОЛНЕНО' },
    { y: 97, status: '#f59e0b', w: 80, label: 'НА РАССМ.' },
    { y: 132, status: '#3b82f6', w: 56, label: 'ПОЛУЧЕНО' },
    { y: 167, status: '#6366f1', w: 48, label: 'ЧЕРНОВИК' },
  ]
  return (
    <svg viewBox="0 0 300 210" fill="none" className="mx-auto w-full max-w-xs lg:max-w-sm">
      <rect
        x="30"
        y="10"
        width="240"
        height="190"
        rx="18"
        fill="rgba(18,28,43,0.9)"
        stroke={`${accent}35`}
        strokeWidth="1.5"
      />
      {/* Header */}
      <rect x="30" y="10" width="240" height="44" rx="18" fill={`${accent}18`} />
      <rect x="30" y="36" width="240" height="18" fill={`${accent}18`} />
      <rect x="42" y="22" width="52" height="8" rx="4" fill="rgba(255,255,255,0.7)" />
      <rect x="42" y="34" width="80" height="6" rx="3" fill="rgba(255,255,255,0.2)" />
      {/* New button */}
      <rect x="218" y="20" width="40" height="18" rx="9" fill={accent} />
      <rect x="229" y="26" width="18" height="6" rx="3" fill="rgba(255,255,255,0.6)" />
      {/* Letter rows */}
      {rows.map(({ y, status, w }) => (
        <g key={y}>
          <rect
            x="42"
            y={y}
            width="216"
            height="26"
            rx="10"
            fill="rgba(255,255,255,0.04)"
            stroke="rgba(255,255,255,0.07)"
            strokeWidth="1"
          />
          <circle cx="56" cy={y + 13} r="5" fill="rgba(255,255,255,0.12)" />
          <rect x="66" y={y + 9} width="88" height="8" rx="4" fill="rgba(255,255,255,0.2)" />
          <rect
            x={240 - w}
            y={y + 8}
            width={w}
            height="10"
            rx="5"
            fill={`${status}30`}
            stroke={`${status}50`}
            strokeWidth="1"
          />
          <rect
            x={244 - w}
            y={y + 11}
            width={w - 8}
            height="4"
            rx="2"
            fill={status}
            opacity="0.7"
          />
        </g>
      ))}
    </svg>
  )
}

function RequestsVisual({ accent }: { accent: string }) {
  const stages = [
    { x: 42, color: '#6366f1', label: 'НОВАЯ' },
    { x: 105, color: '#f59e0b', label: 'В РАБОТЕ' },
    { x: 178, color: '#22c55e', label: 'ГОТОВО' },
  ]
  return (
    <svg viewBox="0 0 300 210" fill="none" className="mx-auto w-full max-w-xs lg:max-w-sm">
      <rect
        x="30"
        y="10"
        width="240"
        height="190"
        rx="18"
        fill="rgba(18,28,43,0.9)"
        stroke={`${accent}35`}
        strokeWidth="1.5"
      />
      <rect x="30" y="10" width="240" height="44" rx="18" fill={`${accent}18`} />
      <rect x="30" y="36" width="240" height="18" fill={`${accent}18`} />
      <rect x="42" y="22" width="64" height="8" rx="4" fill="rgba(255,255,255,0.7)" />
      {/* Stage columns */}
      {stages.map(({ x, color }) => (
        <g key={x}>
          <rect
            x={x}
            y="62"
            width="50"
            height="14"
            rx="7"
            fill={`${color}25`}
            stroke={`${color}40`}
            strokeWidth="1"
          />
          <rect x={x + 6} y="67" width="32" height="4" rx="2" fill={color} opacity="0.6" />
          {/* Cards in column */}
          <rect
            x={x}
            y="84"
            width="50"
            height="34"
            rx="8"
            fill="rgba(255,255,255,0.05)"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="1"
          />
          <rect x={x + 6} y="90" width="36" height="6" rx="3" fill="rgba(255,255,255,0.2)" />
          <rect x={x + 6} y="100" width="28" height="5" rx="2.5" fill="rgba(255,255,255,0.1)" />
          <rect x={x + 6} y="108" width="22" height="5" rx="2.5" fill={`${color}50`} />
          <rect
            x={x}
            y="126"
            width="50"
            height="28"
            rx="8"
            fill="rgba(255,255,255,0.03)"
            stroke="rgba(255,255,255,0.07)"
            strokeWidth="1"
          />
          <rect x={x + 6} y="132" width="30" height="5" rx="2.5" fill="rgba(255,255,255,0.12)" />
          <rect x={x + 6} y="141" width="20" height="5" rx="2.5" fill="rgba(255,255,255,0.07)" />
        </g>
      ))}
      {/* Arrows between columns */}
      <path
        d="M94 96 L103 96"
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="1.5"
        strokeDasharray="2 2"
      />
      <path
        d="M101 93 L104 96 L101 99"
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M157 96 L175 96"
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="1.5"
        strokeDasharray="2 2"
      />
      <path
        d="M173 93 L176 96 L173 99"
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Tags */}
      <rect
        x="42"
        y="164"
        width="32"
        height="12"
        rx="6"
        fill={`${accent}20`}
        stroke={`${accent}40`}
        strokeWidth="1"
      />
      <rect
        x="80"
        y="164"
        width="40"
        height="12"
        rx="6"
        fill="rgba(139,92,246,0.2)"
        stroke="rgba(139,92,246,0.4)"
        strokeWidth="1"
      />
      <rect
        x="126"
        y="164"
        width="36"
        height="12"
        rx="6"
        fill="rgba(245,158,11,0.2)"
        stroke="rgba(245,158,11,0.4)"
        strokeWidth="1"
      />
    </svg>
  )
}

function AnalyticsVisual({ accent }: { accent: string }) {
  const bars = [
    { h: 50, x: 50, color: '#3b82f6' },
    { h: 80, x: 90, color: '#14b8a6' },
    { h: 40, x: 130, color: '#8b5cf6' },
    { h: 95, x: 170, color: '#14b8a6' },
    { h: 65, x: 210, color: '#f59e0b' },
  ]
  return (
    <svg viewBox="0 0 300 210" fill="none" className="mx-auto w-full max-w-xs lg:max-w-sm">
      <rect
        x="30"
        y="10"
        width="240"
        height="190"
        rx="18"
        fill="rgba(18,28,43,0.9)"
        stroke={`${accent}35`}
        strokeWidth="1.5"
      />
      <rect x="30" y="10" width="240" height="44" rx="18" fill={`${accent}18`} />
      <rect x="30" y="36" width="240" height="18" fill={`${accent}18`} />
      <rect x="42" y="21" width="72" height="8" rx="4" fill="rgba(255,255,255,0.7)" />
      {/* Stats row */}
      {[
        { x: 42, v: '156', sub: 'Писем', c: '#14b8a6' },
        { x: 122, v: '43', sub: 'Заявок', c: '#3b82f6' },
        { x: 202, v: '94%', sub: 'KPI', c: '#22c55e' },
      ].map(({ x, v, sub, c }) => (
        <g key={x}>
          <rect
            x={x}
            y="58"
            width="68"
            height="38"
            rx="10"
            fill="rgba(255,255,255,0.04)"
            stroke="rgba(255,255,255,0.07)"
            strokeWidth="1"
          />
          <rect x={x + 8} y="64" width={v.length * 9} height="10" rx="3" fill={c} opacity="0.8" />
          <rect
            x={x + 8}
            y="78"
            width={sub.length * 7}
            height="6"
            rx="3"
            fill="rgba(255,255,255,0.2)"
          />
        </g>
      ))}
      {/* Chart baseline */}
      <line x1="42" y1="170" x2="258" y2="170" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
      {/* Bars */}
      {bars.map(({ h, x, color }) => (
        <g key={x}>
          <rect
            x={x}
            y={170 - h}
            width="28"
            height={h}
            rx="6"
            fill={`${color}30`}
            stroke={`${color}50`}
            strokeWidth="1"
          />
          <rect x={x} y={170 - h} width="28" height="8" rx="6" fill={color} opacity="0.7" />
        </g>
      ))}
      {/* Export button */}
      <rect
        x="172"
        y="182"
        width="86"
        height="12"
        rx="6"
        fill={`${accent}20`}
        stroke={`${accent}40`}
        strokeWidth="1"
      />
      <rect x="185" y="185" width="60" height="6" rx="3" fill={accent} opacity="0.5" />
    </svg>
  )
}

function SettingsVisual({ accent }: { accent: string }) {
  const toggles = [
    { y: 72, on: true, color: '#14b8a6', w: 80 },
    { y: 102, on: false, color: '#6366f1', w: 96 },
    { y: 132, on: true, color: '#f59e0b', w: 72 },
    { y: 162, on: true, color: '#ec4899', w: 88 },
  ]
  return (
    <svg viewBox="0 0 300 210" fill="none" className="mx-auto w-full max-w-xs lg:max-w-sm">
      <rect
        x="30"
        y="10"
        width="240"
        height="190"
        rx="18"
        fill="rgba(18,28,43,0.9)"
        stroke={`${accent}35`}
        strokeWidth="1.5"
      />
      <rect x="30" y="10" width="240" height="44" rx="18" fill={`${accent}18`} />
      <rect x="30" y="36" width="240" height="18" fill={`${accent}18`} />
      {/* Tabs */}
      <rect x="42" y="18" width="56" height="16" rx="8" fill={accent} />
      <rect x="44" y="22" width="52" height="8" rx="4" fill="rgba(255,255,255,0.6)" />
      <rect x="104" y="20" width="48" height="12" rx="6" fill="rgba(255,255,255,0.06)" />
      <rect x="158" y="20" width="52" height="12" rx="6" fill="rgba(255,255,255,0.06)" />
      {/* Theme dots */}
      <circle
        cx="58"
        cy="58"
        r="10"
        fill="#1a2535"
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="1.5"
      />
      <circle cx="82" cy="58" r="10" fill="#f8fafc" stroke="rgba(0,0,0,0.15)" strokeWidth="1.5" />
      <circle
        cx="106"
        cy="58"
        r="10"
        fill="#1e0a3c"
        stroke="rgba(139,92,246,0.5)"
        strokeWidth="1.5"
      />
      <circle cx="106" cy="58" r="5" fill="#8b5cf6" opacity="0.6" />
      {/* Toggle rows */}
      {toggles.map(({ y, on, color, w }) => (
        <g key={y}>
          <rect x="42" y={y} width={w} height="8" rx="4" fill="rgba(255,255,255,0.15)" />
          <rect
            x={on ? '218' : '204'}
            y={y - 2}
            width="36"
            height="12"
            rx="6"
            fill={on ? `${color}30` : 'rgba(255,255,255,0.05)'}
            stroke={on ? `${color}60` : 'rgba(255,255,255,0.1)'}
            strokeWidth="1"
          />
          <circle
            cx={on ? 248 : 218}
            cy={y + 4}
            r="5"
            fill={on ? color : 'rgba(255,255,255,0.3)'}
          />
        </g>
      ))}
    </svg>
  )
}

const STEP_VISUALS = [AuthVisual, LettersVisual, RequestsVisual, AnalyticsVisual, SettingsVisual]

/* ─────────────────────────────────────────────────────────────
   Feature card (3D tilt + cursor glow)
───────────────────────────────────────────────────────────── */
const COLOR_MAP: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  teal: {
    bg: 'rgba(20,184,166,0.1)',
    text: '#2dd4bf',
    border: 'rgba(20,184,166,0.22)',
    glow: 'rgba(20,184,166,0.25)',
  },
  blue: {
    bg: 'rgba(59,130,246,0.1)',
    text: '#60a5fa',
    border: 'rgba(59,130,246,0.22)',
    glow: 'rgba(59,130,246,0.25)',
  },
  amber: {
    bg: 'rgba(245,158,11,0.1)',
    text: '#fbbf24',
    border: 'rgba(245,158,11,0.22)',
    glow: 'rgba(245,158,11,0.25)',
  },
  purple: {
    bg: 'rgba(139,92,246,0.1)',
    text: '#a78bfa',
    border: 'rgba(139,92,246,0.22)',
    glow: 'rgba(139,92,246,0.25)',
  },
  green: {
    bg: 'rgba(34,197,94,0.1)',
    text: '#4ade80',
    border: 'rgba(34,197,94,0.22)',
    glow: 'rgba(34,197,94,0.25)',
  },
  rose: {
    bg: 'rgba(244,63,94,0.1)',
    text: '#fb7185',
    border: 'rgba(244,63,94,0.22)',
    glow: 'rgba(244,63,94,0.25)',
  },
}

function FeatureCard({
  Icon,
  title,
  desc,
  color,
  inView,
  delay,
}: {
  Icon: React.ElementType
  title: string
  desc: string
  color: string
  inView: boolean
  delay: number
}) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [mouse, setMouse] = useState({ x: 0, y: 0 })
  const [hovered, setHovered] = useState(false)
  const c = COLOR_MAP[color] || COLOR_MAP.teal

  const onMove = (e: React.MouseEvent) => {
    const el = cardRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const px = e.clientX - r.left
    const py = e.clientY - r.top
    setMouse({ x: px, y: py })
    const rx = (px / r.width - 0.5) * 16
    const ry = (py / r.height - 0.5) * -16
    el.style.transform = `perspective(900px) rotateY(${rx}deg) rotateX(${ry}deg) translateZ(12px)`
  }

  const onLeave = () => {
    setHovered(false)
    if (cardRef.current)
      cardRef.current.style.transform =
        'perspective(900px) rotateY(0deg) rotateX(0deg) translateZ(0)'
  }

  return (
    <div
      ref={cardRef}
      onMouseMove={onMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={onLeave}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0)' : 'translateY(40px)',
        transition: `opacity 0.65s ease ${delay}ms, transform 0.65s cubic-bezier(0.34,1.56,0.64,1) ${delay}ms`,
        willChange: 'transform',
        border: `1px solid ${c.border}`,
      }}
      className="relative cursor-default overflow-hidden rounded-2xl bg-slate-800/55 p-6 backdrop-blur-sm"
    >
      {/* Cursor-tracked glow */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 'inherit',
          pointerEvents: 'none',
          opacity: hovered ? 1 : 0,
          transition: 'opacity 0.3s ease',
          background: `radial-gradient(280px circle at ${mouse.x}px ${mouse.y}px, ${c.glow}, transparent 60%)`,
        }}
      />
      {/* Icon */}
      <div
        className="mb-4 inline-flex items-center justify-center rounded-xl p-3"
        style={{ background: c.bg }}
      >
        <Icon className="h-6 w-6" style={{ color: c.text }} />
      </div>
      <h3 className="mb-2 text-lg font-semibold text-white">{title}</h3>
      <p className="text-sm leading-relaxed text-slate-400">{desc}</p>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   Floating envelope (hero parallax)
───────────────────────────────────────────────────────────── */
function FloatEnv({
  x,
  y,
  size,
  delay,
  dur,
  rot,
  op,
}: {
  x: string
  y: string
  size: number
  delay: number
  dur: number
  rot: number
  op: number
}) {
  return (
    <div
      style={
        {
          position: 'absolute',
          left: x,
          top: y,
          width: size,
          height: size,
          opacity: op,
          animation: `float-env ${dur}s ease-in-out infinite`,
          animationDelay: `${delay}s`,
          '--rot': `${rot}deg`,
        } as React.CSSProperties
      }
      className="pointer-events-none select-none text-teal-400"
    >
      <svg viewBox="0 0 40 30" fill="none" className="h-full w-full">
        <rect
          x="2"
          y="8"
          width="36"
          height="20"
          rx="3"
          stroke="currentColor"
          strokeWidth="1.5"
          fill="currentColor"
          fillOpacity="0.05"
        />
        <path
          d="M2 11 L20 22 L38 11"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M2 8 L20 3 L38 8"
          fill="currentColor"
          fillOpacity="0.12"
          stroke="currentColor"
          strokeWidth="1"
        />
      </svg>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   Main page
───────────────────────────────────────────────────────────── */
export default function HelpPage() {
  const scrollY = useScrollY()

  /* ── Slider state ── */
  const [activeSlide, setActiveSlide] = useState(0)
  const activeRef = useRef(0)
  const [visible, setVisible] = useState(true)

  const goTo = useCallback((idx: number) => {
    if (idx === activeRef.current) return
    setVisible(false)
    setTimeout(() => {
      setActiveSlide(idx)
      activeRef.current = idx
      setVisible(true)
    }, 280)
  }, [])

  // Auto-advance every 7 s
  useEffect(() => {
    const t = setInterval(() => goTo((activeRef.current + 1) % STEPS.length), 7000)
    return () => clearInterval(t)
  }, [goTo])

  // Arrow-key navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'ArrowLeft') goTo(Math.max(0, activeRef.current - 1))
      if (e.key === 'ArrowRight') goTo(Math.min(STEPS.length - 1, activeRef.current + 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goTo])

  /* ── Tip accordion ── */
  const [openTip, setOpenTip] = useState<number | null>(null)

  /* ── InView refs ── */
  const [featRef, featInView] = useInView()
  const [shortRef, shortInView] = useInView()
  const [tipsRef, tipsInView] = useInView()

  const step = STEPS[activeSlide]
  const VisualComp = STEP_VISUALS[activeSlide]

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />

      <main className="min-h-screen">
        {/* ════════════════════════════════════════
            HERO
        ════════════════════════════════════════ */}
        <section className="relative flex min-h-[88vh] flex-col justify-center overflow-hidden">
          {/* Parallax background blobs */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{ transform: `translateY(${scrollY * 0.2}px)` }}
            aria-hidden
          >
            <div className="absolute inset-0 overflow-hidden">
              <div
                style={{
                  position: 'absolute',
                  width: 700,
                  height: 700,
                  borderRadius: '50%',
                  left: '-15%',
                  top: '-20%',
                  background: 'radial-gradient(circle, rgba(20,184,166,0.14) 0%, transparent 65%)',
                  animation: 'hero-blob 18s ease-in-out infinite',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  width: 600,
                  height: 600,
                  borderRadius: '50%',
                  right: '-10%',
                  top: '5%',
                  background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 65%)',
                  animation: 'hero-blob 22s ease-in-out infinite',
                  animationDelay: '-7s',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  width: 500,
                  height: 500,
                  borderRadius: '50%',
                  left: '35%',
                  bottom: '-15%',
                  background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 65%)',
                  animation: 'hero-blob 26s ease-in-out infinite',
                  animationDelay: '-14s',
                }}
              />
            </div>
            {/* Floating envelopes */}
            <FloatEnv x="5%" y="10%" size={64} delay={0} dur={8} rot={-12} op={0.18} />
            <FloatEnv x="85%" y="8%" size={48} delay={1.2} dur={10} rot={8} op={0.14} />
            <FloatEnv x="12%" y="65%" size={40} delay={2.5} dur={9} rot={-5} op={0.12} />
            <FloatEnv x="78%" y="55%" size={56} delay={0.8} dur={11} rot={14} op={0.15} />
            <FloatEnv x="45%" y="80%" size={36} delay={3.1} dur={7} rot={-18} op={0.1} />
            <FloatEnv x="92%" y="75%" size={44} delay={1.7} dur={13} rot={6} op={0.13} />
            <FloatEnv x="25%" y="25%" size={32} delay={4} dur={9} rot={20} op={0.09} />
          </div>

          {/* Content */}
          <div
            className="relative z-10 mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8"
            style={{ transform: `translateY(${scrollY * 0.08}px)` }}
          >
            {/* Back link */}
            <div className="mb-10 pt-6">
              <Link
                href="/"
                className="group inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-white"
              >
                <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                На главную
              </Link>
            </div>

            <div className="text-center">
              {/* Badge */}
              <div
                className="mb-6 inline-flex items-center gap-2 rounded-full border border-teal-400/25 bg-teal-400/10 px-4 py-2 text-sm text-teal-300"
                style={{ animation: 'badge-pulse 3s ease-in-out infinite' }}
              >
                <BookOpen className="h-4 w-4" />
                Документация системы
              </div>

              {/* Title */}
              <h1
                className="mb-6 text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl"
                style={{
                  background:
                    'linear-gradient(135deg, #e2e8f0 0%, #94a3b8 30%, #2dd4bf 60%, #60a5fa 100%)',
                  backgroundSize: '200% 200%',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  animation: 'grad-shift 6s ease-in-out infinite',
                }}
              >
                Руководство
                <br />
                пользователя
              </h1>

              {/* Subtitle */}
              <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-slate-400 sm:text-xl">
                Полное руководство по работе в системе управления письмами и документами{' '}
                <span className="font-medium text-teal-400">DMED Letters</span>
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Link
                  href="/letters"
                  className="inline-flex items-center gap-2 rounded-xl bg-teal-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-500/30 transition-all hover:-translate-y-0.5 hover:bg-teal-400 hover:shadow-teal-400/40"
                >
                  <Mail className="h-4 w-4" />
                  Начать работу
                </Link>
                <a
                  href="#steps"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-600 bg-slate-800/60 px-6 py-3 text-sm font-semibold text-slate-300 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-slate-500 hover:text-white"
                >
                  Пошаговый гайд
                  <ChevronDown className="h-4 w-4" />
                </a>
              </div>

              {/* Stats strip */}
              <div className="mt-14 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                  { val: '5', label: 'Разделов системы', color: '#2dd4bf' },
                  { val: '3', label: 'Роли доступа', color: '#60a5fa' },
                  { val: '8+', label: 'Горячих клавиш', color: '#a78bfa' },
                  { val: '2', label: 'Формата экспорта', color: '#fbbf24' },
                ].map(({ val, label, color }, i) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-4 backdrop-blur-sm"
                    style={{ animation: `count-up 0.6s ease ${i * 120}ms both` }}
                  >
                    <div className="text-3xl font-bold" style={{ color }}>
                      {val}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Scroll cue */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce text-slate-500">
            <ChevronDown className="h-6 w-6" />
          </div>
        </section>

        {/* ════════════════════════════════════════
            STEP SLIDER
        ════════════════════════════════════════ */}
        <section id="steps" className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1200px]">
            {/* Section header */}
            <div className="mb-12 text-center">
              <p className="mb-3 text-sm font-medium uppercase tracking-widest text-teal-400">
                Пошаговый гайд
              </p>
              <h2 className="text-3xl font-bold text-white sm:text-4xl">Как работать в системе</h2>
            </div>

            {/* Slider card */}
            <div className="overflow-hidden rounded-3xl border border-slate-700/50 bg-slate-800/40 backdrop-blur-sm">
              {/* Progress bar */}
              <div className="relative h-1 bg-slate-700/50">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-teal-500 to-teal-300 shadow-[0_0_8px_rgba(20,184,166,0.6)] transition-all duration-500"
                  style={{ width: `${((activeSlide + 1) / STEPS.length) * 100}%` }}
                />
              </div>

              <div className="grid grid-cols-1 gap-0 lg:grid-cols-2">
                {/* Left: text */}
                <div className="flex flex-col justify-center p-8 lg:p-12">
                  <div
                    style={{
                      opacity: visible ? 1 : 0,
                      transform: visible ? 'translateY(0)' : 'translateY(14px)',
                      transition: 'opacity 0.28s ease, transform 0.28s ease',
                    }}
                  >
                    {/* Step number + accent */}
                    <div className="mb-4 flex items-center gap-3">
                      <span
                        className="text-5xl font-black tabular-nums leading-none"
                        style={{ color: step.accent, opacity: 0.25 }}
                      >
                        {step.num}
                      </span>
                      <div
                        className="h-px flex-1"
                        style={{
                          background: `linear-gradient(to right, ${step.accent}40, transparent)`,
                        }}
                      />
                    </div>

                    {/* Title */}
                    <h3 className="mb-1 text-2xl font-bold text-white sm:text-3xl">{step.title}</h3>
                    <p className="mb-4 text-sm font-medium" style={{ color: step.accent }}>
                      {step.subtitle}
                    </p>

                    {/* Description */}
                    <p className="mb-6 leading-relaxed text-slate-400">{step.desc}</p>

                    {/* Points */}
                    <ul className="space-y-3">
                      {step.points.map((pt, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <CheckCircle
                            className="mt-0.5 h-4 w-4 shrink-0"
                            style={{ color: step.accent }}
                          />
                          <span className="text-sm text-slate-300">{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Right: visual */}
                <div
                  className="flex items-center justify-center border-t border-slate-700/40 p-8 lg:border-l lg:border-t-0 lg:p-12"
                  style={{
                    background: `radial-gradient(ellipse 80% 80% at 50% 50%, ${step.accent}08, transparent 70%)`,
                  }}
                >
                  <div
                    style={{
                      opacity: visible ? 1 : 0,
                      transform: visible ? 'scale(1)' : 'scale(0.92)',
                      transition:
                        'opacity 0.35s ease, transform 0.35s cubic-bezier(0.34,1.56,0.64,1)',
                    }}
                    className="w-full"
                  >
                    <VisualComp accent={step.accent} />
                  </div>
                </div>
              </div>

              {/* Navigation footer */}
              <div className="flex items-center justify-between border-t border-slate-700/40 px-8 py-5">
                {/* Dot indicators */}
                <div className="flex items-center gap-2">
                  {STEPS.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => goTo(i)}
                      title={s.title}
                      className="transition-all duration-300 focus:outline-none"
                      style={{
                        width: i === activeSlide ? 24 : 8,
                        height: 8,
                        borderRadius: 4,
                        background: i === activeSlide ? step.accent : 'rgba(148,163,184,0.25)',
                        boxShadow: i === activeSlide ? `0 0 8px ${step.accent}60` : 'none',
                      }}
                      aria-label={s.title}
                    />
                  ))}
                </div>

                {/* Prev / Next */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => goTo(Math.max(0, activeSlide - 1))}
                    disabled={activeSlide === 0}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700 bg-slate-800/60 text-slate-400 transition-all hover:border-slate-500 hover:text-white disabled:opacity-30"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => goTo(Math.min(STEPS.length - 1, activeSlide + 1))}
                    disabled={activeSlide === STEPS.length - 1}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700 bg-slate-800/60 text-slate-400 transition-all hover:border-slate-500 hover:text-white disabled:opacity-30"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Step pills (quick nav) */}
            <div className="mt-6 hidden flex-wrap justify-center gap-2 sm:flex">
              {STEPS.map((s, i) => {
                const StepIcon = s.Icon
                return (
                  <button
                    key={i}
                    onClick={() => goTo(i)}
                    className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-all"
                    style={{
                      borderColor: i === activeSlide ? `${s.accent}50` : 'rgba(71,85,105,0.4)',
                      background: i === activeSlide ? `${s.accent}15` : 'transparent',
                      color: i === activeSlide ? s.accent : '#94a3b8',
                    }}
                  >
                    <StepIcon className="h-3.5 w-3.5" />
                    {s.title}
                  </button>
                )
              })}
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════
            FEATURES GRID
        ════════════════════════════════════════ */}
        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1200px]">
            <div className="mb-12 text-center">
              <p className="mb-3 text-sm font-medium uppercase tracking-widest text-teal-400">
                Возможности
              </p>
              <h2 className="text-3xl font-bold text-white sm:text-4xl">Всё что вам нужно</h2>
              <p className="mx-auto mt-4 max-w-xl text-slate-400">
                Система включает полный набор инструментов для управления документооборотом
              </p>
            </div>

            <div ref={featRef} className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f, i) => (
                <FeatureCard key={i} {...f} inView={featInView} delay={i * 90} />
              ))}
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════
            KEYBOARD SHORTCUTS
        ════════════════════════════════════════ */}
        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1200px]">
            <div className="mb-12 text-center">
              <p className="mb-3 text-sm font-medium uppercase tracking-widest text-teal-400">
                Продуктивность
              </p>
              <h2 className="text-3xl font-bold text-white sm:text-4xl">Горячие клавиши</h2>
              <p className="mx-auto mt-4 max-w-lg text-slate-400">
                Выполняйте ключевые действия без мыши — работайте в 2× быстрее
              </p>
            </div>

            <div
              ref={shortRef}
              className="overflow-hidden rounded-3xl border border-slate-700/50 bg-slate-800/40 backdrop-blur-sm"
            >
              {/* Grid header */}
              <div className="grid grid-cols-2 border-b border-slate-700/40 bg-slate-900/30 px-6 py-3 text-xs font-medium uppercase tracking-wider text-slate-500 sm:grid-cols-4">
                <span>Клавиши</span>
                <span>Действие</span>
                <span className="hidden sm:block">Клавиши</span>
                <span className="hidden sm:block">Действие</span>
              </div>

              <div className="grid grid-cols-1 divide-y divide-slate-700/30 sm:grid-cols-2 sm:divide-y-0">
                {SHORTCUTS.map(({ keys, label }, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-slate-700/20"
                    style={{
                      opacity: shortInView ? 1 : 0,
                      transform: shortInView ? 'translateX(0)' : 'translateX(-20px)',
                      transition: `opacity 0.5s ease ${i * 60}ms, transform 0.5s ease ${i * 60}ms`,
                      borderBottom:
                        i < SHORTCUTS.length - 2 ? '1px solid rgba(71,85,105,0.2)' : undefined,
                    }}
                  >
                    <div className="flex shrink-0 items-center gap-1.5">
                      {keys.map((k, j) => (
                        <span key={j}>
                          <kbd className="inline-flex items-center justify-center rounded-md border border-slate-600 bg-slate-700/80 px-2 py-1 font-mono text-xs font-medium text-slate-300 shadow-sm">
                            {k}
                          </kbd>
                          {j < keys.length - 1 && (
                            <span className="mx-1 text-xs text-slate-600">+</span>
                          )}
                        </span>
                      ))}
                    </div>
                    <span className="text-sm text-slate-400">{label}</span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <div className="border-t border-slate-700/40 px-6 py-4 text-center">
                <p className="text-sm text-slate-500">
                  Нажмите{' '}
                  <kbd className="mx-1 rounded border border-slate-600 bg-slate-700/80 px-1.5 py-0.5 font-mono text-xs text-slate-300">
                    ?
                  </kbd>{' '}
                  в любом месте системы для просмотра всех комбинаций
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════
            TIPS / FAQ
        ════════════════════════════════════════ */}
        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[900px]">
            <div className="mb-12 text-center">
              <p className="mb-3 text-sm font-medium uppercase tracking-widest text-teal-400">
                Частые вопросы
              </p>
              <h2 className="text-3xl font-bold text-white sm:text-4xl">Советы и подсказки</h2>
            </div>

            <div ref={tipsRef} className="space-y-3">
              {TIPS.map(({ q, a }, i) => (
                <div
                  key={i}
                  className="overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-800/40 backdrop-blur-sm"
                  style={{
                    opacity: tipsInView ? 1 : 0,
                    transform: tipsInView ? 'translateY(0)' : 'translateY(24px)',
                    transition: `opacity 0.6s ease ${i * 80}ms, transform 0.6s ease ${i * 80}ms`,
                  }}
                >
                  <button
                    onClick={() => setOpenTip(openTip === i ? null : i)}
                    className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-slate-700/20"
                  >
                    <span className="font-medium text-white">{q}</span>
                    <ChevronDown
                      className="h-4 w-4 shrink-0 text-slate-400 transition-transform duration-300"
                      style={{ transform: openTip === i ? 'rotate(180deg)' : 'rotate(0deg)' }}
                    />
                  </button>
                  <div
                    style={{
                      maxHeight: openTip === i ? 200 : 0,
                      opacity: openTip === i ? 1 : 0,
                      overflow: 'hidden',
                      transition: 'max-height 0.35s cubic-bezier(0.4,0,0.2,1), opacity 0.25s ease',
                    }}
                  >
                    <p className="border-t border-slate-700/40 px-6 py-4 text-sm leading-relaxed text-slate-400">
                      {a}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════
            FOOTER CTA
        ════════════════════════════════════════ */}
        <section className="px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[800px] text-center">
            <div
              className="relative overflow-hidden rounded-3xl border border-teal-500/20 p-10 sm:p-14"
              style={{
                background:
                  'radial-gradient(ellipse 120% 120% at 50% 50%, rgba(20,184,166,0.12) 0%, rgba(18,28,43,0.8) 60%)',
              }}
            >
              {/* Decorative corner glows */}
              <div className="pointer-events-none absolute -left-10 -top-10 h-48 w-48 rounded-full bg-teal-500/10 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-10 -right-10 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl" />

              <div className="relative">
                <div className="mb-4 inline-flex items-center justify-center rounded-2xl border border-teal-400/20 bg-teal-400/10 p-4">
                  <Mail className="h-8 w-8 text-teal-400" />
                </div>
                <h2 className="mb-4 text-3xl font-bold text-white sm:text-4xl">Готовы начать?</h2>
                <p className="mb-8 text-slate-400">
                  Теперь вы знаете всё необходимое для эффективной работы в системе.
                  <br className="hidden sm:block" />
                  Переходите к письмам и заявкам прямо сейчас.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-4">
                  <Link
                    href="/letters"
                    className="inline-flex items-center gap-2 rounded-xl bg-teal-500 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-teal-500/30 transition-all hover:-translate-y-0.5 hover:bg-teal-400 hover:shadow-teal-400/40"
                  >
                    <Mail className="h-4 w-4" />
                    Перейти к письмам
                  </Link>
                  <Link
                    href="/requests"
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-600 bg-slate-800/60 px-8 py-3.5 text-sm font-semibold text-slate-300 transition-all hover:-translate-y-0.5 hover:border-slate-500 hover:text-white"
                  >
                    <ClipboardList className="h-4 w-4" />
                    Перейти к заявкам
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  )
}
