import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/permissions'

// Дефолтные настройки для статусов
const DEFAULT_STATUS_CONFIG = [
  { status: 'NOT_REVIEWED', label: 'Не рассмотрен', color: '#6B7280', order: 0 },
  { status: 'ACCEPTED', label: 'Принят', color: '#3B82F6', order: 1 },
  { status: 'IN_PROGRESS', label: 'В работе', color: '#F59E0B', order: 2 },
  { status: 'CLARIFICATION', label: 'На уточнении', color: '#A855F7', order: 3 },
  { status: 'READY', label: 'Готово', color: '#22C55E', order: 4 },
  { status: 'DONE', label: 'Сделано', color: '#14B8A6', order: 5 },
] as const

// GET - получить все настройки статусов
export async function GET() {
  try {
    // Пробуем получить из БД, если таблица существует
    let configs: any[] = []
    let tableExists = true

    try {
      configs = await prisma.letterStatusConfig.findMany({
        orderBy: { order: 'asc' },
      })
    } catch (dbError: any) {
      // Если таблица не существует - возвращаем дефолтные
      if (dbError?.code === 'P2021' || dbError?.message?.includes('does not exist')) {
        tableExists = false
      } else {
        throw dbError
      }
    }

    // Если конфигураций нет или таблица не существует - возвращаем дефолтные
    if (!tableExists || configs.length === 0) {
      return NextResponse.json({
        configs: DEFAULT_STATUS_CONFIG.map((c, i) => ({
          id: `default-${i}`,
          ...c,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })),
        isDefault: true,
        tableExists,
      })
    }

    return NextResponse.json({ configs, isDefault: false, tableExists: true })
  } catch (error) {
    console.error('Failed to load status configs:', error)
    return NextResponse.json({ error: 'Не удалось загрузить настройки статусов' }, { status: 500 })
  }
}

// POST - инициализировать настройки (seed) или обновить порядок
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    if (!hasPermission(session.user.role, 'MANAGE_SETTINGS')) {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
    }

    const body = await request.json()

    // Если передан массив конфигураций - обновляем порядок
    if (body.configs && Array.isArray(body.configs)) {
      const updates = body.configs.map((config: { status: string; order: number }) =>
        prisma.letterStatusConfig.update({
          where: { status: config.status as any },
          data: { order: config.order },
        })
      )

      await prisma.$transaction(updates)

      const configs = await prisma.letterStatusConfig.findMany({
        orderBy: { order: 'asc' },
      })

      return NextResponse.json({ success: true, configs })
    }

    // Иначе - инициализируем дефолтные настройки
    const existingCount = await prisma.letterStatusConfig.count()
    if (existingCount > 0) {
      return NextResponse.json({ error: 'Настройки уже существуют' }, { status: 400 })
    }

    await prisma.letterStatusConfig.createMany({
      data: DEFAULT_STATUS_CONFIG.map((c) => ({
        status: c.status as any,
        label: c.label,
        color: c.color,
        order: c.order,
        isActive: true,
      })),
    })

    const configs = await prisma.letterStatusConfig.findMany({
      orderBy: { order: 'asc' },
    })

    return NextResponse.json({ success: true, configs })
  } catch (error) {
    console.error('Failed to save status configs:', error)
    return NextResponse.json({ error: 'Не удалось сохранить настройки' }, { status: 500 })
  }
}
