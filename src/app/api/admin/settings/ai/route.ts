import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    let settings = await prisma.systemSettings.findUnique({
      where: { id: 'global' },
      select: { aiEnabled: true, aiChatEnabled: true, aiParsingEnabled: true },
    })

    if (!settings) {
      settings = await prisma.systemSettings.create({
        data: { id: 'global' },
      })
    }

    return NextResponse.json({
      aiEnabled: settings.aiEnabled,
      aiChatEnabled: settings.aiChatEnabled,
      aiParsingEnabled: settings.aiParsingEnabled,
    })
  } catch (error) {
    console.error('Error fetching AI settings:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { aiEnabled, aiChatEnabled, aiParsingEnabled } = body

    const updateData = {
      aiEnabled: Boolean(aiEnabled),
      aiChatEnabled: Boolean(aiChatEnabled),
      aiParsingEnabled: Boolean(aiParsingEnabled),
    }

    await prisma.systemSettings.upsert({
      where: { id: 'global' },
      update: updateData,
      create: {
        id: 'global',
        ...updateData,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating AI settings:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
