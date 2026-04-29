import { NextRequest, NextResponse } from 'next/server'
import { syncT1ToT2 } from '@/lib/integration/sync'
import { logger } from '@/lib/logger.server'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await syncT1ToT2()
    logger.info('Integration cron sync completed', result)
    return NextResponse.json(result)
  } catch (error) {
    logger.error('GET /api/integration/cron', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
