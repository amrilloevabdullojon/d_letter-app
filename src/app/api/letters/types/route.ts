import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { LETTER_TYPES } from '@/lib/constants'
import { requirePermission } from '@/lib/permission-guard'

// GET /api/letters/types — список всех типов (встроенных + пользовательских из БД)
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const permissionError = requirePermission(session.user.role, 'VIEW_LETTERS')
  if (permissionError) return permissionError

  // Получаем уникальные типы из БД
  const rows = await prisma.letter.findMany({
    where: { deletedAt: null, type: { not: null } },
    select: { type: true },
    distinct: ['type'],
    orderBy: { type: 'asc' },
  })

  const hardcodedValues = new Set<string>(LETTER_TYPES.map((t) => t.value))

  // Добавляем пользовательские типы, которых нет в встроенном списке
  const customTypes = rows
    .map((r) => r.type!)
    .filter((t) => t && !hardcodedValues.has(t))
    .sort((a, b) => a.localeCompare(b, 'ru'))

  const allTypes = [
    ...LETTER_TYPES.filter((t) => t.value !== 'all'),
    ...customTypes.map((t) => ({ value: t, label: t })),
  ]

  return NextResponse.json({ types: allTypes })
}
