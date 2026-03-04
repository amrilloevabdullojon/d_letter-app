import { getRedisClient } from '@/lib/redis'

// In-memory cache with optional Redis backing.
interface CacheEntry<T> {
  data: T
  expiresAt: number
}

class SimpleCache {
  private cache = new Map<string, CacheEntry<unknown>>()
  private defaultTTL = 60 * 1000 // 1 minute

  async set<T>(key: string, data: T, ttlMs: number = this.defaultTTL): Promise<void> {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
    })

    const redis = getRedisClient()
    if (!redis) return

    try {
      await redis.set(key, JSON.stringify(data), { px: ttlMs })
    } catch {
      // Best-effort Redis write; fall back to in-memory cache.
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key)

    if (entry) {
      if (Date.now() <= entry.expiresAt) {
        return entry.data as T
      }
      this.cache.delete(key)
    }

    const redis = getRedisClient()
    if (!redis) {
      return null
    }

    try {
      const cached = await redis.get<string>(key)
      if (!cached) return null
      const parsed = JSON.parse(cached) as T
      const ttl = await redis.pttl(key).catch(() => null)
      const expiresAt =
        typeof ttl === 'number' && ttl > 0 ? Date.now() + ttl : Date.now() + this.defaultTTL
      this.cache.set(key, { data: parsed, expiresAt })
      return parsed
    } catch {
      return null
    }
  }

  async invalidate(key: string): Promise<void> {
    this.cache.delete(key)
    const redis = getRedisClient()
    if (!redis) return
    try {
      await redis.del(key)
    } catch {
      // Ignore Redis failures.
    }
  }

  async invalidatePattern(pattern: string): Promise<void> {
    const regex = new RegExp(pattern)
    const keys = Array.from(this.cache.keys())
    keys.forEach((key) => {
      if (regex.test(key)) {
        this.cache.delete(key)
      }
    })

    const redis = getRedisClient()
    if (!redis) return

    try {
      const redisKeys = await redis.keys(pattern)
      if (redisKeys.length > 0) {
        await redis.del(...redisKeys)
      }
    } catch {
      // Ignore Redis failures.
    }
  }

  clear(): void {
    this.cache.clear()
  }

  async invalidatePrefix(prefix: string): Promise<void> {
    const keys = Array.from(this.cache.keys())
    keys.forEach((key) => {
      if (key.startsWith(prefix)) {
        this.cache.delete(key)
      }
    })

    const redis = getRedisClient()
    if (!redis) return

    try {
      const redisKeys = await redis.keys(`${prefix}*`)
      if (redisKeys.length > 0) {
        await redis.del(...redisKeys)
      }
    } catch {
      // Ignore Redis failures.
    }
  }

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

export const cache = new SimpleCache()

// TTL сбалансированы между свежестью данных и нагрузкой на БД.
// Кэш инвалидируется явно при каждой мутации через invalidateLettersCache /
// invalidateRequestsCache, поэтому TTL — лишь страховочный потолок.
export const CACHE_TTL = {
  STATS: 2 * 60 * 1000, // 120 сек — статистика меняется при каждой мутации
  STATS_REPORT: 5 * 60 * 1000, // 300 сек — отчёты менее критичны к актуальности
  LETTERS_LIST: 30 * 1000, // 30 сек — списки должны быть свежими
  REQUESTS_LIST: 30 * 1000, // 30 сек — списки должны быть свежими
  LETTER_DETAIL: 60 * 1000, // 60 сек — детали письма
  USERS: 10 * 60 * 1000, // 10 мин — пользователи меняются редко
  DASHBOARD: 60 * 1000, // 60 сек — дашборд обновляется при мутациях
}

export const CACHE_KEYS = {
  STATS: 'stats',
  STATS_REPORT: 'stats:report',
  LETTERS: (params: string) => `letters:${params}`,
  LETTER: (id: string) => `letter:${id}`,
  USERS: 'users',
  REQUESTS: (params: string) => `requests:${params}`,
  DASHBOARD: (role: string) => `dashboard:${role}`,
}
