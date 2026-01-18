import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { requirePermission } from '@/lib/permission-guard'
import { logger } from '@/lib/logger.server'
import { csrfGuard } from '@/lib/security'
import { z } from 'zod'

const CONTEXT = 'API:Users:Import'

// Schema для валидации импортируемых пользователей
const importUserSchema = z.object({
  name: z.string().min(1, 'Имя обязательно'),
  email: z.string().email('Некорректный email'),
  role: z.enum(['SUPERADMIN', 'ADMIN', 'MANAGER', 'AUDITOR', 'EMPLOYEE', 'VIEWER']),
  canLogin: z.boolean().optional().default(true),
  telegramChatId: z.string().optional(),
})

type ImportUser = z.infer<typeof importUserSchema>

interface ImportResult {
  success: number
  failed: number
  errors: Array<{ row: number; email: string; error: string }>
  created: Array<{ email: string; name: string }>
}

/**
 * POST /api/users/import - импорт пользователей из CSV/JSON
 *
 * Принимает массив пользователей и создает их в базе
 * Пропускает дубликаты и невалидные записи
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const permissionError = requirePermission(session.user.role, 'MANAGE_USERS')
    if (permissionError) {
      return permissionError
    }

    const csrfError = csrfGuard(request)
    if (csrfError) {
      return csrfError
    }

    const body = await request.json()
    const { users } = body as { users: unknown[] }

    if (!Array.isArray(users) || users.length === 0) {
      return NextResponse.json(
        { error: 'Требуется массив пользователей' },
        { status: 400 }
      )
    }

    if (users.length > 1000) {
      return NextResponse.json(
        { error: 'Максимум 1000 пользователей за один раз' },
        { status: 400 }
      )
    }

    const result: ImportResult = {
      success: 0,
      failed: 0,
      errors: [],
      created: [],
    }

    const isSuperAdmin = session.user.role === 'SUPERADMIN'

    // Обработка каждого пользователя
    for (let i = 0; i < users.length; i++) {
      const rowNumber = i + 1
      const userData = users[i]

      try {
        // Валидация данных
        const parseResult = importUserSchema.safeParse(userData)
        if (!parseResult.success) {
          result.failed++
          result.errors.push({
            row: rowNumber,
            email: (userData as { email?: string }).email || 'unknown',
            error: parseResult.error.errors[0]?.message || 'Ошибка валидации',
          })
          continue
        }

        const validUser = parseResult.data
        const normalizedEmail = validUser.email.toLowerCase()

        // Проверка прав на назначение роли
        if (validUser.role === 'SUPERADMIN' && !isSuperAdmin) {
          result.failed++
          result.errors.push({
            row: rowNumber,
            email: validUser.email,
            error: 'Недостаточно прав для создания SUPERADMIN',
          })
          continue
        }

        // Проверка существования пользователя
        const existingUser = await prisma.user.findUnique({
          where: { email: normalizedEmail },
          select: { id: true },
        })

        if (existingUser) {
          result.failed++
          result.errors.push({
            row: rowNumber,
            email: validUser.email,
            error: 'Пользователь с таким email уже существует',
          })
          continue
        }

        // Создание пользователя
        await prisma.user.create({
          data: {
            name: validUser.name,
            email: normalizedEmail,
            role: validUser.role,
            canLogin: validUser.canLogin,
            telegramChatId: validUser.telegramChatId || null,
          },
        })

        result.success++
        result.created.push({
          email: validUser.email,
          name: validUser.name,
        })

        logger.info(CONTEXT, 'User imported', {
          email: normalizedEmail,
          role: validUser.role,
          importedBy: session.user.email,
        })
      } catch (error) {
        result.failed++
        result.errors.push({
          row: rowNumber,
          email: (userData as { email?: string }).email || 'unknown',
          error: error instanceof Error ? error.message : 'Неизвестная ошибка',
        })
        logger.error(CONTEXT, error, {
          row: rowNumber,
          email: (userData as { email?: string }).email,
        })
      }
    }

    logger.info(CONTEXT, 'Import completed', {
      total: users.length,
      success: result.success,
      failed: result.failed,
      importedBy: session.user.email,
    })

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    logger.error(CONTEXT, error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
