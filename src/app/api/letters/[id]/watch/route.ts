import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permission-guard'
import { csrfGuard } from '@/lib/security'
import { logger } from '@/lib/logger.server'
import { invalidateLettersCache } from '@/lib/list-cache'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const csrfError = csrfGuard(request)
    if (csrfError) {
      return csrfError
    }

    const permissionError = requirePermission(session.user.role, 'VIEW_LETTERS')
    if (permissionError) {
      return permissionError
    }

    const letter = await prisma.letter.findUnique({
      where: { id },
      select: { id: true },
    })
    if (!letter) {
      return NextResponse.json({ error: 'Letter not found' }, { status: 404 })
    }

    await prisma.watcher.upsert({
      where: {
        letterId_userId: {
          letterId: id,
          userId: session.user.id,
        },
      },
      create: {
        letterId: id,
        userId: session.user.id,
        notifyOnChange: true,
        notifyOnComment: true,
        notifyOnDeadline: true,
      },
      update: {},
    })

    await invalidateLettersCache()
    return NextResponse.json({ isWatching: true })
  } catch (error) {
    logger.error('POST /api/letters/[id]/watch', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const csrfError = csrfGuard(request)
    if (csrfError) {
      return csrfError
    }

    const permissionError = requirePermission(session.user.role, 'VIEW_LETTERS')
    if (permissionError) {
      return permissionError
    }

    await prisma.watcher.deleteMany({
      where: { letterId: id, userId: session.user.id },
    })

    await invalidateLettersCache()
    return NextResponse.json({ isWatching: false })
  } catch (error) {
    logger.error('DELETE /api/letters/[id]/watch', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
