import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permission-guard'
import { logger } from '@/lib/logger.server'
import { z } from 'zod'

const historyQuerySchema = z.object({
  commentId: z.string().min(1),
})

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: letterId } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const permissionError = requirePermission(session.user.role, 'VIEW_LETTERS')
    if (permissionError) {
      return permissionError
    }

    const { searchParams } = new URL(request.url)
    const parsed = historyQuerySchema.safeParse({
      commentId: searchParams.get('commentId'),
    })
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
    }

    const comment = await prisma.comment.findFirst({
      where: { id: parsed.data.commentId, letterId },
      select: { id: true },
    })
    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    const edits = await prisma.commentEdit.findMany({
      where: { commentId: comment.id },
      include: {
        editor: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ edits })
  } catch (error) {
    logger.error('GET /api/letters/[id]/comments/history', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
