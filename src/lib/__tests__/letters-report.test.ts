/**
 * @jest-environment node
 */

const mockCacheGet = jest.fn()
const mockCacheSet = jest.fn()
const mockLetterFindMany = jest.fn()
const mockGetLetterStatsSnapshot = jest.fn()

jest.mock('@/lib/cache', () => ({
  cache: {
    get: (...args: unknown[]) => mockCacheGet(...args),
    set: (...args: unknown[]) => mockCacheSet(...args),
  },
  CACHE_KEYS: {
    REPORTS: (params: string) => `reports:${params}`,
  },
  CACHE_TTL: {
    REPORTS: 60_000,
  },
}))

jest.mock('@/lib/prisma', () => ({
  prisma: {
    letter: {
      findMany: (...args: unknown[]) => mockLetterFindMany(...args),
    },
  },
}))

jest.mock('@/lib/letters-stats', () => {
  const actual = jest.requireActual('@/lib/letters-stats')
  return {
    ...actual,
    getLetterStatsSnapshot: (...args: unknown[]) => mockGetLetterStatsSnapshot(...args),
  }
})

describe('letters report aggregation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCacheGet.mockResolvedValue(null)
    mockCacheSet.mockResolvedValue(undefined)
    mockGetLetterStatsSnapshot.mockResolvedValue({
      summary: {
        total: 4,
        overdue: 1,
        urgent: 1,
        done: 1,
        inProgress: 2,
        notReviewed: 0,
        todayDeadlines: 0,
        weekDeadlines: 1,
        monthNew: 2,
        monthDone: 1,
        avgDays: 3,
        needsProcessing: 1,
      },
      byStatus: {
        NOT_REVIEWED: 0,
        ACCEPTED: 0,
        IN_PROGRESS: 2,
        CLARIFICATION: 0,
        FROZEN: 0,
        REJECTED: 0,
        READY: 0,
        PROCESSED: 0,
        DONE: 2,
      },
      byOwner: [{ id: 'owner-1', name: 'Анна', count: 99 }],
      byType: [
        { type: 'Жалоба', count: 2 },
        { type: 'Запрос', count: 2 },
      ],
      monthly: [],
    })
  })

  it('builds quarter labels and derives secondary labels for org grouping', async () => {
    mockLetterFindMany.mockResolvedValue([
      {
        createdAt: new Date('2026-01-10T00:00:00.000Z'),
        org: 'Минздрав',
        type: 'Жалоба',
        status: 'IN_PROGRESS',
        ownerId: 'owner-1',
      },
      {
        createdAt: new Date('2026-02-03T00:00:00.000Z'),
        org: 'Минздрав',
        type: 'Жалоба',
        status: 'IN_PROGRESS',
        ownerId: 'owner-1',
      },
      {
        createdAt: new Date('2026-03-05T00:00:00.000Z'),
        org: 'Минздрав',
        type: 'Запрос',
        status: 'DONE',
        ownerId: 'owner-1',
      },
      {
        createdAt: new Date('2026-03-08T00:00:00.000Z'),
        org: 'Облбольница',
        type: 'Запрос',
        status: 'DONE',
        ownerId: null,
      },
    ])

    const { getLettersReportData } = await import('@/lib/letters-report')
    const result = await getLettersReportData(
      {
        periodMonths: 6,
        groupBy: 'org',
        granularity: 'quarter',
      },
      'ADMIN'
    )

    const minzdravRow = result.report.rows.find((row) => row.groupLabel === 'Минздрав')

    expect(result.report.rows[0]?.periodLabel).toBe('1 кв. 2026')
    expect(minzdravRow?.secondaryLabel).toBe('Жалоба')
    expect(result.filters.owners).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'owner-1', name: 'Анна', count: 3 }),
        expect.objectContaining({ id: 'unassigned', name: 'Без ответственного', count: 1 }),
      ])
    )
    expect(mockCacheSet).toHaveBeenCalled()
  })
})

export {}
