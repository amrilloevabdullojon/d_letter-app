/**
 * @jest-environment node
 */

import { NextResponse } from 'next/server'
import { createMockRequest, mockSession, parseResponse } from './test-utils'

const mockRequirePermission = jest.fn()
const mockGetLettersReportData = jest.fn()

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

jest.mock('@/lib/auth', () => ({
  authOptions: {},
}))

jest.mock('@/lib/logger.server', () => ({
  logger: {
    error: jest.fn(),
  },
}))

jest.mock('@/lib/permission-guard', () => ({
  requirePermission: (...args: unknown[]) => mockRequirePermission(...args),
}))

jest.mock('@/lib/letters-report', () => {
  const actual = jest.requireActual('@/lib/letters-report')
  return {
    ...actual,
    getLettersReportData: (...args: unknown[]) => mockGetLettersReportData(...args),
  }
})

import { getServerSession } from 'next-auth'

const reportPayload = {
  summary: {
    total: 10,
    overdue: 2,
    urgent: 1,
    done: 5,
    inProgress: 3,
    notReviewed: 1,
    todayDeadlines: 0,
    weekDeadlines: 1,
    monthNew: 2,
    monthDone: 1,
    avgDays: 4,
    needsProcessing: 1,
  },
  byStatus: {
    NOT_REVIEWED: 1,
    ACCEPTED: 0,
    IN_PROGRESS: 3,
    CLARIFICATION: 0,
    FROZEN: 0,
    REJECTED: 0,
    READY: 0,
    PROCESSED: 0,
    DONE: 6,
  },
  byOwner: [{ id: 'owner-1', name: 'Анна', count: 4 }],
  byType: [{ type: 'Жалоба', count: 4 }],
  monthly: [{ month: 'янв.', created: 3, done: 2 }],
  generatedAt: '2026-04-05T10:00:00.000Z',
  filters: {
    owners: [{ id: 'owner-1', name: 'Анна', count: 4 }],
    orgs: ['Минздрав'],
    types: ['Жалоба'],
  },
  report: {
    rows: [
      {
        periodKey: '2026-Q1',
        periodLabel: '1 кв. 2026',
        periodSort: 1,
        groupKey: 'Минздрав',
        groupLabel: 'Минздрав',
        org: 'Минздрав',
        type: 'Жалоба',
        count: 4,
        secondaryLabel: 'Жалоба',
      },
    ],
    periodGroups: [
      {
        periodKey: '2026-Q1',
        periodLabel: '1 кв. 2026',
        periodSort: 1,
        totalCount: 4,
        maxCount: 4,
        rows: [
          {
            periodKey: '2026-Q1',
            periodLabel: '1 кв. 2026',
            periodSort: 1,
            groupKey: 'Минздрав',
            groupLabel: 'Минздрав',
            org: 'Минздрав',
            type: 'Жалоба',
            count: 4,
            secondaryLabel: 'Жалоба',
          },
        ],
      },
    ],
    heatmap: {
      periods: [{ key: '2026-Q1', label: '1 кв. 2026', sort: 1 }],
      groups: [{ key: 'Минздрав', label: 'Минздрав', total: 4 }],
      rows: [{ groupKey: 'Минздрав', values: { '2026-Q1': 4 } }],
      max: 4,
    },
    summary: {
      total: 4,
      orgCount: 1,
      typeCount: 1,
      groupCount: 1,
      periodCount: 1,
    },
  },
}

describe('reports letters API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getServerSession as jest.Mock).mockResolvedValue(mockSession)
    mockRequirePermission.mockReturnValue(null)
    mockGetLettersReportData.mockResolvedValue(reportPayload)
  })

  it('blocks report fetch without VIEW_REPORTS', async () => {
    mockRequirePermission.mockReturnValue(
      NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    )

    const { GET } = await import('../reports/letters/route')
    const response = await GET(
      createMockRequest('GET', {
        url: 'http://localhost:3000/api/reports/letters',
        searchParams: { periodMonths: '6' },
      })
    )

    expect(response.status).toBe(403)
    expect(mockGetLettersReportData).not.toHaveBeenCalled()
  })

  it('returns aggregated server-side report data', async () => {
    const { GET } = await import('../reports/letters/route')
    const response = await GET(
      createMockRequest('GET', {
        url: 'http://localhost:3000/api/reports/letters',
        searchParams: { periodMonths: '6', groupBy: 'org', granularity: 'quarter' },
      })
    )
    const payload = await parseResponse<typeof reportPayload>(response)

    expect(response.status).toBe(200)
    expect(payload.report.rows[0]?.periodLabel).toBe('1 кв. 2026')
    expect(mockGetLettersReportData).toHaveBeenCalledWith(
      expect.objectContaining({
        periodMonths: 6,
        groupBy: 'org',
        granularity: 'quarter',
      }),
      'ADMIN'
    )
  })

  it('exports report data as csv from the server', async () => {
    const { GET } = await import('../reports/letters/export/route')
    const response = await GET(
      createMockRequest('GET', {
        url: 'http://localhost:3000/api/reports/letters/export',
        searchParams: {
          periodMonths: '6',
          groupBy: 'org',
          granularity: 'quarter',
          format: 'csv',
        },
      })
    )
    const csv = await response.text()

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toContain('text/csv')
    expect(csv).toContain('Период,Учреждение,Тип письма,Количество')
    expect(csv).toContain('1 кв. 2026,Минздрав,Жалоба,4')
  })
})

export {}
