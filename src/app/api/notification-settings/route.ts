import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { csrfGuard } from '@/lib/security'
import { logger } from '@/lib/logger.server'
import { SettingsService, SettingsServiceError } from '@/services/settings.service'
import { notificationSettingsUpdateSchema } from '@/lib/notification-settings'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const settings = await SettingsService.getNotificationSettings(session.user.id)

    return NextResponse.json({ settings })
  } catch (error) {
    if (error instanceof SettingsServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    logger.error('GET /api/notification-settings', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const csrfError = csrfGuard(request)
    if (csrfError) {
      return csrfError
    }

    const body = await request.json()
    const parsed = notificationSettingsUpdateSchema.safeParse(body?.settings ?? body)
    if (!parsed.success) {
      // Возвращаем детальные ошибки валидации
      return NextResponse.json({
        error: 'Ошибка валидации настроек',
        details: parsed.error.errors.map((err) => ({
          path: err.path.join('.'),
          message: err.message,
        })),
      }, { status: 400 })
    }

    const settings = await SettingsService.updateNotificationSettings(
      session.user.id,
      parsed.data
    )

    // Handle subscriptions if provided
    if (parsed.data.subscriptions) {
      await SettingsService.updateNotificationSubscriptions(
        session.user.id,
        parsed.data.subscriptions
      )
    }

    return NextResponse.json({ settings })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Ошибка валидации настроек',
        details: error.errors.map((err) => ({
          path: err.path.join('.'),
          message: err.message,
        })),
      }, { status: 400 })
    }
    if (error instanceof SettingsServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    logger.error('PUT /api/notification-settings', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
