// Простой in-memory кэш с TTL
interface CacheEntry<T> {
  data: T
  expiresAt: number
}

class SimpleCache {
  private cache = new Map<string, CacheEntry<unknown>>()
  private defaultTTL = 60 * 1000 // 1 минута по умолчанию

  set<T>(key: string, data: T, ttlMs: number = this.defaultTTL): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
    })
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)

    if (!entry) {
      return null
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  invalidate(key: string): void {
    this.cache.delete(key)
  }

  invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern)
    const keys = Array.from(this.cache.keys())
    keys.forEach((key) => {
      if (regex.test(key)) {
        this.cache.delete(key)
      }
    })
  }

  clear(): void {
    this.cache.clear()
  }

  // Периодическая очистка устаревших записей
  cleanup(): void {
    const now = Date.now()
    const entries = Array.from(this.cache.entries())
    entries.forEach(([key, entry]) => {
      if (now > entry.expiresAt) {
        this.cache.delete(key)
      }
    })
  }
}

// Глобальный экземпляр кэша
export const cache = new SimpleCache()

// TTL константы
export const CACHE_TTL = {
  STATS: 2 * 60 * 1000,      // 2 минуты для статистики
  LETTERS_LIST: 30 * 1000,   // 30 секунд для списка писем
  LETTER_DETAIL: 60 * 1000,  // 1 минута для деталей письма
  USERS: 5 * 60 * 1000,      // 5 минут для списка пользователей
}

// Ключи кэша
export const CACHE_KEYS = {
  STATS: 'stats',
  LETTERS: (params: string) => `letters:${params}`,
  LETTER: (id: string) => `letter:${id}`,
  USERS: 'users',
}
