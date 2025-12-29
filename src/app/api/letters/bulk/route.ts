import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import type { LetterStatus } from '@prisma/client'
import { isDoneStatus } from '@/lib/utils'

// POST /api/letters/bulk - массовое обновление писем
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { ids, action, value } = body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No letters selected' }, { status: 400 })
    }

    let updated = 0

    switch (action) {
      case 'status':
        const newStatus = value as LetterStatus
        const updateData: any = { status: newStatus }

        // Если статус "готово", установить дату закрытия
        if (isDoneStatus(newStatus)) {
          updateData.closeDate = new Date()
        }

        const result = await prisma.letter.updateMany({
          where: { id: { in: ids } },
          data: updateData,
        })
        updated = result.count

        // Записать в историю для всех писем одним запросом (batch)
        await prisma.history.createMany({
          data: ids.map((id) => ({
            letterId: id,
            userId: session.user.id,
            field: 'status',
            newValue: newStatus,
          })),
        })
        break

      case 'owner':
        const ownerId = value as string
        const ownerResult = await prisma.letter.updateMany({
          where: { id: { in: ids } },
          data: { ownerId: ownerId || null },
        })
        updated = ownerResult.count

        // Записать в историю для всех писем одним запросом (batch)
        await prisma.history.createMany({
          data: ids.map((id) => ({
            letterId: id,
            userId: session.user.id,
            field: 'owner',
            newValue: ownerId,
          })),
        })
        break

      case 'delete':
        // Только админ может удалять
        if (session.user.role !== 'ADMIN') {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        // Soft delete - помечаем как удалённые
        const deleteResult = await prisma.letter.updateMany({
          where: { id: { in: ids } },
          data: { deletedAt: new Date() },
        })
        updated = deleteResult.count

        // Записать в историю
        await prisma.history.createMany({
          data: ids.map((id) => ({
            letterId: id,
            userId: session.user.id,
            field: 'deleted',
            newValue: 'true',
          })),
        })
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json({ success: true, updated })
  } catch (error) {
    console.error('POST /api/letters/bulk error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
