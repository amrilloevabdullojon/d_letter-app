import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const number = searchParams.get('number')

  if (!number) {
    return NextResponse.json({ exists: false })
  }

  try {
    const existingLetter = await prisma.letter.findFirst({
      where: {
        number,
        deletedAt: null,
      },
      select: {
        id: true,
        number: true,
        createdAt: true,
        owner: { select: { name: true } },
      },
    })

    if (existingLetter) {
      return NextResponse.json({
        exists: true,
        letter: existingLetter,
      })
    }

    return NextResponse.json({ exists: false })
  } catch (error) {
    console.error('Error checking duplicate:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
