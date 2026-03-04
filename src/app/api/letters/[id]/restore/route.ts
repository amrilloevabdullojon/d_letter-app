import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { csrfGuard } from '@/lib/security'
import { logger } from '@/lib/logger.server'
import { invalidateLettersCache } from '@/lib/list-cache'

/**
 * POST /api/letters/[id]/restore
 * Восстанавливает мягко-удалённое письмо (отменяет deletedAt).
 * Используется кнопкой «Отменить» в toast после удаления.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const csrfError = csrfGuard(request)
    if (csrfError) return csrfError

    // Найти письмо, которое было мягко-удалено
    const letter = await prisma.letter.findFirst({
      where: { id, deletedAt: { not: null } },
      select: { id: true, number: true },
    })

    if (!letter) {
      return NextResponse.json(
        { error: 'Письмо не найдено или уже восстановлено' },
        { status: 404 }
      )
    }

    await prisma.letter.update({
      where: { id },
      data: { deletedAt: null },
    })

    await invalidateLettersCache()

    logger.info('POST /api/letters/[id]/restore', `Letter ${id} restored by ${session.user.email}`)

    return NextResponse.json({ success: true, id })
  } catch (error) {
    logger.error('POST /api/letters/[id]/restore', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
