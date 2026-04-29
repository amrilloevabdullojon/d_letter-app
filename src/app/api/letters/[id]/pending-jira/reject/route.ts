import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { logger } from '@/lib/logger.server'

// POST /api/letters/[id]/pending-jira/reject — суперадмин отклоняет заявку на Jira
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const reason: string = body.reason || 'Причина не указана'

    const letter = await prisma.letter.findUnique({
      where: { id },
      include: { owner: { select: { id: true, name: true } } },
    })

    if (!letter) {
      return NextResponse.json({ error: 'Letter not found' }, { status: 404 })
    }

    // Снимаем флаг ожидания
    await prisma.letter.update({
      where: { id },
      data: { isPendingJira: false },
    })

    // Уведомляем владельца письма об отклонении
    if (letter.ownerId) {
      await prisma.notification.create({
        data: {
          userId: letter.ownerId,
          actorId: session.user.id,
          letterId: id,
          type: 'SYSTEM',
          title: `Заявка в Jira по письму №${letter.number} отклонена`,
          body: `Суперадмин отклонил отправку письма №${letter.number} в Jira. Причина: ${reason}`,
        },
      })
    }

    logger.info('POST /api/letters/[id]/pending-jira/reject', 'Jira request rejected', {
      letterId: id,
      letterNumber: letter.number,
      rejectedBy: session.user.id,
      reason,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('POST /api/letters/[id]/pending-jira/reject', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
