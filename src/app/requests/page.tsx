import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { requestQuerySchema } from '@/lib/schemas'
import type { RequestQueryInput } from '@/lib/schemas'
import type { RequestCategory, RequestPriority, RequestStatus } from '@prisma/client'
import RequestsPageClient from './RequestsPageClient'
import { buildRequestsParams, getRequestsListCached } from '@/lib/list-cache'
import { PAGE_SIZE } from '@/lib/constants'

const defaultFilters: RequestQueryInput = {
  page: 1,
  limit: PAGE_SIZE,
}

type SearchParams = Record<string, string | string[] | undefined>
type PageProps = { searchParams?: Promise<SearchParams> }
type InitialFilters = {
  page: number
  limit: number
  status: RequestStatus | ''
  priority: RequestPriority | ''
  category: RequestCategory | ''
  search: string
  sortOrder: 'asc' | 'desc'
}

function parseSearchParams(searchParams: SearchParams): RequestQueryInput {
  const raw: Record<string, string> = {}
  Object.entries(searchParams).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      if (value.length > 0 && value[value.length - 1] !== undefined) {
        raw[key] = value[value.length - 1] as string
      }
      return
    }
    if (typeof value === 'string') {
      raw[key] = value
    }
  })

  const parsed = requestQuerySchema.safeParse(raw)
  if (!parsed.success) {
    return { ...defaultFilters }
  }

  return parsed.data
}

export default async function RequestsPage({ searchParams }: PageProps) {
  const resolvedSearchParams = (await searchParams) ?? {}
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect('/login')
  }

  if (!hasPermission(session.user.role, 'VIEW_REQUESTS')) {
    redirect('/')
  }

  const query = parseSearchParams(resolvedSearchParams)
  const normalizedQuery = {
    ...query,
    status: query.status ? query.status.slice(0, 1) : undefined,
  }
  const data = await getRequestsListCached(normalizedQuery, session.user.role)
  const initialCacheKey = buildRequestsParams(normalizedQuery).toString()

  const initialFilters: InitialFilters = {
    page: normalizedQuery.page ?? 1,
    limit: normalizedQuery.limit ?? PAGE_SIZE,
    status: (normalizedQuery.status?.[0] ?? '') as RequestStatus | '',
    priority: (normalizedQuery.priority ?? '') as RequestPriority | '',
    category: (normalizedQuery.category ?? '') as RequestCategory | '',
    search: normalizedQuery.search ?? '',
    sortOrder: 'desc' as const,
  }

  const requests = data.requests.map((request) => ({
    ...request,
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString(),
  }))

  return (
    <RequestsPageClient
      initialData={{
        requests,
        pagination: data.pagination,
        filters: initialFilters,
        initialCacheKey,
      }}
    />
  )
}
