import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sanitizeInput } from '@/lib/utils'
import { formatNewCommentMessage, sendTelegramMessage } from '@/lib/telegram'
import { z } from 'zod'

const commentSchema = z.object({
  text: z.string().min(1).max(2000),
  parentId: z.string().optional().nullable(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const result = commentSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      )
    }

    const text = sanitizeInput(result.data.text, 2000).trim()
    if (!text) {
      return NextResponse.json({ error: 'Комментарий пустой' }, { status: 400 })
    }

    const letter = await prisma.letter.findUnique({
      where: { id: params.id },
      include: {
        watchers: {
          include: {
            user: {
              select: { id: true, name: true, email: true, telegramChatId: true },
            },
          },
        },
      },
    })

    if (!letter) {
      return NextResponse.json({ error: 'Letter not found' }, { status: 404 })
    }

    if (result.data.parentId) {
      const parent = await prisma.comment.findFirst({
        where: { id: result.data.parentId, letterId: params.id },
        select: { id: true },
      })
      if (!parent) {
        return NextResponse.json({ error: 'Parent comment not found' }, { status: 404 })
      }
    }

    const comment = await prisma.comment.create({
      data: {
        text,
        letterId: params.id,
        authorId: session.user.id,
        parentId: result.data.parentId || null,
      },
      include: {
        author: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    const createdBy = await prisma.history.findFirst({
      where: { letterId: params.id, field: 'created' },
      orderBy: { createdAt: 'asc' },
      include: {
        user: {
          select: { id: true, name: true, email: true, telegramChatId: true },
        },
      },
    })

    const recipientChatIds = new Set<string>()

    letter.watchers.forEach((watcher) => {
      if (
        watcher.notifyOnComment &&
        watcher.user.telegramChatId &&
        watcher.user.id !== session.user.id
      ) {
        recipientChatIds.add(watcher.user.telegramChatId)
      }
    })

    if (
      createdBy?.user?.telegramChatId &&
      createdBy.user.id !== session.user.id
    ) {
      recipientChatIds.add(createdBy.user.telegramChatId)
    }

    if (recipientChatIds.size > 0) {
      const message = formatNewCommentMessage({
        letterNumber: letter.number,
        letterOrg: letter.org,
        author: session.user.name || session.user.email || 'Unknown',
        comment: text,
        isMention: false,
      })

      await Promise.all(
        Array.from(recipientChatIds).map((chatId) =>
          sendTelegramMessage(chatId, message)
        )
      )
    }

    return NextResponse.json({ success: true, comment })
  } catch (error) {
    console.error('POST /api/letters/[id]/comments error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
