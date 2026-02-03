/**
 * Centralized error handling module
 *
 * @example
 * ```ts
 * // In API routes
 * import { AppError, withErrorHandler, apiSuccess } from '@/lib/errors'
 *
 * export const GET = withErrorHandler(async (req) => {
 *   const letter = await prisma.letter.findUnique({ where: { id } })
 *   if (!letter) {
 *     throw AppError.notFound('Letter', id)
 *   }
 *   return apiSuccess(letter)
 * })
 *
 * // In services
 * import { AppError } from '@/lib/errors'
 *
 * async function updateLetter(id: string, data: UpdateData) {
 *   const letter = await prisma.letter.findUnique({ where: { id } })
 *   if (!letter) {
 *     throw AppError.notFound('Letter', id)
 *   }
 *   if (letter.status === 'DONE') {
 *     throw AppError.forbidden('Cannot update completed letter')
 *   }
 *   return prisma.letter.update({ where: { id }, data })
 * }
 * ```
 */

export { AppError, isAppError, type ErrorCode } from './app-error'
export {
  handleApiError,
  withErrorHandler,
  apiSuccess,
  apiError,
} from './api-handler'
