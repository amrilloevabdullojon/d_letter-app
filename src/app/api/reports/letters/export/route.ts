import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import ExcelJS from 'exceljs'
import { authOptions } from '@/lib/auth'
import { logger } from '@/lib/logger.server'
import { requirePermission } from '@/lib/permission-guard'
import {
  buildCsv,
  buildExportHeaders,
  buildExportRows,
  buildPrintableReportHtml,
  getLettersReportData,
  reportsExportQuerySchema,
  resolveExportColumns,
} from '@/lib/letters-report'
import { defaultReportExportColumns } from '@/lib/report-presets'
import { STATUS_LABELS } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const permissionError = requirePermission(session.user.role, 'VIEW_REPORTS')
    if (permissionError) {
      return permissionError
    }

    const queryObject = Object.fromEntries(request.nextUrl.searchParams.entries())
    const parsed = reportsExportQuerySchema.safeParse(queryObject)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || 'Invalid report export query' },
        { status: 400 }
      )
    }

    const { format, columns, ...reportQuery } = parsed.data
    const data = await getLettersReportData(reportQuery, session.user.role)
    const exportColumns = resolveExportColumns(columns, defaultReportExportColumns())
    const headers = buildExportHeaders(exportColumns)

    if (headers.length === 0 || data.report.rows.length === 0) {
      return NextResponse.json({ error: 'No report data to export' }, { status: 400 })
    }

    const ownerLabel = reportQuery.ownerId
      ? data.filters.owners.find((owner) => owner.id === reportQuery.ownerId)?.name ||
        reportQuery.ownerId
      : 'Все ответственные'
    const statusLabel =
      reportQuery.status && reportQuery.status !== 'all'
        ? STATUS_LABELS[reportQuery.status]
        : 'Все статусы'

    const rows = buildExportRows(data.report.rows, exportColumns, {
      statusLabel,
      ownerLabel,
      orgFilter: reportQuery.org || '',
      typeFilter: reportQuery.type || '',
    })
    const filenameDate = new Date().toISOString().slice(0, 10)

    if (format === 'csv') {
      const csv = buildCsv([headers, ...rows])
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="report-${filenameDate}.csv"`,
        },
      })
    }

    if (format === 'xlsx') {
      const workbook = new ExcelJS.Workbook()
      workbook.creator = 'DMED Letters'
      workbook.created = new Date()
      const sheet = workbook.addWorksheet('Report')
      sheet.addRow(headers)
      rows.forEach((row) => sheet.addRow(row))
      sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
      sheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0F766E' },
      }
      headers.forEach((header, index) => {
        const column = sheet.getColumn(index + 1)
        const maxLength = Math.max(header.length, ...rows.map((row) => (row[index] || '').length))
        column.width = Math.min(Math.max(12, maxLength + 4), 64)
      })

      const buffer = await workbook.xlsx.writeBuffer()
      return new NextResponse(buffer as ArrayBuffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="report-${filenameDate}.xlsx"`,
        },
      })
    }

    const filtersLabel = [
      `Период: ${reportQuery.periodMonths} мес.`,
      `Группировка: ${
        (reportQuery.groupBy || 'orgType') === 'orgType'
          ? 'Учреждение + Тип'
          : (reportQuery.groupBy || 'orgType') === 'org'
            ? 'Учреждение'
            : 'Тип'
      }`,
      `Детализация: ${
        (reportQuery.granularity || 'month') === 'month'
          ? 'Месяц'
          : (reportQuery.granularity || 'month') === 'quarter'
            ? 'Квартал'
            : 'Неделя'
      }`,
      reportQuery.status && reportQuery.status !== 'all' ? `Статус: ${statusLabel}` : null,
      reportQuery.ownerId ? `Ответственный: ${ownerLabel}` : null,
      reportQuery.org ? `Учреждение: ${reportQuery.org}` : null,
      reportQuery.type ? `Тип: ${reportQuery.type}` : null,
      reportQuery.search ? `Поиск: ${reportQuery.search}` : null,
    ]
      .filter(Boolean)
      .join(' | ')

    const html = buildPrintableReportHtml({
      title: 'Отчёт по учреждениям и типам писем',
      generatedAt: new Date().toLocaleString('ru-RU'),
      filtersLabel,
      headers,
      rows,
    })

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    })
  } catch (error) {
    logger.error('GET /api/reports/letters/export', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
