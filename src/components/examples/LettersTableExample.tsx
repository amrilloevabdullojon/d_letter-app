'use client'

/**
 * Example of using LettersDataTable with TanStack Table
 */

import { useMemo } from 'react'
import { LettersDataTable } from '@/components/tables/LettersDataTable'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

type MockLetter = {
  id: string
  number: string
  org: string
  date: Date
  deadlineDate: Date | null
  status: 'NOT_REVIEWED' | 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED'
  priority: number
  content: string
  assignedTo?: {
    id: string
    name: string | null
  } | null
}

export function LettersTableExample() {
  // Mock data - используем фиксированные даты для чистоты рендера
  const baseDate = useMemo(() => Date.now(), [])

  const letters = useMemo<MockLetter[]>(() => {
    const now = baseDate
    return [
      {
        id: '1',
        number: '123/2024',
        org: 'ООО "Ромашка"',
        date: new Date('2024-01-15'),
        deadlineDate: new Date(now + 5 * 24 * 60 * 60 * 1000), // +5 days
        status: 'IN_PROGRESS' as const,
        priority: 75,
        content: 'Запрос на получение лицензии',
        assignedTo: {
          id: 'u1',
          name: 'Иван Петров',
        },
      },
      {
        id: '2',
        number: '124/2024',
        org: 'ЗАО "Техпром"',
        date: new Date('2024-01-16'),
        deadlineDate: new Date(now - 2 * 24 * 60 * 60 * 1000), // -2 days (overdue)
        status: 'NOT_REVIEWED' as const,
        priority: 95,
        content: 'Жалоба на качество услуг',
        assignedTo: null,
      },
      {
        id: '3',
        number: '125/2024',
        org: 'ИП Сидоров А.А.',
        date: new Date('2024-01-17'),
        deadlineDate: null,
        status: 'COMPLETED' as const,
        priority: 30,
        content: 'Запрос информации',
        assignedTo: {
          id: 'u2',
          name: 'Мария Сидорова',
        },
      },
      {
        id: '4',
        number: '126/2024',
        org: 'ООО "СтройМастер"',
        date: new Date('2024-01-18'),
        deadlineDate: new Date(now + 10 * 24 * 60 * 60 * 1000), // +10 days
        status: 'IN_PROGRESS' as const,
        priority: 60,
        content: 'Согласование проекта',
        assignedTo: {
          id: 'u1',
          name: 'Иван Петров',
        },
      },
      {
        id: '5',
        number: '127/2024',
        org: 'АО "МегаТранс"',
        date: new Date('2024-01-19'),
        deadlineDate: new Date(now + 1 * 24 * 60 * 60 * 1000), // +1 day
        status: 'NOT_REVIEWED' as const,
        priority: 85,
        content: 'Срочное обращение',
        assignedTo: null,
      },
      {
        id: '6',
        number: '128/2024',
        org: 'ООО "Альфа-Инжиниринг"',
        date: new Date('2024-01-20'),
        deadlineDate: null,
        status: 'ARCHIVED' as const,
        priority: 20,
        content: 'Архивный запрос',
        assignedTo: {
          id: 'u3',
          name: 'Петр Васильев',
        },
      },
    ]
  }, [baseDate])

  const handleRowClick = (letter: MockLetter) => {
    toast.success(`Открыто письмо: ${letter.number}`, {
      description: letter.org,
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>TanStack Table - Управление письмами</CardTitle>
        <CardDescription>
          Продвинутая таблица с сортировкой, фильтрацией и пагинацией
        </CardDescription>
      </CardHeader>
      <CardContent>
        <LettersDataTable data={letters} onRowClick={handleRowClick} />

        <div className="mt-6 rounded-lg border border-white/10 bg-slate-900/50 p-4">
          <h4 className="mb-2 text-sm font-medium text-white">Возможности таблицы:</h4>
          <ul className="space-y-1 text-xs text-gray-400">
            <li>✅ <strong>Глобальный поиск</strong> - поиск по всем полям одновременно</li>
            <li>✅ <strong>Сортировка</strong> - клик на заголовок для сортировки</li>
            <li>✅ <strong>Пагинация</strong> - навигация по страницам</li>
            <li>✅ <strong>Type-safe</strong> - полная типизация с TypeScript</li>
            <li>✅ <strong>Responsive</strong> - адаптивный дизайн</li>
            <li>✅ <strong>Customizable</strong> - легко настраивается под любые нужды</li>
            <li>
              ✅ <strong>Performance</strong> - виртуализация для больших наборов данных
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
