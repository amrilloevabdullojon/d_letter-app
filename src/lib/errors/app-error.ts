/**
 * Standardized error codes for the application
 */
export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'
  | 'EXTERNAL_SERVICE_ERROR'
  | 'BAD_REQUEST'
  | 'UNPROCESSABLE_ENTITY'

/**
 * HTTP status code mapping for error codes
 */
const ERROR_STATUS_CODES: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
  EXTERNAL_SERVICE_ERROR: 502,
}

/**
 * Standardized application error class
 *
 * Use this class for all application errors to ensure consistent
 * error handling and API responses.
 *
 * @example
 * ```ts
 * // Simple usage
 * throw new AppError('NOT_FOUND', 'Letter not found')
 *
 * // With details
 * throw new AppError('VALIDATION_ERROR', 'Invalid input', { fields: ['email'] })
 *
 * // Using factory methods
 * throw AppError.notFound('Letter')
 * throw AppError.validation('Email is required', { field: 'email' })
 * ```
 */
export class AppError extends Error {
  public readonly code: ErrorCode
  public readonly statusCode: number
  public readonly details?: Record<string, unknown>
  public readonly isOperational: boolean = true

  constructor(
    code: ErrorCode,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.statusCode = ERROR_STATUS_CODES[code]
    this.details = details

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor)
  }

  /**
   * Convert to JSON for API responses
   */
  toJSON() {
    return {
      error: this.code,
      message: this.message,
      ...(this.details && { details: this.details }),
    }
  }

  // Factory methods for common errors

  /**
   * Create a validation error
   */
  static validation(message: string, details?: Record<string, unknown>) {
    return new AppError('VALIDATION_ERROR', message, details)
  }

  /**
   * Create a not found error
   */
  static notFound(resource: string, id?: string) {
    const message = id
      ? `${resource} with id "${id}" not found`
      : `${resource} not found`
    return new AppError('NOT_FOUND', message, { resource, id })
  }

  /**
   * Create an unauthorized error
   */
  static unauthorized(message = 'Authentication required') {
    return new AppError('UNAUTHORIZED', message)
  }

  /**
   * Create a forbidden error
   */
  static forbidden(message = 'Access denied') {
    return new AppError('FORBIDDEN', message)
  }

  /**
   * Create a conflict error
   */
  static conflict(message: string, details?: Record<string, unknown>) {
    return new AppError('CONFLICT', message, details)
  }

  /**
   * Create a rate limit error
   */
  static rateLimited(retryAfter?: number) {
    return new AppError('RATE_LIMITED', 'Too many requests', { retryAfter })
  }

  /**
   * Create a bad request error
   */
  static badRequest(message: string, details?: Record<string, unknown>) {
    return new AppError('BAD_REQUEST', message, details)
  }

  /**
   * Create an internal error
   */
  static internal(message = 'Internal server error') {
    return new AppError('INTERNAL_ERROR', message)
  }

  /**
   * Create an external service error
   */
  static externalService(service: string, message?: string) {
    return new AppError(
      'EXTERNAL_SERVICE_ERROR',
      message || `External service "${service}" is unavailable`,
      { service }
    )
  }
}

/**
 * Type guard to check if an error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}
