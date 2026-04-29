'use server'

import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { logger } from '@/lib/logger.server'

export async function saveDraftLetter(data: {
  number: string
  org: string
  date: string
  summary: string
  priority: number
  deadlineDate: string
  type?: string
}) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Не авторизован')

  try {
    const letter = await prisma.letter.create({
      data: {
        number: data.number || `DRAFT-${Date.now()}`,
        org: data.org || 'Неизвестно',
        date: new Date(data.date || new Date()),
        deadlineDate: new Date(data.deadlineDate || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)), // default +3 days
        content: data.summary,
        type: data.type || 'Черновик', // БАГ #3 ФИКС: type теперь обязательное поле
        priority: data.priority || 50,
        status: 'NOT_REVIEWED',
        ownerId: session.user.id,
      },
    })

    revalidatePath('/letters')
    return { success: true, id: letter.id }
  } catch (error: any) {
    logger.error('saveDraftLetter', error) // БАГ #6 ФИКС: используем logger
    return { success: false, error: error.message }
  }
}
