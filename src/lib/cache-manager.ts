/**
 * Centralized Cache Manager
 *
 * Provides high-level cache invalidation methods that handle
 * related cache entries automatically.
 *
 * @example
 * ```ts
 * // After updating a letter
 * await cacheManager.onLetterChange(letterId)
 *
 * // After updating a user
 * await cacheManager.onUserChange(userId)
 * ```
 */

import { cache, CACHE_KEYS } from './cache'

/**
 * Query keys for React Query cache invalidation
 */
export const QueryKeys = {
  letters: {
    all: ['letters'] as const,
    lists: () => [...QueryKeys.letters.all, 'list'] as const,
    list: (filters?: object) => [...QueryKeys.letters.lists(), filters] as const,
    details: () => [...QueryKeys.letters.all, 'detail'] as const,
    detail: (id: string) => [...QueryKeys.letters.details(), id] as const,
    stats: () => [...QueryKeys.letters.all, 'stats'] as const,
  },
  users: {
    all: ['users'] as const,
    lists: () => [...QueryKeys.users.all, 'list'] as const,
    list: (filters?: object) => [...QueryKeys.users.lists(), filters] as const,
    details: () => [...QueryKeys.users.all, 'detail'] as const,
    detail: (id: string) => [...QueryKeys.users.details(), id] as const,
  },
  requests: {
    all: ['requests'] as const,
    lists: () => [...QueryKeys.requests.all, 'list'] as const,
    list: (filters?: object) => [...QueryKeys.requests.lists(), filters] as const,
    details: () => [...QueryKeys.requests.all, 'detail'] as const,
    detail: (id: string) => [...QueryKeys.requests.details(), id] as const,
    stats: () => [...QueryKeys.requests.all, 'stats'] as const,
  },
  dashboard: {
    all: ['dashboard'] as const,
    stats: () => [...QueryKeys.dashboard.all, 'stats'] as const,
    recent: () => [...QueryKeys.dashboard.all, 'recent'] as const,
    urgent: () => [...QueryKeys.dashboard.all, 'urgent'] as const,
  },
  stats: {
    all: ['stats'] as const,
  },
} as const

/**
 * Cache invalidation patterns for different entity types
 */
const INVALIDATION_PATTERNS = {
  letter: ['letter:', 'letters:', 'stats', 'dashboard:'],
  user: ['users', 'letter:'], // Letters may reference users
  request: ['request:', 'requests:', 'stats', 'dashboard:'],
  stats: ['stats', 'dashboard:'],
  all: ['letter:', 'letters:', 'users', 'request:', 'requests:', 'stats', 'dashboard:'],
}

/**
 * Centralized cache manager with intelligent invalidation
 */
export const cacheManager = {
  /**
   * Invalidate caches when a letter changes
   */
  async onLetterChange(letterId: string): Promise<void> {
    // Invalidate specific letter cache
    await cache.invalidate(CACHE_KEYS.LETTER(letterId))

    // Invalidate related patterns
    await Promise.all([
      cache.invalidatePrefix('letters:'),
      cache.invalidatePrefix('stats'),
      cache.invalidatePrefix('dashboard:'),
    ])
  },

  /**
   * Invalidate caches when letters are bulk updated
   */
  async onLettersBulkChange(): Promise<void> {
    await Promise.all([
      cache.invalidatePrefix('letter:'),
      cache.invalidatePrefix('letters:'),
      cache.invalidatePrefix('stats'),
      cache.invalidatePrefix('dashboard:'),
    ])
  },

  /**
   * Invalidate caches when a user changes
   */
  async onUserChange(userId: string): Promise<void> {
    await Promise.all([
      cache.invalidate(CACHE_KEYS.USERS),
      // Letters may reference users (owner, assignee)
      cache.invalidatePrefix('letters:'),
      cache.invalidatePrefix('dashboard:'),
    ])
  },

  /**
   * Invalidate caches when a request changes
   */
  async onRequestChange(requestId: string): Promise<void> {
    await Promise.all([
      cache.invalidatePrefix('request:'),
      cache.invalidatePrefix('requests:'),
      cache.invalidatePrefix('stats'),
      cache.invalidatePrefix('dashboard:'),
    ])
  },

  /**
   * Invalidate stats caches (after significant data changes)
   */
  async onStatsChange(): Promise<void> {
    await Promise.all([
      cache.invalidate(CACHE_KEYS.STATS),
      cache.invalidate(CACHE_KEYS.STATS_REPORT),
      cache.invalidatePrefix('dashboard:'),
    ])
  },

  /**
   * Invalidate dashboard caches
   */
  async onDashboardChange(): Promise<void> {
    await cache.invalidatePrefix('dashboard:')
  },

  /**
   * Invalidate all caches (use sparingly)
   */
  async invalidateAll(): Promise<void> {
    cache.clear()
  },

  /**
   * Get cache key for a specific entity
   */
  getKey: CACHE_KEYS,

  /**
   * Get query keys for React Query
   */
  queryKeys: QueryKeys,
}

export default cacheManager
