import 'server-only'
import ExcelJS from 'exceljs'
import { getIntegrationSheetsClient } from './sheets-client'

const TRANSFER_SPREADSHEET_ID =
  process.env.INTEGRATION_TRANSFER_SHEET_ID || '1MXm8ZkZgBXOgnollM1LJfAQMzFeD9z-Ph6Aq7Yr0H7U'

// Нормализация заголовка для маппинга
function normalizeHeader(h: string): string {
  return h.toLowerCase().trim().replace(/\s+/g, ' ')
}

// Маппинг нормализованного заголовка → индекс колонки T3
const T3_HEADER_MAP: Record<string, number> = {
  id: 0,
  название: 1,
  name: 1,
  адрес: 2,
  address: 2,
  инн: 3,
  inn: 3,
  токен: 4,
  token: 4,
  'электронная почта заявки': 5,
  'email заявки': 5,
  email: 5,
  'электронная почта учреждения': 6,
  'email учреждения': 6,
  система: 7,
  system: 7,
  'статус отправки': 8,
  status: 8,
  примечание: 9,
  note: 9,
  notes: 9,
}

export interface ParseTokensResult {
  appended: number
  timestamp: string
}

export async function parseAndAppendTokens(buffer: Buffer): Promise<ParseTokensResult> {
  const workbook = new ExcelJS.Workbook()
  // Cast required: newer @types/node defines Buffer<ArrayBufferLike> but ExcelJS expects plain Buffer
  await workbook.xlsx.load(buffer as unknown as Buffer)

  const worksheet = workbook.worksheets[0]
  if (!worksheet) {
    throw new Error('Excel файл не содержит листов')
  }

  // Первая строка — заголовки
  const headerRow = worksheet.getRow(1)
  const colIndexMap: Record<number, number> = {} // excelCol → T3 col

  headerRow.eachCell((cell, colNumber) => {
    const header = normalizeHeader(String(cell.value ?? ''))
    const t3Index = T3_HEADER_MAP[header]
    if (t3Index !== undefined) {
      colIndexMap[colNumber] = t3Index
    }
  })

  // Парсим строки данных (со 2-й строки)
  const rows: string[][] = []
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return // пропускаем заголовки

    const t3Row = new Array(10).fill('')
    let hasData = false

    row.eachCell((cell, colNumber) => {
      const t3Index = colIndexMap[colNumber]
      if (t3Index !== undefined) {
        const val = String(cell.value ?? '').trim()
        t3Row[t3Index] = val
        if (val) hasData = true
      }
    })

    if (hasData) {
      rows.push(t3Row)
    }
  })

  if (rows.length === 0) {
    return { appended: 0, timestamp: new Date().toISOString() }
  }

  // Аппендим в T3
  const sheets = await getIntegrationSheetsClient()
  await sheets.spreadsheets.values.append({
    spreadsheetId: TRANSFER_SPREADSHEET_ID,
    range: 'A:J',
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: rows,
    },
  })

  return {
    appended: rows.length,
    timestamp: new Date().toISOString(),
  }
}
