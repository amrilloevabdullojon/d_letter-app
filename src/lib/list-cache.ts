import 'server-only'

import type { Session } from 'next-auth'
import type { Prisma, RequestCategory, RequestPriority, RequestStatus } from '@prisma/client'
import { cache, CACHE_KEYS, CACHE_TTL } from '@/lib/cache'
import { prisma } from '@/lib/prisma'
import { LetterService } from '@/services/letter.service'
import { PAGE_SIZE } from '@/lib/constants'
import type { LetterFiltersInput, PaginationInput, RequestQueryInput } from '@/lib/schemas'
import type { LetterSummary, PaginationMeta } from '@/types/dto'

export type LettersListResult = {
  letters: LetterSummary[]
  pagination: PaginationMeta
}

export type RequestsListResult = {
  requests: Array<{
    id: string
    organization: string
    contactName: string
    contactEmail: string
    contactPhone: string
    contactTelegram: string
    description: string
    status: RequestStatus
    priority: RequestPriority
    category: RequestCategory
    createdAt: Date
    updatedAt: Date
    source: string | null
    ipHash: string | null
    assignedTo: {
      id: string
      name: string | null
      email: string | null
      image: string | null
    } | null
    _count: { files: number; comments: number }
  }>
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export function buildLettersParams(
  filters: LetterFiltersInput,
  pagination: PaginationInput
): URLSearchParams {
  const params = new URLSearchParams()
  const page = pagination.page ?? 1
  const limit = pagination.limit ?? PAGE_SIZE
  const sortBy = filters.sortBy ?? 'created'
  const sortOrder = filters.sortOrder ?? 'desc'

  params.set('page', String(page))
  params.set('limit', String(limit))
  params.set('sortBy', sortBy)
  params.set('sortOrder', sortOrder)

  if (filters.status && filters.status !== 'all') {
    params.set('status', filters.status)
  }
  if (filters.filter) {
    params.set('filter', filters.filter)
  }
  if (filters.owner) {
    params.set('owner', filters.owner)
  }
  if (filters.type) {
    params.set('type', filters.type)
  }
  const search = filters.search?.trim()
  if (search) {
    params.set('search', search)
  }
  if (filters.dateFrom) {
    params.set('dateFrom', filters.dateFrom)
  }
  if (filters.dateTo) {
    params.set('dateTo', filters.dateTo)
  }

  return params
}

export function buildLettersCacheKey(
  params: URLSearchParams,
  userId: string,
  role: string | null | undefined
): string {
  const roleTag = role || 'unknown'
  return CACHE_KEYS.LETTERS(`${userId}:${roleTag}:${params.toString()}`)
}

export async function getLettersListCached(
  filters: LetterFiltersInput,
  pagination: PaginationInput,
  session: Session
): Promise<LettersListResult> {
  const normalizedFilters: LetterFiltersInput = {
    ...filters,
    search: filters.search?.trim() || undefined,
  }
  const params = buildLettersParams(normalizedFilters, pagination)
  const cacheKey = buildLettersCacheKey(params, session.user.id, session.user.role)
  const cached = await cache.get<LettersListResult>(cacheKey)
  if (cached) {
    return {
      ...cached,
      letters: cached.letters.map((letter) => ({
        ...letter,
        date: new Date(letter.date),
        deadlineDate: new Date(letter.deadlineDate),
      })),
    }
  }

  const result = await LetterService.findMany(normalizedFilters, pagination, session.user.id)
  const response: LettersListResult = {
    letters: result.data,
    pagination: result.pagination,
  }

  await cache.set(cacheKey, response, CACHE_TTL.LETTERS_LIST)
  return response
}

export function buildRequestsParams(query: RequestQueryInput): URLSearchParams {
  const params = new URLSearchParams()
  const page = query.page ?? 1
  const limit = query.limit ?? PAGE_SIZE

  params.set('page', String(page))
  params.set('limit', String(limit))

  if (query.status && query.status.length > 0) {
    params.set('status', query.status.join(','))
  }
  if (query.priority) {
    params.set('priority', query.priority)
  }
  if (query.category) {
    params.set('category', query.category)
  }
  const search = query.search?.trim()
  if (search) {
    params.set('search', search)
  }

  return params
}

export function buildRequestsCacheKey(
  params: URLSearchParams,
  role: string | null | undefined
): string {
  const roleTag = role || 'unknown'
  return CACHE_KEYS.REQUESTS(`${roleTag}:${params.toString()}`)
}

export async function getRequestsListCached(
  query: RequestQueryInput,
  role: string | null | undefined
): Promise<RequestsListResult> {
  const normalizedQuery: RequestQueryInput = {
    ...query,
    search: query.search?.trim() || undefined,
  }
  const params = buildRequestsParams(normalizedQuery)
  const cacheKey = buildRequestsCacheKey(params, role)
  const cached = await cache.get<RequestsListResult>(cacheKey)
  if (cached) {
    return {
      ...cached,
      requests: cached.requests.map((request) => ({
        ...request,
        createdAt: new Date(request.createdAt),
        updatedAt: new Date(request.updatedAt),
      })),
    }
  }

  const pageValue = normalizedQuery.page ?? 1
  const limitValue = normalizedQuery.limit ?? PAGE_SIZE
  const where: Prisma.RequestWhereInput = {
    deletedAt: null,
  }

  if (normalizedQuery.status && normalizedQuery.status.length > 0) {
    if (normalizedQuery.status.length === 1) {
      where.status = normalizedQuery.status[0]
    } else {
      where.status = { in: normalizedQuery.status }
    }
  }

  if (normalizedQuery.priority) {
    where.priority = normalizedQuery.priority
  }

  if (normalizedQuery.category) {
    where.category = normalizedQuery.category
  }

  if (normalizedQuery.search) {
    const value = normalizedQuery.search
    if (value) {
      where.OR = [
        { organization: { contains: value, mode: 'insensitive' } },
        { contactName: { contains: value, mode: 'insensitive' } },
        { contactEmail: { contains: value, mode: 'insensitive' } },
        { contactPhone: { contains: value, mode: 'insensitive' } },
        { contactTelegram: { contains: value, mode: 'insensitive' } },
        { description: { contains: value, mode: 'insensitive' } },
      ]
    }
  }

  const [requests, total] = await Promise.all([
    prisma.request.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      skip: (pageValue - 1) * limitValue,
      take: limitValue,
      include: {
        assignedTo: { select: { id: true, name: true, email: true, image: true } },
        _count: { select: { files: true, comments: true } },
      },
    }),
    prisma.request.count({ where }),
  ])

  const response: RequestsListResult = {
    requests: requests.map((request) => ({
      ...request,
      category: (request.category || 'OTHER') as RequestCategory,
      description: request.description ? request.description.slice(0, 240) : '',
    })),
    pagination: {
      page: pageValue,
      limit: limitValue,
      total,
      totalPages: Math.ceil(total / limitValue),
    },
  }

  await cache.set(cacheKey, response, CACHE_TTL.REQUESTS_LIST)
  return response
}

export async function invalidateLettersCache(): Promise<void> {
  await cache.invalidatePrefix('letters:')
  await cache.invalidatePrefix('dashboard:')
  await cache.invalidate(CACHE_KEYS.STATS)
  await cache.invalidate(CACHE_KEYS.STATS_REPORT)
}

export async function invalidateRequestsCache(): Promise<void> {
  await cache.invalidatePrefix('requests:')
  await cache.invalidatePrefix('dashboard:')
}
