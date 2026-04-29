'use server'

import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function checkOverdueLetters() {
  const session = await getServerSession(authOptions)
  if (!session) return { count: 0 }

  try {
    const overdueCount = await prisma.letter.count({
      where: {
        ownerId: session.user.id,
        status: { notIn: ['DONE', 'PROCESSED', 'REJECTED', 'READY', 'FROZEN'] },
        deadlineDate: { lt: new Date() },
        deletedAt: null,
      },
    })

    return { count: overdueCount }
  } catch (error) {
    console.error('Failed to check overdue letters', error)
    return { count: 0 }
  }
}
