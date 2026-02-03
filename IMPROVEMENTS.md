# План улучшений DMED Letters

> **Статус:** Фаза 1-3 выполнены. Ниже описаны выполненные изменения и план дальнейших улучшений.

## Выполненные улучшения

### Фаза 1: Быстрые победы (ВЫПОЛНЕНО)

1. **Удалены дубликаты хуков:**
   - Удалён `use-debounce.ts` (оставлен `useDebounce.ts`)
   - Удалён `use-keyboard-shortcuts.ts` (оставлен `useKeyboardShortcuts.ts`)
   - Переименованы хуки в camelCase: `useDashboard.ts`, `useLetterSearch.ts`, `useLetterTemplates.ts`
   - Обновлены импорты в компонентах

2. **Улучшен ErrorBoundary:**
   - Добавлены `onError` и `onReset` callbacks
   - Создан `PageErrorBoundary` для страниц
   - Создан `SectionErrorBoundary` для секций

3. **Создана система стандартизации ошибок:**
   - `src/lib/errors/app-error.ts` - AppError класс с factory методами
   - `src/lib/errors/api-handler.ts` - withErrorHandler, handleApiError
   - Поддержка Zod, tRPC и Prisma ошибок

### Фаза 2: Исправления (ВЫПОЛНЕНО)

4. **Исправлены TODO в коде:**
   - `src/server/trpc.ts` - добавлена проверка permissions через `requirePermission`
   - `src/services/file.service.ts` - добавлена проверка прав на удаление файлов
   - `src/server/routers/requests.ts` - добавлены уведомления админам
   - `src/lib/notifications.ts` - добавлена функция `sendNotification`

5. **Рефакторинг utils.ts:**
   - Разбит на модули: `cn.ts`, `status.ts`, `date.ts`, `format.ts`, `export.ts`
   - Сохранена обратная совместимость через реэкспорт

### Фаза 3: Инфраструктура (ВЫПОЛНЕНО)

6. **Создан cache manager:**
   - `src/lib/cache-manager.ts` с методами `onLetterChange`, `onUserChange`, etc.
   - Query keys для React Query

7. **Добавлены тесты:**
   - `src/app/api/__tests__/test-utils.ts` - утилиты для тестирования
   - `src/app/api/__tests__/letters.test.ts` - тесты Letters API
   - `src/app/api/__tests__/errors.test.ts` - тесты системы ошибок

---

## Содержание (план дальнейших улучшений)

1. [Тестовое покрытие](#1-тестовое-покрытие)
2. [Унификация хуков](#2-унификация-хуков)
3. [TODO из кода](#3-todo-из-кода)
4. [Рефакторинг больших файлов](#4-рефакторинг-больших-файлов)
5. [Error Boundaries](#5-error-boundaries)
6. [Стратегия кэширования](#6-стратегия-кэширования)
7. [Стандартизация обработки ошибок](#7-стандартизация-обработки-ошибок)
8. [Миграция REST -> tRPC](#8-миграция-rest---trpc)

---

## 1. Тестовое покрытие

### Текущее состояние
- **5 тестовых файлов** в `src/lib/__tests__/`
- Порог покрытия: **50%** (branches, functions, lines, statements)
- Отсутствуют тесты для: API routes, компонентов, сервисов, хуков

### План действий

#### Фаза 1: Критические тесты (Неделя 1-2)

**1.1 Тесты API routes (приоритет: высокий)**

Создать файлы:
```
src/app/api/__tests__/
├── letters.test.ts          # CRUD операции с письмами
├── requests.test.ts         # CRUD операции с заявками
├── users.test.ts            # Управление пользователями
├── auth.test.ts             # Авторизация
└── notifications.test.ts    # Уведомления
```

Пример теста для letters API:
```typescript
// src/app/api/__tests__/letters.test.ts
import { createMocks } from 'node-mocks-http'
import { GET, POST, PATCH, DELETE } from '../letters/route'
import { prisma } from '@/lib/prisma'

jest.mock('@/lib/prisma')
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(() => ({
    user: { id: '1', role: 'ADMIN' }
  }))
}))

describe('Letters API', () => {
  describe('GET /api/letters', () => {
    it('returns paginated letters', async () => {
      const { req } = createMocks({ method: 'GET' })
      const response = await GET(req)
      expect(response.status).toBe(200)
    })

    it('filters by status', async () => {
      const { req } = createMocks({
        method: 'GET',
        query: { status: 'IN_PROGRESS' }
      })
      const response = await GET(req)
      expect(response.status).toBe(200)
    })

    it('returns 401 for unauthorized', async () => {
      // Mock no session
      const { req } = createMocks({ method: 'GET' })
      const response = await GET(req)
      expect(response.status).toBe(401)
    })
  })

  describe('POST /api/letters', () => {
    it('creates letter with valid data', async () => {
      const { req } = createMocks({
        method: 'POST',
        body: { number: 'TEST-001', org: 'Test Org' }
      })
      const response = await POST(req)
      expect(response.status).toBe(201)
    })

    it('validates required fields', async () => {
      const { req } = createMocks({
        method: 'POST',
        body: {}
      })
      const response = await POST(req)
      expect(response.status).toBe(400)
    })
  })
})
```

**1.2 Тесты сервисов (приоритет: высокий)**

Создать файлы:
```
src/services/__tests__/
├── letter.service.test.ts
├── user.service.test.ts
├── file.service.test.ts
└── notification.service.test.ts
```

**1.3 Тесты бизнес-логики (приоритет: средний)**

```
src/lib/__tests__/
├── letter-analytics.test.ts
├── dashboard.test.ts
├── google-sheets.test.ts    # Integration tests
└── notification-dispatcher.test.ts
```

#### Фаза 2: Компонентные тесты (Неделя 3-4)

Создать файлы:
```
src/components/__tests__/
├── LetterForm.test.tsx
├── LettersTable.test.tsx
├── StatusBadge.test.tsx
├── AdvancedLetterSearch.test.tsx
├── CommandPalette.test.tsx
└── ConfirmDialog.test.tsx
```

Пример компонентного теста:
```typescript
// src/components/__tests__/StatusBadge.test.tsx
import { render, screen } from '@testing-library/react'
import { StatusBadge } from '../StatusBadge'

describe('StatusBadge', () => {
  it('renders correct label for IN_PROGRESS', () => {
    render(<StatusBadge status="IN_PROGRESS" />)
    expect(screen.getByText('взято в работу')).toBeInTheDocument()
  })

  it('applies correct color class', () => {
    render(<StatusBadge status="DONE" />)
    expect(screen.getByRole('status')).toHaveClass('bg-teal-500/20')
  })
})
```

#### Фаза 3: E2E тесты (Неделя 5-6)

Установить Playwright:
```bash
npm install -D @playwright/test
npx playwright install
```

Создать тесты:
```
e2e/
├── auth.spec.ts           # Login/logout flows
├── letters.spec.ts        # Letter CRUD
├── requests.spec.ts       # Request management
└── navigation.spec.ts     # Keyboard shortcuts, routing
```

### Целевые метрики
| Метрика | Текущая | Целевая |
|---------|---------|---------|
| Branches | ~50% | 80% |
| Functions | ~50% | 80% |
| Lines | ~50% | 80% |
| Statements | ~50% | 80% |

### Команды

Добавить в `package.json`:
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --ci --coverage --maxWorkers=2",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

---

## 2. Унификация хуков

### Найденные дубликаты

| Файл 1 (сохранить) | Файл 2 (удалить) | Различия |
|-------------------|------------------|----------|
| `useDebounce.ts` | `use-debounce.ts` | useDebounce.ts более полный (271 строка vs 74) |
| `useKeyboardShortcuts.ts` | `use-keyboard-shortcuts.ts` | useKeyboardShortcuts.ts более функциональный |
| `useLetters.ts` | `use-letters.ts` | use-letters.ts имеет letterKeys, useLetters.ts - useDebouncedState |

### План унификации

#### Шаг 1: Объединить useDebounce

Удалить `use-debounce.ts`, оставить `useDebounce.ts` с экспортами:
- `useDebounce<T>()` - debounce значения
- `useDebouncedCallback()` - debounce функции
- `useDebouncedState()` - оба варианта
- `useThrottledCallback()` - throttle функции
- `useDebouncedCallbackWithControl()` - с cancel/flush

#### Шаг 2: Объединить useKeyboardShortcuts

Удалить `use-keyboard-shortcuts.ts`, оставить `useKeyboardShortcuts.ts` с экспортами:
- `useKeyboardShortcuts()` - множественные shortcuts
- `useKeyboardShortcut()` - один shortcut
- `useArrowNavigation()` - навигация стрелками
- `getShortcutDisplay()` - форматирование для UI

#### Шаг 3: Объединить useLetters

Создать единый `useLetters.ts`:
```typescript
// src/hooks/useLetters.ts
'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useDebouncedState } from '@/hooks/useDebounce'
import { SEARCH_DEBOUNCE_MS } from '@/lib/constants'
import { toast } from '@/lib/toast'
import type { LetterStatus } from '@/types/prisma'

// Query keys (из use-letters.ts)
export const letterKeys = {
  all: ['letters'] as const,
  lists: () => [...letterKeys.all, 'list'] as const,
  list: (filters: LetterFilters) => [...letterKeys.lists(), filters] as const,
  details: () => [...letterKeys.all, 'detail'] as const,
  detail: (id: string) => [...letterKeys.details(), id] as const,
  stats: () => [...letterKeys.all, 'stats'] as const,
}

// Types
export interface Letter { /* ... */ }
export interface LetterFilters { /* ... */ }
export interface LettersResponse { /* ... */ }

// Hooks
export function useLetters(filters: LetterFilters = {}) { /* ... */ }
export function useLetter(id: string | null) { /* ... */ }
export function useLetterSearch() {
  return useDebouncedState('', SEARCH_DEBOUNCE_MS)
}
export function useUpdateLetter() { /* с toast уведомлениями */ }
export function useDeleteLetter() { /* ... */ }
export function useCreateLetter() { /* ... */ }
export function useDuplicateLetter() { /* ... */ }
export function useBulkAction() { /* ... */ }
export function useToggleFavorite() { /* ... */ }
export function useAddComment() { /* ... */ }
```

#### Шаг 4: Обновить импорты

После удаления дубликатов обновить все импорты:

```bash
# Найти все использования
grep -r "from '@/hooks/use-debounce'" src/
grep -r "from '@/hooks/use-keyboard-shortcuts'" src/
grep -r "from '@/hooks/use-letters'" src/
```

Заменить на:
```typescript
import { useDebounce, useDebouncedCallback } from '@/hooks/useDebounce'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useLetters, letterKeys } from '@/hooks/useLetters'
```

### Итоговая структура хуков

```
src/hooks/
├── useDebounce.ts           # Debounce/throttle utilities
├── useKeyboardShortcuts.ts  # Keyboard navigation
├── useLetters.ts            # Letters data management
├── useUsers.ts              # Users data
├── useRequests.ts           # Requests data (если есть)
├── useOptimistic.ts         # Optimistic updates pattern
├── usePagination.ts         # Pagination logic
├── useForm.ts               # Form utilities
├── useToast.tsx             # Toast notifications
├── useFetch.ts              # Generic fetch wrapper
├── useLocalStorage.ts       # LocalStorage state
├── useMediaQuery.ts         # Responsive breakpoints
├── useIsMobile.ts           # Mobile detection
├── useFileUpload.ts         # File upload logic
├── usePushNotifications.ts  # PWA push
├── useServiceWorker.ts      # SW registration
├── usePWA.ts                # PWA utilities
├── useAuthRedirect.ts       # Auth redirects
├── useNotificationSettings.ts
├── useRequestTags.ts
├── useRequestTemplates.ts
├── useBackgroundSync.ts
├── useVirtualList.ts
├── useMobileDrawer.ts
├── useLongPress.ts
├── useSwipe.ts
├── useUserExport.ts
├── useUserImport.ts
├── useWebShare.ts
├── useKeyboard.tsx
├── useUserPreferences.ts
├── use-dashboard.ts          # Переименовать в useDashboard.ts
└── use-letter-search.ts      # Объединить с useLetters.ts
```

---

## 3. TODO из кода

### Найденные TODO

| Файл | Строка | Описание | Приоритет |
|------|--------|----------|-----------|
| `src/server/trpc.ts` | 77 | Добавить проверку через hasPermission | Высокий |
| `src/services/file.service.ts` | 235 | Add proper permission check | Высокий |
| `src/server/routers/requests.ts` | 208 | Отправить уведомления админам | Средний |
| `src/server/routers/requests.ts` | 312 | Отправить уведомления | Средний |
| `src/app/api/vitals/route.ts` | 20 | Интеграция с аналитическими сервисами | Низкий |

### Исправления

#### 3.1 Проверка прав в tRPC (src/server/trpc.ts:77)

```typescript
import { hasPermission, Permission } from '@/lib/permissions'

const hasPermissionMiddleware = (permission: Permission) =>
  middleware(async ({ ctx, next }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({ code: 'UNAUTHORIZED' })
    }

    const userRole = ctx.session.user.role

    if (!hasPermission(userRole, permission)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `Permission denied: ${permission}`
      })
    }

    return next({ ctx })
  })

// Использование
export const managerProcedure = protectedProcedure.use(
  hasPermissionMiddleware('letters:manage')
)
```

#### 3.2 Проверка прав в file.service.ts

```typescript
// src/services/file.service.ts
import { hasPermission } from '@/lib/permissions'

async deleteFile(fileId: string, userId: string, userRole: Role) {
  const file = await prisma.file.findUnique({
    where: { id: fileId },
    include: { letter: { select: { ownerId: true } } }
  })

  if (!file) {
    throw new AppError('FILE_NOT_FOUND', 'File not found')
  }

  // Проверка прав: владелец файла, владелец письма, или администратор
  const isOwner = file.uploadedById === userId
  const isLetterOwner = file.letter?.ownerId === userId
  const isAdmin = hasPermission(userRole, 'files:delete:any')

  if (!isOwner && !isLetterOwner && !isAdmin) {
    throw new AppError('FORBIDDEN', 'Not authorized to delete this file')
  }

  await prisma.file.delete({ where: { id: fileId } })
}
```

#### 3.3 Уведомления админам (src/server/routers/requests.ts:208)

```typescript
// После создания заявки
onSuccess: async (request) => {
  // Получить админов
  const admins = await prisma.user.findMany({
    where: {
      role: { in: ['ADMIN', 'SUPERADMIN'] },
      isActive: true
    },
    select: { id: true }
  })

  // Отправить уведомления
  await Promise.all(admins.map(admin =>
    notificationDispatcher.send({
      userId: admin.id,
      type: 'NEW_REQUEST',
      title: 'Новая заявка',
      message: `Создана заявка #${request.id}`,
      link: `/requests/${request.id}`
    })
  ))
}
```

---

## 4. Рефакторинг больших файлов

### utils.ts (212+ строк)

Разбить на модули:

```
src/lib/utils/
├── index.ts           # Re-exports
├── cn.ts              # className utility
├── status.ts          # STATUS_LABELS, STATUS_COLORS, isDoneStatus
├── date.ts            # formatDate, parseDateValue, addWorkingDays, getDaysUntilDeadline
├── priority.ts        # getPriorityLabel
├── sanitize.ts        # sanitizeInput
├── export.ts          # exportLetterToPdf, downloadCsv
└── pluralize.ts       # pluralizeDays
```

```typescript
// src/lib/utils/index.ts
export { cn } from './cn'
export { STATUS_LABELS, STATUS_COLORS, STATUS_FROM_LABEL, isDoneStatus } from './status'
export { formatDate, parseDateValue, addWorkingDays, getDaysUntilDeadline, getWorkingDaysUntilDeadline } from './date'
export { getPriorityLabel } from './priority'
export { sanitizeInput } from './sanitize'
export { exportLetterToPdf, downloadCsv } from './export'
export { pluralizeDays } from './pluralize'
```

### schemas.ts

Разбить по домену:

```
src/lib/schemas/
├── index.ts
├── letter.schema.ts
├── request.schema.ts
├── user.schema.ts
├── comment.schema.ts
├── file.schema.ts
├── notification.schema.ts
└── common.schema.ts    # Общие схемы (pagination, etc.)
```

---

## 5. Error Boundaries

### Создать компоненты

```typescript
// src/components/ErrorBoundary.tsx
'use client'

import { Component, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { AlertCircle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
    this.props.onError?.(error, errorInfo)

    // Отправить в Sentry
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, { extra: errorInfo })
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-lg font-semibold mb-2">Что-то пошло не так</h2>
          <p className="text-muted-foreground mb-4">
            {this.state.error?.message || 'Произошла непредвиденная ошибка'}
          </p>
          <Button onClick={this.handleReset} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Попробовать снова
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}
```

```typescript
// src/components/PageErrorBoundary.tsx
'use client'

import { ErrorBoundary } from './ErrorBoundary'
import { ReactNode } from 'react'

interface Props {
  children: ReactNode
  pageName?: string
}

export function PageErrorBoundary({ children, pageName }: Props) {
  return (
    <ErrorBoundary
      onError={(error) => {
        console.error(`Error in ${pageName || 'page'}:`, error)
      }}
      fallback={
        <div className="min-h-[400px] flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Ошибка загрузки страницы</h1>
            <p className="text-muted-foreground mb-4">
              Не удалось загрузить {pageName || 'страницу'}
            </p>
            <Button onClick={() => window.location.reload()}>
              Обновить страницу
            </Button>
          </div>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  )
}
```

### Применение

```tsx
// src/app/letters/page.tsx
import { PageErrorBoundary } from '@/components/PageErrorBoundary'
import { LettersTable } from '@/components/letters/LettersTable'

export default function LettersPage() {
  return (
    <PageErrorBoundary pageName="Письма">
      <LettersTable />
    </PageErrorBoundary>
  )
}
```

---

## 6. Стратегия кэширования

### Текущие слои кэша
1. **React Query** - клиентский кэш запросов
2. **In-memory** - JWT токены в middleware
3. **Redis/Upstash** - rate limiting, sessions

### Проблемы
- Нет единой стратегии инвалидации
- Возможна рассинхронизация между слоями

### Решение: Централизованный cache manager

```typescript
// src/lib/cache/cache-manager.ts
import { redis } from './redis'
import { queryClient } from './query-client'

export const CacheKeys = {
  letters: {
    list: (filters?: object) => ['letters', 'list', filters],
    detail: (id: string) => ['letters', 'detail', id],
    stats: () => ['letters', 'stats'],
  },
  users: {
    list: () => ['users', 'list'],
    detail: (id: string) => ['users', 'detail', id],
  },
  requests: {
    list: (filters?: object) => ['requests', 'list', filters],
    detail: (id: string) => ['requests', 'detail', id],
  },
} as const

interface CacheConfig {
  ttl: number          // seconds
  staleTime: number    // milliseconds (React Query)
  gcTime: number       // milliseconds (React Query)
}

export const CacheTTL: Record<string, CacheConfig> = {
  letters: { ttl: 60, staleTime: 30_000, gcTime: 5 * 60_000 },
  users: { ttl: 300, staleTime: 60_000, gcTime: 10 * 60_000 },
  requests: { ttl: 60, staleTime: 30_000, gcTime: 5 * 60_000 },
  stats: { ttl: 120, staleTime: 60_000, gcTime: 5 * 60_000 },
}

export const cacheManager = {
  // Инвалидация по паттерну
  async invalidate(pattern: string | string[]) {
    const patterns = Array.isArray(pattern) ? pattern : [pattern]

    // React Query
    for (const p of patterns) {
      queryClient.invalidateQueries({ queryKey: [p] })
    }

    // Redis (если используется для данных)
    if (redis) {
      for (const p of patterns) {
        const keys = await redis.keys(`cache:${p}:*`)
        if (keys.length > 0) {
          await redis.del(...keys)
        }
      }
    }
  },

  // Инвалидация при изменении письма
  async onLetterChange(letterId: string) {
    await this.invalidate([
      'letters',
      'stats',
      'dashboard',
    ])
  },

  // Инвалидация при изменении пользователя
  async onUserChange(userId: string) {
    await this.invalidate([
      'users',
      'letters', // письма могут зависеть от пользователей
    ])
  },
}
```

### Использование в API

```typescript
// src/app/api/letters/[id]/route.ts
import { cacheManager } from '@/lib/cache/cache-manager'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  // ... update logic ...

  // Инвалидировать связанные кэши
  await cacheManager.onLetterChange(params.id)

  return NextResponse.json(updated)
}
```

---

## 7. Стандартизация обработки ошибок

### Создать единую систему ошибок

```typescript
// src/lib/errors/app-error.ts
export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'
  | 'EXTERNAL_SERVICE_ERROR'

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public statusCode: number = 500,
    public details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'AppError'
  }

  static validation(message: string, details?: Record<string, unknown>) {
    return new AppError('VALIDATION_ERROR', message, 400, details)
  }

  static notFound(resource: string) {
    return new AppError('NOT_FOUND', `${resource} not found`, 404)
  }

  static unauthorized(message = 'Unauthorized') {
    return new AppError('UNAUTHORIZED', message, 401)
  }

  static forbidden(message = 'Access denied') {
    return new AppError('FORBIDDEN', message, 403)
  }

  static conflict(message: string) {
    return new AppError('CONFLICT', message, 409)
  }

  static rateLimited(retryAfter?: number) {
    return new AppError('RATE_LIMITED', 'Too many requests', 429, { retryAfter })
  }

  toJSON() {
    return {
      error: this.code,
      message: this.message,
      ...(this.details && { details: this.details }),
    }
  }
}
```

```typescript
// src/lib/errors/api-handler.ts
import { NextResponse } from 'next/server'
import { AppError } from './app-error'
import { ZodError } from 'zod'
import { TRPCError } from '@trpc/server'

export function handleApiError(error: unknown): NextResponse {
  console.error('API Error:', error)

  if (error instanceof AppError) {
    return NextResponse.json(error.toJSON(), { status: error.statusCode })
  }

  if (error instanceof ZodError) {
    return NextResponse.json({
      error: 'VALIDATION_ERROR',
      message: 'Invalid input',
      details: error.errors,
    }, { status: 400 })
  }

  if (error instanceof TRPCError) {
    const statusMap: Record<string, number> = {
      UNAUTHORIZED: 401,
      FORBIDDEN: 403,
      NOT_FOUND: 404,
      BAD_REQUEST: 400,
      CONFLICT: 409,
      TOO_MANY_REQUESTS: 429,
    }
    return NextResponse.json({
      error: error.code,
      message: error.message,
    }, { status: statusMap[error.code] || 500 })
  }

  // Unknown error
  return NextResponse.json({
    error: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
  }, { status: 500 })
}

// Wrapper для API handlers
export function withErrorHandler<T>(
  handler: (req: Request, context?: T) => Promise<NextResponse>
) {
  return async (req: Request, context?: T): Promise<NextResponse> => {
    try {
      return await handler(req, context)
    } catch (error) {
      return handleApiError(error)
    }
  }
}
```

### Использование

```typescript
// src/app/api/letters/route.ts
import { withErrorHandler } from '@/lib/errors/api-handler'
import { AppError } from '@/lib/errors/app-error'

export const GET = withErrorHandler(async (req) => {
  const session = await getServerSession(authOptions)
  if (!session) {
    throw AppError.unauthorized()
  }

  const letters = await prisma.letter.findMany()
  return NextResponse.json(letters)
})

export const POST = withErrorHandler(async (req) => {
  const body = await req.json()
  const validated = letterSchema.parse(body) // Throws ZodError if invalid

  const existing = await prisma.letter.findUnique({
    where: { number: validated.number }
  })
  if (existing) {
    throw AppError.conflict('Letter with this number already exists')
  }

  const letter = await prisma.letter.create({ data: validated })
  return NextResponse.json(letter, { status: 201 })
})
```

---

## 8. Миграция REST -> tRPC

### Текущее состояние
- **73 REST endpoints** в `/api/`
- **3 tRPC роутера**: letters, users, requests
- Дублирование логики между REST и tRPC

### Рекомендация

**Не мигрировать полностью**, а использовать гибридный подход:

#### Оставить REST для:
- Публичных API (portal, webhooks)
- Файловых операций (upload, download)
- Server Actions
- External integrations

#### Использовать tRPC для:
- Внутренних CRUD операций
- Real-time данных
- Типизированных клиентских запросов

### Добавить недостающие tRPC роутеры

```typescript
// src/server/routers/_app.ts
import { router } from '../trpc'
import { lettersRouter } from './letters'
import { usersRouter } from './users'
import { requestsRouter } from './requests'
import { notificationsRouter } from './notifications'
import { statsRouter } from './stats'
import { templatesRouter } from './templates'

export const appRouter = router({
  letters: lettersRouter,
  users: usersRouter,
  requests: requestsRouter,
  notifications: notificationsRouter,
  stats: statsRouter,
  templates: templatesRouter,
})
```

---

## Приоритеты реализации

| # | Задача | Приоритет | Сложность | Срок |
|---|--------|-----------|-----------|------|
| 1 | Исправить TODO в коде | Высокий | Низкая | 1 день |
| 2 | Унифицировать хуки | Высокий | Средняя | 2 дня |
| 3 | Добавить Error Boundaries | Высокий | Низкая | 1 день |
| 4 | Стандартизировать ошибки | Средний | Средняя | 2 дня |
| 5 | Тесты API routes | Средний | Высокая | 1 неделя |
| 6 | Рефакторинг utils.ts | Низкий | Низкая | 1 день |
| 7 | Централизовать кэширование | Низкий | Средняя | 2 дня |
| 8 | Компонентные тесты | Низкий | Высокая | 2 недели |

---

## Быстрые победы (можно сделать сразу)

1. **Удалить дубликаты хуков** - `use-debounce.ts`, `use-keyboard-shortcuts.ts`
2. **Добавить ErrorBoundary** - один компонент, применить в layout
3. **Исправить TODO в trpc.ts** - интегрировать hasPermission
4. **Создать AppError класс** - стандартизация ошибок

---

## Чек-лист для PR

- [ ] Написаны тесты для нового кода
- [ ] Удалены неиспользуемые импорты
- [ ] Нет TODO без issue
- [ ] Типы экспортированы корректно
- [ ] Error handling стандартизирован
- [ ] Документация обновлена
