/**
 * @jest-environment node
 */

import type { NextRequest } from 'next/server'
import { createMockRequest, mockSession, mockUserSession } from './test-utils'

const mockPrisma = {
  request: {
    findUnique: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
  },
  requestTag: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  rolePermission: {
    findMany: jest.fn(),
  },
}

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

jest.mock('@/lib/auth', () => ({
  authOptions: {},
}))

jest.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

jest.mock('@/lib/logger.server', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}))

jest.mock('@/lib/rate-limit', () => ({
  checkRateLimit: jest.fn().mockResolvedValue({
    success: true,
    remaining: 19,
    reset: Date.now() + 60_000,
  }),
  getClientIdentifier: jest.fn().mockReturnValue('127.0.0.1'),
  RATE_LIMITS: {
    upload: { limit: 20, windowMs: 60_000 },
    standard: { limit: 100, windowMs: 60_000 },
    search: { limit: 30, windowMs: 60_000 },
  },
}))

jest.mock('@/lib/request-sla', () => ({
  calculateSlaDeadline: jest.fn(() => new Date('2026-04-10T00:00:00.000Z')),
  calculateSlaStatus: jest.fn(() => 'ON_TIME'),
}))

jest.mock('@/lib/list-cache', () => ({
  invalidateRequestsCache: jest.fn(),
  getRequestsListCached: jest.fn(),
}))

jest.mock('@/lib/request-email', () => ({
  sendRequestCreatedEmail: jest.fn().mockResolvedValue(undefined),
  sendRequestCommentEmail: jest.fn().mockResolvedValue(undefined),
  sendRequestStatusUpdateEmail: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('@/lib/telegram', () => ({
  formatNewRequestMessage: jest.fn(() => 'new request'),
  formatRequestStatusChangeMessage: jest.fn(() => 'status changed'),
  sendTelegramMessage: jest.fn().mockResolvedValue(true),
}))

jest.mock('@/lib/file-storage', () => ({
  saveLocalRequestUpload: jest.fn(),
}))

import { getServerSession } from 'next-auth'

describe('Requests security', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockPrisma.rolePermission.findMany.mockResolvedValue([])
    ;(getServerSession as jest.Mock).mockResolvedValue(mockSession)
  })

  it('enforces CSRF on private request mutations', async () => {
    const { PATCH } = await import('../requests/[id]/route')

    const request = createMockRequest('PATCH', {
      url: 'http://localhost:3000/api/requests/request-123',
      body: { status: 'DONE' },
    })

    const response = await PATCH(request, {
      params: Promise.resolve({ id: 'request-123' }),
    })

    expect(response.status).toBe(403)
  })

  it('rejects request tag updates for users without MANAGE_REQUESTS', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(mockUserSession)
    const { PUT } = await import('../requests/[id]/tags/route')

    const request = createMockRequest('PUT', {
      url: 'http://localhost:3000/api/requests/request-123/tags',
      body: { tagIds: ['tag-1'] },
      headers: {
        'x-csrf-token': 'csrf-test-token',
        cookie: 'csrf-token=csrf-test-token',
      },
    })

    const response = await PUT(request, {
      params: Promise.resolve({ id: 'request-123' }),
    })

    expect(response.status).toBe(403)
  })

  it('rejects SLA recalculation for users without MANAGE_REQUESTS', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(mockUserSession)
    const { POST } = await import('../requests/sla/update/route')

    const request = createMockRequest('POST', {
      url: 'http://localhost:3000/api/requests/sla/update',
      headers: {
        'x-csrf-token': 'csrf-test-token',
        cookie: 'csrf-token=csrf-test-token',
      },
    })

    const response = await POST(request)

    expect(response.status).toBe(403)
  })

  it('keeps the public request intake endpoint available without CSRF', async () => {
    const { POST } = await import('../requests/route')

    const formData = new FormData()
    formData.set('organization', 'Test Org')
    formData.set('contactName', 'John Doe')
    formData.set('contactEmail', 'john@example.com')
    formData.set('contactPhone', '+998901234567')
    formData.set('contactTelegram', '@john')
    formData.set('description', 'Please help with a public intake request')

    mockPrisma.request.create.mockResolvedValue({
      id: 'request-123',
      organization: 'Test Org',
      contactName: 'John Doe',
      contactEmail: 'john@example.com',
      contactPhone: '+998901234567',
      contactTelegram: '@john',
      description: 'Please help with a public intake request',
      priority: 'NORMAL',
    })

    const request = {
      headers: new Headers(),
      formData: async () => formData,
    } as unknown as NextRequest

    const response = await POST(request)

    expect(response.status).toBe(201)
    expect(mockPrisma.request.create).toHaveBeenCalled()
  })
})
