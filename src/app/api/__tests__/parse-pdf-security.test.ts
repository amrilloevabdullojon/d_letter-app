/**
 * @jest-environment node
 */

import { NextResponse } from 'next/server'
import { createMockRequest, mockSession } from './test-utils'

const mockExtractLetterDataFromPdf = jest.fn()
const mockExtractLetterDataWithAI = jest.fn()
const mockExtractTextFromOfficeDocument = jest.fn()
const mockCheckRateLimit = jest.fn()
const mockRequirePermissionAsync = jest.fn()

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

jest.mock('@/lib/auth', () => ({
  authOptions: {},
}))

jest.mock('@/lib/ai', () => ({
  extractLetterDataFromPdf: (...args: unknown[]) => mockExtractLetterDataFromPdf(...args),
  extractLetterDataWithAI: (...args: unknown[]) => mockExtractLetterDataWithAI(...args),
}))

jest.mock('@/lib/ai-utils', () => ({
  withTimeout: jest.fn((promise: Promise<unknown>) => promise),
}))

jest.mock('@/lib/parsePdfLetter', () => ({
  calculateDeadline: jest.fn(() => new Date('2026-04-10T00:00:00.000Z')),
}))

jest.mock('@/lib/logger.server', () => ({
  logger: {
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}))

jest.mock('@/lib/rate-limit', () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  getClientIdentifier: jest.fn(() => '127.0.0.1'),
  RATE_LIMITS: {
    heavy: { limit: 5, windowMs: 60_000 },
  },
}))

jest.mock('@/lib/permission-guard', () => ({
  requirePermissionAsync: (...args: unknown[]) => mockRequirePermissionAsync(...args),
}))

jest.mock('@/lib/document-text', () => ({
  extractTextFromOfficeDocument: (...args: unknown[]) => mockExtractTextFromOfficeDocument(...args),
  getSupportedAiDocumentKind: jest.fn((fileName: string, mimeType?: string) => {
    const normalizedName = fileName.toLowerCase()
    const normalizedMime = mimeType?.toLowerCase() || ''

    if (normalizedName.endsWith('.pdf') || normalizedMime === 'application/pdf') {
      return 'pdf'
    }
    if (
      normalizedName.endsWith('.docx') ||
      normalizedMime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      return 'docx'
    }
    if (normalizedName.endsWith('.doc') || normalizedMime === 'application/msword') {
      return 'doc'
    }

    return null
  }),
}))

import { getServerSession } from 'next-auth'

function buildParseRequest(blob: Blob, fileName = 'letter.pdf') {
  const formData = new FormData()
  formData.append('file', blob, fileName)

  return createMockRequest('POST', {
    url: 'http://localhost:3000/api/parse-pdf',
    body: formData,
    headers: {
      'content-type': 'multipart/form-data; boundary=test',
      'x-csrf-token': 'csrf-test-token',
      cookie: 'csrf-token=csrf-test-token',
    },
  })
}

describe('POST /api/parse-pdf', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getServerSession as jest.Mock).mockResolvedValue(mockSession)
    mockCheckRateLimit.mockResolvedValue({
      success: true,
      remaining: 4,
      reset: Date.now() + 60_000,
    })
    mockRequirePermissionAsync.mockResolvedValue(null)
  })

  it('rejects parsing for users without MANAGE_LETTERS', async () => {
    mockRequirePermissionAsync.mockResolvedValue(
      NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    )

    const { POST } = await import('../parse-pdf/route')
    const request = buildParseRequest(new Blob(['pdf'], { type: 'application/pdf' }))
    const response = await POST(request)

    expect(response.status).toBe(403)
    expect(mockExtractLetterDataFromPdf).not.toHaveBeenCalled()
  })

  it('rate limits expensive AI parsing requests', async () => {
    mockCheckRateLimit.mockResolvedValue({
      success: false,
      remaining: 0,
      reset: Date.now() + 60_000,
    })

    const { POST } = await import('../parse-pdf/route')
    const request = buildParseRequest(new Blob(['pdf'], { type: 'application/pdf' }))
    const response = await POST(request)

    expect(response.status).toBe(429)
    expect(mockExtractLetterDataFromPdf).not.toHaveBeenCalled()
  })

  it('rejects oversized files before calling AI', async () => {
    const { AI_PARSE_MAX_FILE_SIZE } = await import('@/lib/constants')
    const { POST } = await import('../parse-pdf/route')
    const oversizedBlob = new Blob([Buffer.alloc(AI_PARSE_MAX_FILE_SIZE + 1)], {
      type: 'application/pdf',
    })

    const request = buildParseRequest(oversizedBlob)
    const response = await POST(request)

    expect(response.status).toBe(400)
    expect(mockExtractLetterDataFromPdf).not.toHaveBeenCalled()
  })

  it('rejects unsupported file types before calling AI', async () => {
    const { POST } = await import('../parse-pdf/route')
    const request = buildParseRequest(
      new Blob(['not supported'], { type: 'text/plain' }),
      'letter.txt'
    )
    const response = await POST(request)

    expect(response.status).toBe(400)
    expect(mockExtractLetterDataFromPdf).not.toHaveBeenCalled()
    expect(mockExtractLetterDataWithAI).not.toHaveBeenCalled()
  })

  it('uses extracted AI fields directly without a second translation call', async () => {
    mockExtractLetterDataFromPdf.mockResolvedValue({
      number: 'AI-001',
      date: '2026-04-01',
      organization: 'Министерство здравоохранения',
      region: 'Ташкентская область',
      district: 'Юнусабадский район',
      contentSummary: 'Краткое содержание',
      contentRussian: 'Полный перевод',
    })

    const { POST } = await import('../parse-pdf/route')
    const request = buildParseRequest(new Blob(['pdf'], { type: 'application/pdf' }))
    const response = await POST(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.data.organization).toBe('Министерство здравоохранения')
    expect(payload.data.region).toBe('Ташкентская область')
    expect(payload.data.district).toBe('Юнусабадский район')
    expect(mockExtractLetterDataFromPdf).toHaveBeenCalledTimes(1)
    expect(mockExtractLetterDataWithAI).not.toHaveBeenCalled()
  })

  it('parses DOCX files through local text extraction before calling AI', async () => {
    mockExtractTextFromOfficeDocument.mockResolvedValue('DOCX content for Gemini')
    mockExtractLetterDataWithAI.mockResolvedValue({
      number: 'DOCX-001',
      date: '2026-04-02',
      organization: 'DOCX организация',
      region: 'Ташкент',
      district: 'Мирабад',
      contentSummary: 'Извлечено из DOCX',
      contentRussian: 'Русский текст',
    })

    const { POST } = await import('../parse-pdf/route')
    const request = buildParseRequest(
      new Blob(['docx'], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      }),
      'letter.docx'
    )
    const response = await POST(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.data.number).toBe('DOCX-001')
    expect(mockExtractTextFromOfficeDocument).toHaveBeenCalledTimes(1)
    expect(mockExtractLetterDataWithAI).toHaveBeenCalledWith('DOCX content for Gemini')
    expect(mockExtractLetterDataFromPdf).not.toHaveBeenCalled()
  })
})
