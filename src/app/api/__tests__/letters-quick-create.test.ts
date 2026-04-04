/**
 * @jest-environment node
 */

import { createMockRequest, mockSession } from './test-utils'

const mockCheckRateLimit = jest.fn()
const mockSaveLocalUpload = jest.fn()
const mockDeleteLocalFile = jest.fn()
const mockInvalidateLettersCache = jest.fn()

const mockPrisma = {
  letter: {
    findFirst: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
  history: {
    create: jest.fn(),
  },
  watcher: {
    createMany: jest.fn(),
  },
  file: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  $transaction: jest.fn(),
  $queryRaw: jest.fn(),
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

jest.mock('@/lib/api-handler', () => ({
  withValidation: (handler: unknown) => handler,
}))

jest.mock('@/lib/cache', () => ({
  CACHE_TTL: {
    LETTERS_LIST: 60_000,
  },
}))

jest.mock('@/lib/logger.server', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
  },
}))

jest.mock('@/lib/rate-limit', () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  getClientIdentifier: jest.fn(() => '127.0.0.1'),
  RATE_LIMITS: {
    standard: { limit: 100, windowMs: 60_000 },
  },
}))

jest.mock('@/lib/list-cache', () => ({
  getLettersListCached: jest.fn(),
  invalidateLettersCache: (...args: unknown[]) => mockInvalidateLettersCache(...args),
}))

jest.mock('@/lib/notifications', () => ({
  buildApplicantPortalLink: jest.fn(() => 'https://example.com/portal'),
  sendMultiChannelNotification: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('@/lib/notification-dispatcher', () => ({
  dispatchNotification: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('@/lib/token', () => ({
  generatePortalToken: jest.fn(() => ({
    raw: 'raw-token',
    hashed: 'hashed-token',
  })),
}))

jest.mock('@/lib/file-storage', () => ({
  saveLocalUpload: (...args: unknown[]) => mockSaveLocalUpload(...args),
  deleteLocalFile: (...args: unknown[]) => mockDeleteLocalFile(...args),
}))

jest.mock('@/lib/file-sync', () => ({
  syncFileToDrive: jest.fn().mockResolvedValue(null),
}))

import { getServerSession } from 'next-auth'

function buildQuickCreateRequest(formData: FormData) {
  return createMockRequest('POST', {
    url: 'http://localhost:3000/api/letters',
    body: formData,
    headers: {
      'content-type': 'multipart/form-data; boundary=test',
      'x-csrf-token': 'csrf-test-token',
      cookie: 'csrf-token=csrf-test-token',
    },
  })
}

function buildQuickCreateFormData(options?: { ownerId?: string }) {
  const formData = new FormData()
  formData.append('number', 'AI-001')
  formData.append('org', 'Министерство здравоохранения')
  formData.append('date', '2026-04-01')
  formData.append('content', 'Краткое содержание')
  formData.append('contentRussian', 'Полный перевод письма')
  formData.append('region', 'Ташкентская область')
  formData.append('district', 'Юнусабадский район')
  if (options?.ownerId) {
    formData.append('ownerId', options.ownerId)
  }
  formData.append('file', new Blob(['pdf'], { type: 'application/pdf' }), 'source.pdf')
  return formData
}

describe('POST /api/letters quick AI flow', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getServerSession as jest.Mock).mockResolvedValue(mockSession)
    mockCheckRateLimit.mockResolvedValue({
      success: true,
      remaining: 99,
      reset: Date.now() + 60_000,
    })
    mockPrisma.letter.findFirst.mockResolvedValue(null)
    mockPrisma.letter.delete.mockResolvedValue({})
    mockPrisma.$queryRaw.mockResolvedValue([])
    mockPrisma.history.create.mockResolvedValue({})
    mockPrisma.watcher.createMany.mockResolvedValue({})
    mockPrisma.file.findUnique.mockResolvedValue(null)
    mockPrisma.file.update.mockResolvedValue({})
    mockPrisma.file.delete.mockResolvedValue({})
    mockDeleteLocalFile.mockResolvedValue(undefined)
    mockInvalidateLettersCache.mockResolvedValue(undefined)
    mockPrisma.$transaction.mockImplementation(
      async (callback: (tx: typeof mockPrisma) => unknown) => callback(mockPrisma)
    )
  })

  it('stores AI translation and geography in comment and attaches the file in one request', async () => {
    const createdLetter = {
      id: 'letter-1',
      number: 'AI-001',
      org: 'Министерство здравоохранения',
      date: new Date('2026-04-01T00:00:00.000Z'),
      deadlineDate: new Date('2026-04-10T00:00:00.000Z'),
      ownerId: null,
      applicantEmail: null,
      applicantPhone: null,
      applicantTelegramChatId: null,
      comment: null,
    }

    mockPrisma.letter.create.mockResolvedValue(createdLetter)
    mockSaveLocalUpload.mockResolvedValue({
      storagePath: 'letters/letter-1/source.pdf',
      url: '/uploads/letters/letter-1/source.pdf',
    })
    mockPrisma.file.create.mockResolvedValue({
      id: 'file-1',
      name: 'source.pdf',
    })

    const { POST } = await import('../letters/route')
    const response = await POST(buildQuickCreateRequest(buildQuickCreateFormData()))
    const payload = await response.json()

    expect(response.status).toBe(201)
    expect(payload.success).toBe(true)
    expect(mockPrisma.letter.create).toHaveBeenCalled()
    expect(mockPrisma.file.create).toHaveBeenCalled()
    expect(mockSaveLocalUpload).toHaveBeenCalled()

    const createData = mockPrisma.letter.create.mock.calls[0][0].data
    expect(createData.contacts).toBeUndefined()
    expect(createData.comment).toContain('AI-извлечение: регион и район')
    expect(createData.comment).toContain('Ташкентская область')
    expect(createData.comment).toContain('Юнусабадский район')
    expect(createData.comment).toContain('AI-перевод письма')
    expect(createData.comment).toContain('Полный перевод письма')
  })

  it('rolls back the created letter when file attachment fails', async () => {
    const createdLetter = {
      id: 'letter-rollback',
      number: 'AI-001',
      org: 'Министерство здравоохранения',
      date: new Date('2026-04-01T00:00:00.000Z'),
      deadlineDate: new Date('2026-04-10T00:00:00.000Z'),
      ownerId: null,
      applicantEmail: null,
      applicantPhone: null,
      applicantTelegramChatId: null,
      comment: null,
    }

    mockPrisma.letter.create.mockResolvedValue(createdLetter)
    mockSaveLocalUpload.mockResolvedValue({
      storagePath: 'letters/letter-rollback/source.pdf',
      url: '/uploads/letters/letter-rollback/source.pdf',
    })
    mockPrisma.file.create.mockRejectedValue(new Error('DB write failed'))

    const { POST } = await import('../letters/route')
    const response = await POST(buildQuickCreateRequest(buildQuickCreateFormData()))
    const payload = await response.json()

    expect(response.status).toBe(500)
    expect(payload.error).toBe('DB write failed')
    expect(mockDeleteLocalFile).toHaveBeenCalledWith('letters/letter-rollback/source.pdf')
    expect(mockPrisma.letter.delete).toHaveBeenCalledWith({
      where: { id: 'letter-rollback' },
    })
  })

  it('uses the selected owner from quick upload instead of auto-assignment', async () => {
    const ownerId = 'ck1234567890123456789012'
    const createdLetter = {
      id: 'letter-owner',
      number: 'AI-001',
      org: 'Министерство здравоохранения',
      date: new Date('2026-04-01T00:00:00.000Z'),
      deadlineDate: new Date('2026-04-10T00:00:00.000Z'),
      ownerId,
      applicantEmail: null,
      applicantPhone: null,
      applicantTelegramChatId: null,
      comment: null,
    }

    mockPrisma.letter.create.mockResolvedValue(createdLetter)
    mockSaveLocalUpload.mockResolvedValue({
      storagePath: 'letters/letter-owner/source.pdf',
      url: '/uploads/letters/letter-owner/source.pdf',
    })
    mockPrisma.file.create.mockResolvedValue({
      id: 'file-owner',
      name: 'source.pdf',
    })

    const { POST } = await import('../letters/route')
    const response = await POST(buildQuickCreateRequest(buildQuickCreateFormData({ ownerId })))

    expect(response.status).toBe(201)
    expect(mockPrisma.$queryRaw).not.toHaveBeenCalled()

    const createData = mockPrisma.letter.create.mock.calls[0][0].data
    expect(createData.ownerId).toBe(ownerId)
  })
})
