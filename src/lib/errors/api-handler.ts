import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { TRPCError } from '@trpc/server'
import { AppError, isAppError } from './app-error'

/**
 * Maps tRPC error codes to HTTP status codes
 */
const TRPC_STATUS_MAP: Record<string, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  BAD_REQUEST: 400,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  PARSE_ERROR: 400,
  UNPROCESSABLE_CONTENT: 422,
  INTERNAL_SERVER_ERROR: 500,
}

/**
 * Format Zod validation errors into a readable format
 */
function formatZodErrors(error: ZodError) {
  return error.errors.map((e) => ({
    path: e.path.join('.'),
    message: e.message,
  }))
}

/**
 * Handle and transform errors into standardized API responses
 *
 * @example
 * ```ts
 * export async function GET(req: Request) {
 *   try {
 *     // ... your logic
 *   } catch (error) {
 *     return handleApiError(error)
 *   }
 * }
 * ```
 */
export function handleApiError(error: unknown): NextResponse {
  // Log error for debugging
  console.error('API Error:', error)

  // Handle AppError
  if (isAppError(error)) {
    return NextResponse.json(error.toJSON(), { status: error.statusCode })
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: 'VALIDATION_ERROR',
        message: 'Invalid input data',
        details: formatZodErrors(error),
      },
      { status: 400 }
    )
  }

  // Handle tRPC errors
  if (error instanceof TRPCError) {
    const statusCode = TRPC_STATUS_MAP[error.code] || 500
    return NextResponse.json(
      {
        error: error.code,
        message: error.message,
      },
      { status: statusCode }
    )
  }

  // Handle Prisma errors
  if (error && typeof error === 'object' && 'code' in error) {
    const prismaError = error as { code: string; message?: string }

    // Unique constraint violation
    if (prismaError.code === 'P2002') {
      return NextResponse.json(
        {
          error: 'CONFLICT',
          message: 'A record with this value already exists',
        },
        { status: 409 }
      )
    }

    // Record not found
    if (prismaError.code === 'P2025') {
      return NextResponse.json(
        {
          error: 'NOT_FOUND',
          message: 'Record not found',
        },
        { status: 404 }
      )
    }
  }

  // Handle standard Error objects
  if (error instanceof Error) {
    // Don't expose internal error messages in production
    const message =
      process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : error.message

    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message,
      },
      { status: 500 }
    )
  }

  // Unknown error type
  return NextResponse.json(
    {
      error: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
    { status: 500 }
  )
}

/**
 * Higher-order function to wrap API handlers with error handling
 *
 * @example
 * ```ts
 * export const GET = withErrorHandler(async (req) => {
 *   const data = await prisma.letter.findMany()
 *   return NextResponse.json(data)
 * })
 *
 * export const POST = withErrorHandler(async (req) => {
 *   const body = await req.json()
 *   const validated = schema.parse(body) // Throws ZodError if invalid
 *
 *   const letter = await prisma.letter.create({ data: validated })
 *   return NextResponse.json(letter, { status: 201 })
 * })
 * ```
 */
export function withErrorHandler<T extends Record<string, unknown> = Record<string, unknown>>(
  handler: (req: Request, context: T) => Promise<NextResponse>
) {
  return async (req: Request, context: T): Promise<NextResponse> => {
    try {
      return await handler(req, context)
    } catch (error) {
      return handleApiError(error)
    }
  }
}

/**
 * Helper to create standardized success responses
 */
export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json(data, { status })
}

/**
 * Helper to create standardized error responses
 */
export function apiError(
  code: string,
  message: string,
  status = 400,
  details?: Record<string, unknown>
) {
  return NextResponse.json(
    {
      error: code,
      message,
      ...(details && { details }),
    },
    { status }
  )
}
