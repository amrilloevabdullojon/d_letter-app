import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { logger } from '@/lib/logger.server'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const letter = await prisma.letter.findUnique({
      where: { id },
    })

    if (!letter) {
      return NextResponse.json({ error: 'Letter not found' }, { status: 404 })
    }

    // Помечаем как ожидающее модерации суперадмином
    await prisma.letter.update({
      where: { id },
      data: { isPendingJira: true },
    })

    // Опционально: создаем уведомление для суперадминов
    const superAdmins = await prisma.user.findMany({
      where: { role: 'SUPERADMIN' },
    })

    if (superAdmins.length > 0) {
      await prisma.notification.createMany({
        data: superAdmins.map((admin) => ({
          userId: admin.id,
          actorId: session.user.id,
          letterId: id,
          type: 'SYSTEM',
          title: 'Новая задача на модерацию в Jira',
          body: `Пользователь ${session.user.name || session.user.email} отправил задачу ${letter.number} на проверку перед публикацией в Jira.`,
        })),
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('POST /api/letters/[id]/pending-jira', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
