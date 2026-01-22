import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { CACHE_TTL } from '@/lib/cache'
import { getDashboardData, DashboardError } from '@/lib/dashboard'
import { logger } from '@/lib/logger.server'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const cacheSeconds = Math.max(1, Math.floor(CACHE_TTL.DASHBOARD / 1000))
    const responseHeaders: HeadersInit = {
      'Cache-Control': `private, max-age=${cacheSeconds}, stale-while-revalidate=${cacheSeconds}`,
    }
    const response = await getDashboardData(session)
    return NextResponse.json(response, { headers: responseHeaders })
  } catch (error) {
    if (error instanceof DashboardError) {
      return NextResponse.json(
        { error: error.code === 'UNAUTHORIZED' ? 'Unauthorized' : 'Forbidden' },
        { status: error.code === 'UNAUTHORIZED' ? 401 : 403 }
      )
    }
    logger.error('GET /api/dashboard', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
