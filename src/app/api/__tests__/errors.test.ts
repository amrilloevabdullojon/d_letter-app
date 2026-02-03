/**
 * Error Handling Tests
 */

import { AppError, isAppError } from '@/lib/errors/app-error'
import { handleApiError, withErrorHandler, apiSuccess, apiError } from '@/lib/errors/api-handler'
import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

describe('AppError', () => {
  describe('constructor', () => {
    it('should create error with correct properties', () => {
      const error = new AppError('NOT_FOUND', 'Resource not found')

      expect(error.code).toBe('NOT_FOUND')
      expect(error.message).toBe('Resource not found')
      expect(error.statusCode).toBe(404)
      expect(error.name).toBe('AppError')
    })

    it('should include details when provided', () => {
      const error = new AppError('VALIDATION_ERROR', 'Invalid input', { field: 'email' })

      expect(error.details).toEqual({ field: 'email' })
    })
  })

  describe('factory methods', () => {
    it('should create validation error', () => {
      const error = AppError.validation('Invalid email', { field: 'email' })

      expect(error.code).toBe('VALIDATION_ERROR')
      expect(error.statusCode).toBe(400)
      expect(error.details).toEqual({ field: 'email' })
    })

    it('should create not found error', () => {
      const error = AppError.notFound('Letter', 'abc123')

      expect(error.code).toBe('NOT_FOUND')
      expect(error.statusCode).toBe(404)
      expect(error.message).toContain('Letter')
      expect(error.message).toContain('abc123')
    })

    it('should create unauthorized error', () => {
      const error = AppError.unauthorized()

      expect(error.code).toBe('UNAUTHORIZED')
      expect(error.statusCode).toBe(401)
    })

    it('should create forbidden error', () => {
      const error = AppError.forbidden('Access denied')

      expect(error.code).toBe('FORBIDDEN')
      expect(error.statusCode).toBe(403)
    })

    it('should create rate limited error', () => {
      const error = AppError.rateLimited(60)

      expect(error.code).toBe('RATE_LIMITED')
      expect(error.statusCode).toBe(429)
      expect(error.details).toEqual({ retryAfter: 60 })
    })
  })

  describe('toJSON', () => {
    it('should serialize to JSON correctly', () => {
      const error = new AppError('CONFLICT', 'Already exists', { id: '123' })
      const json = error.toJSON()

      expect(json).toEqual({
        error: 'CONFLICT',
        message: 'Already exists',
        details: { id: '123' },
      })
    })

    it('should omit details when not provided', () => {
      const error = new AppError('INTERNAL_ERROR', 'Something went wrong')
      const json = error.toJSON()

      expect(json).toEqual({
        error: 'INTERNAL_ERROR',
        message: 'Something went wrong',
      })
    })
  })
})

describe('isAppError', () => {
  it('should return true for AppError instances', () => {
    const error = new AppError('NOT_FOUND', 'Not found')
    expect(isAppError(error)).toBe(true)
  })

  it('should return false for regular Error', () => {
    const error = new Error('Regular error')
    expect(isAppError(error)).toBe(false)
  })

  it('should return false for non-errors', () => {
    expect(isAppError(null)).toBe(false)
    expect(isAppError(undefined)).toBe(false)
    expect(isAppError('string')).toBe(false)
    expect(isAppError({})).toBe(false)
  })
})

describe('handleApiError', () => {
  it('should handle AppError', async () => {
    const error = AppError.notFound('Letter')
    const response = handleApiError(error)

    expect(response.status).toBe(404)

    const body = await response.json()
    expect(body.error).toBe('NOT_FOUND')
  })

  it('should handle ZodError', async () => {
    const zodError = new ZodError([
      {
        code: 'invalid_type',
        expected: 'string',
        received: 'number',
        path: ['email'],
        message: 'Expected string, received number',
      },
    ])

    const response = handleApiError(zodError)

    expect(response.status).toBe(400)

    const body = await response.json()
    expect(body.error).toBe('VALIDATION_ERROR')
    expect(body.details).toBeDefined()
  })

  it('should handle unknown errors', async () => {
    const response = handleApiError(new Error('Unknown error'))

    expect(response.status).toBe(500)

    const body = await response.json()
    expect(body.error).toBe('INTERNAL_ERROR')
  })
})

describe('withErrorHandler', () => {
  it('should pass through successful responses', async () => {
    const handler = withErrorHandler(async () => {
      return NextResponse.json({ success: true })
    })

    const response = await handler(new Request('http://localhost'), {})
    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.success).toBe(true)
  })

  it('should catch and handle errors', async () => {
    const handler = withErrorHandler(async () => {
      throw AppError.notFound('User')
    })

    const response = await handler(new Request('http://localhost'), {})
    expect(response.status).toBe(404)
  })
})

describe('apiSuccess', () => {
  it('should create success response', async () => {
    const response = apiSuccess({ id: '123' })

    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.id).toBe('123')
  })

  it('should accept custom status code', async () => {
    const response = apiSuccess({ created: true }, 201)

    expect(response.status).toBe(201)
  })
})

describe('apiError', () => {
  it('should create error response', async () => {
    const response = apiError('CUSTOM_ERROR', 'Something failed', 400)

    expect(response.status).toBe(400)

    const body = await response.json()
    expect(body.error).toBe('CUSTOM_ERROR')
    expect(body.message).toBe('Something failed')
  })
})
