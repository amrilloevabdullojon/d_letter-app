/**
 * Letters API Tests
 */

import { createMockRequest, mockSession, mockPrisma, testData, parseResponse } from './test-utils'

// Mock dependencies
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

jest.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

jest.mock('@/lib/cache-manager', () => ({
  cacheManager: {
    onLetterChange: jest.fn(),
    onLettersBulkChange: jest.fn(),
  },
}))

import { getServerSession } from 'next-auth'

describe('Letters API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getServerSession as jest.Mock).mockResolvedValue(mockSession)
  })

  describe('GET /api/letters', () => {
    it('should return 401 when not authenticated', async () => {
      ;(getServerSession as jest.Mock).mockResolvedValue(null)

      // Import after mocking
      const { GET } = await import('../letters/route')

      const request = createMockRequest('GET', { url: 'http://localhost:3000/api/letters' })
      const response = await GET(request)

      expect(response.status).toBe(401)
    })

    it('should return paginated letters', async () => {
      const letters = [testData.letter]
      mockPrisma.letter.findMany.mockResolvedValue(letters)
      mockPrisma.letter.count.mockResolvedValue(1)

      const { GET } = await import('../letters/route')

      const request = createMockRequest('GET', {
        url: 'http://localhost:3000/api/letters',
        searchParams: { page: '1', limit: '10' },
      })
      const response = await GET(request)

      expect(response.status).toBe(200)

      const data = await parseResponse<{ letters: unknown[]; pagination: unknown }>(response)
      expect(data.letters).toHaveLength(1)
      expect(data.pagination).toBeDefined()
    })

    it('should filter by status', async () => {
      mockPrisma.letter.findMany.mockResolvedValue([])
      mockPrisma.letter.count.mockResolvedValue(0)

      const { GET } = await import('../letters/route')

      const request = createMockRequest('GET', {
        url: 'http://localhost:3000/api/letters',
        searchParams: { status: 'IN_PROGRESS' },
      })
      await GET(request)

      expect(mockPrisma.letter.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'IN_PROGRESS',
          }),
        })
      )
    })

    it('should search by query', async () => {
      mockPrisma.letter.findMany.mockResolvedValue([])
      mockPrisma.letter.count.mockResolvedValue(0)

      const { GET } = await import('../letters/route')

      const request = createMockRequest('GET', {
        url: 'http://localhost:3000/api/letters',
        searchParams: { search: 'test query' },
      })
      await GET(request)

      expect(mockPrisma.letter.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({
                number: expect.objectContaining({ contains: 'test query' }),
              }),
            ]),
          }),
        })
      )
    })
  })

  describe('POST /api/letters', () => {
    it('should create a new letter', async () => {
      const newLetter = {
        number: 'NEW-001',
        org: 'New Organization',
        date: '2024-01-20',
        deadlineDate: '2024-01-30',
        type: 'incoming',
      }

      mockPrisma.letter.findFirst.mockResolvedValue(null) // No duplicate
      mockPrisma.letter.create.mockResolvedValue({
        ...testData.letter,
        ...newLetter,
        id: 'new-letter-id',
      })

      const { POST } = await import('../letters/route')

      const request = createMockRequest('POST', {
        url: 'http://localhost:3000/api/letters',
        body: newLetter,
      })
      const response = await POST(request)

      expect(response.status).toBe(201)

      const data = await parseResponse<{ id: string }>(response)
      expect(data.id).toBe('new-letter-id')
    })

    it('should reject duplicate letter number', async () => {
      mockPrisma.letter.findFirst.mockResolvedValue(testData.letter)

      const { POST } = await import('../letters/route')

      const request = createMockRequest('POST', {
        url: 'http://localhost:3000/api/letters',
        body: {
          number: testData.letter.number,
          org: 'Test Org',
        },
      })
      const response = await POST(request)

      expect(response.status).toBe(409)
    })

    it('should validate required fields', async () => {
      const { POST } = await import('../letters/route')

      const request = createMockRequest('POST', {
        url: 'http://localhost:3000/api/letters',
        body: {}, // Missing required fields
      })
      const response = await POST(request)

      expect(response.status).toBe(400)
    })
  })
})

describe('Letter Detail API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getServerSession as jest.Mock).mockResolvedValue(mockSession)
  })

  describe('GET /api/letters/[id]', () => {
    it('should return letter by id', async () => {
      mockPrisma.letter.findUnique.mockResolvedValue(testData.letter)

      const { GET } = await import('../letters/[id]/route')

      const request = createMockRequest('GET', {
        url: 'http://localhost:3000/api/letters/letter-123',
      })
      const response = await GET(request, { params: Promise.resolve({ id: 'letter-123' }) })

      expect(response.status).toBe(200)

      const data = await parseResponse<typeof testData.letter>(response)
      expect(data.id).toBe('letter-123')
    })

    it('should return 404 for non-existent letter', async () => {
      mockPrisma.letter.findUnique.mockResolvedValue(null)

      const { GET } = await import('../letters/[id]/route')

      const request = createMockRequest('GET', {
        url: 'http://localhost:3000/api/letters/non-existent',
      })
      const response = await GET(request, { params: Promise.resolve({ id: 'non-existent' }) })

      expect(response.status).toBe(404)
    })
  })

  describe('PATCH /api/letters/[id]', () => {
    it('should update letter', async () => {
      mockPrisma.letter.findUnique.mockResolvedValue(testData.letter)
      mockPrisma.letter.update.mockResolvedValue({
        ...testData.letter,
        status: 'DONE',
      })

      const { PATCH } = await import('../letters/[id]/route')

      const request = createMockRequest('PATCH', {
        url: 'http://localhost:3000/api/letters/letter-123',
        body: { status: 'DONE' },
      })
      const response = await PATCH(request, { params: Promise.resolve({ id: 'letter-123' }) })

      expect(response.status).toBe(200)

      const data = await parseResponse<{ status: string }>(response)
      expect(data.status).toBe('DONE')
    })
  })

  describe('DELETE /api/letters/[id]', () => {
    it('should soft delete letter', async () => {
      mockPrisma.letter.findUnique.mockResolvedValue(testData.letter)
      mockPrisma.letter.update.mockResolvedValue({
        ...testData.letter,
        deletedAt: new Date(),
      })

      const { DELETE } = await import('../letters/[id]/route')

      const request = createMockRequest('DELETE', {
        url: 'http://localhost:3000/api/letters/letter-123',
      })
      const response = await DELETE(request, { params: Promise.resolve({ id: 'letter-123' }) })

      expect(response.status).toBe(200)
    })
  })
})
