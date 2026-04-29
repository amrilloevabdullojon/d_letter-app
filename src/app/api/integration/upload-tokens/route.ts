import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { csrfGuard } from '@/lib/security'
import { parseAndAppendTokens } from '@/lib/integration/parse-tokens'
import { ROLE_HIERARCHY } from '@/lib/constants'
import { logger } from '@/lib/logger.server'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const csrfError = csrfGuard(request)
    if (csrfError) return csrfError

    if (ROLE_HIERARCHY[session.user.role] < ROLE_HIERARCHY['MANAGER']) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file')

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'Файл не найден' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const result = await parseAndAppendTokens(buffer)
    return NextResponse.json(result)
  } catch (error) {
    logger.error('POST /api/integration/upload-tokens', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
