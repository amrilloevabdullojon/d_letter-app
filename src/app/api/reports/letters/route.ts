import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { logger } from '@/lib/logger.server'
import { requirePermission } from '@/lib/permission-guard'
import { getLettersReportData, reportsQuerySchema } from '@/lib/letters-report'
import { CACHE_TTL } from '@/lib/cache'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const permissionError = requirePermission(session.user.role, 'VIEW_REPORTS')
    if (permissionError) {
      return permissionError
    }

    const queryObject = Object.fromEntries(request.nextUrl.searchParams.entries())
    const parsed = reportsQuerySchema.safeParse(queryObject)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || 'Invalid report query' },
        { status: 400 }
      )
    }

    const data = await getLettersReportData(parsed.data, session.user.role)
    const cacheSeconds = Math.max(1, Math.floor(CACHE_TTL.REPORTS / 1000))

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': `private, max-age=${cacheSeconds}, stale-while-revalidate=${cacheSeconds}`,
      },
    })
  } catch (error) {
    logger.error('GET /api/reports/letters', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
