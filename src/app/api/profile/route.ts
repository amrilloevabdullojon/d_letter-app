import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { csrfGuard } from '@/lib/security'
import { logger } from '@/lib/logger.server'
import { SettingsService, SettingsServiceError } from '@/services/settings.service'

// GET /api/profile - current user profile
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await SettingsService.getProfile(session.user.id)

    return NextResponse.json(data)
  } catch (error) {
    if (error instanceof SettingsServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    logger.error('GET /api/profile', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/profile - update current user profile
export async function PATCH(request: NextRequest) {
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

    // Handle token rotation
    if (body.rotatePublicToken === true) {
      const token = await SettingsService.generatePublicProfileToken(session.user.id)
      const profile = await SettingsService.updateProfile(session.user.id, {})
      return NextResponse.json({ success: true, profile, token })
    }

    const profile = await SettingsService.updateProfile(session.user.id, body)

    return NextResponse.json({ success: true, profile })
  } catch (error) {
    if (error instanceof SettingsServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    logger.error('PATCH /api/profile', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
