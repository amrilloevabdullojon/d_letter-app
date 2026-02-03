/**
 * Test utilities for API testing
 */

import { NextRequest } from 'next/server'

/**
 * Create a mock NextRequest for testing
 */
export function createMockRequest(
  method: string,
  options: {
    url?: string
    body?: unknown
    searchParams?: Record<string, string>
    headers?: Record<string, string>
  } = {}
): NextRequest {
  const { url = 'http://localhost:3000', body, searchParams, headers } = options

  const urlWithParams = new URL(url)
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      urlWithParams.searchParams.set(key, value)
    })
  }

  const requestInit: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  }

  if (body && method !== 'GET') {
    requestInit.body = JSON.stringify(body)
  }

  return new NextRequest(urlWithParams.toString(), requestInit)
}

/**
 * Mock session for authenticated requests
 */
export const mockSession = {
  user: {
    id: 'test-user-id',
    name: 'Test User',
    email: 'test@example.com',
    role: 'ADMIN' as const,
    image: null,
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
}

/**
 * Mock session for regular user
 */
export const mockUserSession = {
  user: {
    id: 'test-employee-id',
    name: 'Test Employee',
    email: 'employee@example.com',
    role: 'EMPLOYEE' as const,
    image: null,
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
}

/**
 * Parse JSON response from NextResponse
 */
export async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text()
  return JSON.parse(text) as T
}

/**
 * Mock Prisma client
 */
export const mockPrisma = {
  letter: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  user: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  request: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  notification: {
    create: jest.fn(),
    findMany: jest.fn(),
    updateMany: jest.fn(),
  },
  $transaction: jest.fn((fn) => fn(mockPrisma)),
}

/**
 * Sample test data
 */
export const testData = {
  letter: {
    id: 'letter-123',
    number: 'TEST-001',
    org: 'Test Organization',
    date: new Date('2024-01-15'),
    deadlineDate: new Date('2024-01-25'),
    status: 'IN_PROGRESS' as const,
    type: 'incoming',
    content: 'Test content',
    priority: 50,
    ownerId: 'test-user-id',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },
  user: {
    id: 'test-user-id',
    name: 'Test User',
    email: 'test@example.com',
    role: 'ADMIN' as const,
    isActive: true,
  },
  request: {
    id: 'request-123',
    organization: 'Test Org',
    contactName: 'John Doe',
    contactEmail: 'john@example.com',
    contactPhone: '+1234567890',
    description: 'Test request description',
    status: 'NEW' as const,
    priority: 'NORMAL' as const,
  },
}
