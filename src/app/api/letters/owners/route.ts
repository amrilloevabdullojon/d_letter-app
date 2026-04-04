import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { requirePermission } from '@/lib/permission-guard'
import { logger } from '@/lib/logger.server'

const CONTEXT = 'API:LetterOwners'

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const permissionError = requirePermission(session.user.role, 'MANAGE_LETTERS')
    if (permissionError) {
      return permissionError
    }

    const users = await prisma.user.findMany({
      where: {
        canLogin: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        _count: {
          select: {
            letters: true,
          },
        },
      },
      orderBy: [{ name: 'asc' }, { email: 'asc' }],
      take: 200,
    })

    return NextResponse.json({
      users: users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        activeLetters: user._count.letters,
      })),
    })
  } catch (error) {
    logger.error(CONTEXT, error, { method: 'GET' })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
