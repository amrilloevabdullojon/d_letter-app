import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth' // Assuming authOptions is here, let's verify if needed

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    let settings = await prisma.systemSettings.findUnique({
      where: { id: 'global' },
    })

    if (!settings) {
      settings = await prisma.systemSettings.create({
        data: { id: 'global' },
      })
    }

    // Не отправляем токен на клиент для безопасности, если он есть
    const { jiraToken, ...safeSettings } = settings
    const hasToken = !!jiraToken

    return NextResponse.json({ ...safeSettings, hasToken })
  } catch (error) {
    console.error('Error fetching Jira settings:', error)
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
    const { jiraHost, jiraEmail, jiraToken, jiraProjectKey } = body

    const updateData: any = {
      jiraHost,
      jiraEmail,
      jiraProjectKey,
    }

    // Обновляем токен только если он передан (не пустой)
    if (jiraToken && jiraToken.trim() !== '') {
      updateData.jiraToken = jiraToken
    }

    const settings = await prisma.systemSettings.upsert({
      where: { id: 'global' },
      update: updateData,
      create: {
        id: 'global',
        ...updateData,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating Jira settings:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
