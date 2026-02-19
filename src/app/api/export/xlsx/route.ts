import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { STATUS_LABELS, formatDate } from '@/lib/utils'
import { logger } from '@/lib/logger.server'
import { withValidation } from '@/lib/api-handler'
import { z } from 'zod'
import ExcelJS from 'exceljs'

export const dynamic = 'force-dynamic'

const exportQuerySchema = z.object({
  status: z.string().optional(),
  filter: z
    .enum(['overdue', 'urgent', 'done', 'active', 'favorites', 'unassigned', 'mine'])
    .optional(),
  owner: z.string().optional(),
  type: z.string().optional(),
  ids: z.string().optional(),
})

type ExportQuery = z.infer<typeof exportQuerySchema>

// GET /api/export/xlsx - экспорт писем в формате Excel
export const GET = withValidation<any, never, ExportQuery>(
  async (request, session, { query }) => {
    try {
      const ids = query.ids?.split(',').filter(Boolean)

      interface LetterWhereInput {
        id?: { in: string[] }
        status?: any
        ownerId?: string | null
        type?: string
        deadlineDate?: any
        favorites?: any
        deletedAt?: null
      }

      const where: LetterWhereInput = { deletedAt: null }

      if (ids && ids.length > 0) {
        where.id = { in: ids }
      } else {
        if (query.status && query.status !== 'all') {
          where.status = query.status
        }
        if (query.owner) {
          where.ownerId = query.owner
        }
        if (query.type) {
          where.type = query.type
        }

        if (query.filter === 'overdue') {
          where.deadlineDate = { lt: new Date() }
          where.status = { notIn: ['READY', 'PROCESSED', 'DONE', 'FROZEN', 'REJECTED'] }
        } else if (query.filter === 'urgent') {
          const now = new Date()
          where.deadlineDate = {
            gte: now,
            lte: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
          }
          where.status = { notIn: ['READY', 'PROCESSED', 'DONE', 'FROZEN', 'REJECTED'] }
        } else if (query.filter === 'done') {
          where.status = { in: ['READY', 'PROCESSED', 'DONE'] }
        } else if (query.filter === 'active') {
          where.status = { notIn: ['READY', 'PROCESSED', 'DONE', 'FROZEN', 'REJECTED'] }
        } else if (query.filter === 'favorites') {
          where.favorites = { some: { userId: session.user.id } }
        } else if (query.filter === 'unassigned') {
          where.ownerId = null
        } else if (query.filter === 'mine') {
          where.ownerId = session.user.id
        }
      }

      const letters = await prisma.letter.findMany({
        where,
        include: {
          owner: { select: { name: true, email: true } },
        },
        orderBy: { deadlineDate: 'asc' },
        take: 5000,
      })

      // Создаём Excel-книгу
      const workbook = new ExcelJS.Workbook()
      workbook.creator = 'DMED Letters'
      workbook.created = new Date()

      const sheet = workbook.addWorksheet('Письма')

      // Колонки с шириной
      sheet.columns = [
        { header: 'Номер', key: 'number', width: 18 },
        { header: 'Организация', key: 'org', width: 30 },
        { header: 'Дата письма', key: 'date', width: 14 },
        { header: 'Дедлайн', key: 'deadline', width: 14 },
        { header: 'Статус', key: 'status', width: 18 },
        { header: 'Тип', key: 'type', width: 20 },
        { header: 'Содержание', key: 'content', width: 40 },
        { header: 'Ответственный', key: 'owner', width: 22 },
        { header: 'Jira', key: 'jira', width: 20 },
        { header: 'Ответ', key: 'answer', width: 30 },
        { header: 'ZorDoc', key: 'zordoc', width: 20 },
        { header: 'Статус отправки', key: 'sendStatus', width: 18 },
        { header: 'Комментарий', key: 'comment', width: 30 },
        { header: 'Дата закрытия', key: 'closeDate', width: 14 },
      ]

      // Стиль заголовка
      const headerRow = sheet.getRow(1)
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0F766E' }, // teal-700
      }
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' }
      headerRow.height = 24

      // Данные
      letters.forEach((letter) => {
        sheet.addRow({
          number: letter.number,
          org: letter.org,
          date: formatDate(letter.date),
          deadline: formatDate(letter.deadlineDate),
          status: STATUS_LABELS[letter.status] || letter.status,
          type: letter.type || '',
          content: letter.content || '',
          owner: letter.owner?.name || letter.owner?.email || '',
          jira: letter.jiraLink || '',
          answer: letter.answer || '',
          zordoc: letter.zordoc || '',
          sendStatus: letter.sendStatus || '',
          comment: letter.comment || '',
          closeDate: letter.closeDate ? formatDate(letter.closeDate) : '',
        })
      })

      // Автофильтр
      sheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: sheet.columns.length },
      }

      // Зафиксировать заголовок
      sheet.views = [{ state: 'frozen', ySplit: 1 }]

      const buffer = await workbook.xlsx.writeBuffer()

      const filename = `letters_${new Date().toISOString().split('T')[0]}.xlsx`
      return new NextResponse(buffer as Buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      })
    } catch (error) {
      logger.error('GET /api/export/xlsx', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  },
  {
    minRole: 'VIEWER',
    querySchema: exportQuerySchema,
    rateLimit: 'standard',
  }
)
