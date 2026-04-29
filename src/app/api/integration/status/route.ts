import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getLastSyncResult } from '@/lib/integration/sync'
import { ROLE_HIERARCHY } from '@/lib/constants'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (ROLE_HIERARCHY[session.user.role] < ROLE_HIERARCHY['MANAGER']) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json({ lastSync: getLastSyncResult() })
}
