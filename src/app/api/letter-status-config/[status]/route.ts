import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/permissions'
import type { LetterStatus } from '@prisma/client'

const VALID_STATUSES = ['NOT_REVIEWED', 'ACCEPTED', 'IN_PROGRESS', 'CLARIFICATION', 'READY', 'DONE']

interface RouteParams {
  params: Promise<{ status: string }>
}

// GET - получить настройку для конкретного статуса
export async function GET(request: Request, context: RouteParams) {
  try {
    const { status } = await context.params

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Неверный статус' }, { status: 400 })
    }

    const config = await prisma.letterStatusConfig.findUnique({
      where: { status: status as LetterStatus },
    })

    if (!config) {
      return NextResponse.json({ error: 'Настройка не найдена' }, { status: 404 })
    }

    return NextResponse.json({ config })
  } catch (error) {
    console.error('Failed to load status config:', error)
    return NextResponse.json({ error: 'Не удалось загрузить настройку статуса' }, { status: 500 })
  }
}

// PUT - обновить настройку статуса
export async function PUT(request: Request, context: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    if (!hasPermission(session.user.role, 'MANAGE_SETTINGS')) {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
    }

    const { status } = await context.params

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Неверный статус' }, { status: 400 })
    }

    const body = await request.json()
    const { label, color, order, isActive } = body

    // Валидация
    if (label !== undefined && (typeof label !== 'string' || label.trim().length === 0)) {
      return NextResponse.json({ error: 'Название не может быть пустым' }, { status: 400 })
    }

    if (color !== undefined && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
      return NextResponse.json({ error: 'Неверный формат цвета' }, { status: 400 })
    }

    if (order !== undefined && (typeof order !== 'number' || order < 0)) {
      return NextResponse.json({ error: 'Неверный порядок' }, { status: 400 })
    }

    // Upsert - создать если не существует, обновить если существует
    const config = await prisma.letterStatusConfig.upsert({
      where: { status: status as LetterStatus },
      create: {
        status: status as LetterStatus,
        label: label || status,
        color: color || '#6B7280',
        order: order ?? 0,
        isActive: isActive ?? true,
      },
      update: {
        ...(label !== undefined && { label }),
        ...(color !== undefined && { color }),
        ...(order !== undefined && { order }),
        ...(isActive !== undefined && { isActive }),
      },
    })

    return NextResponse.json({ success: true, config })
  } catch (error) {
    console.error('Failed to update status config:', error)
    return NextResponse.json({ error: 'Не удалось обновить настройку статуса' }, { status: 500 })
  }
}
