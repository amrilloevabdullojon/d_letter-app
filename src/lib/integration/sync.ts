import 'server-only'
import { getIntegrationSheetsClient } from './sheets-client'

const SOURCE_SPREADSHEET_ID =
  process.env.INTEGRATION_SOURCE_SHEET_ID || '1uMH1SC9K_Vd_LWi8LjQzQSiWVm9_zN0eDlONC5LYDJI'
const REGISTRY_SPREADSHEET_ID =
  process.env.INTEGRATION_REGISTRY_SHEET_ID || '1_Fv6IuvYaMKcJZZTqy9LRSyRKmgDz8SUzezwvSzhPFk'

// Таблица1: индексы колонок источника
const T1 = {
  ID: 0,
  TIMESTAMP: 1,
  // 2: email отправителя — исключить
  FILE: 3,
  LEGAL_NAME: 4,
  BRAND_NAME: 5,
  REGION: 6,
  CITY: 7,
  ADDRESS: 8,
  COORDS: 9,
  TYPE: 10,
  INN: 11,
  DIRECTOR: 12,
  DIRECTOR_EMAIL: 13,
  // 14: официальный email аптеки — исключить
  SERVICE: 15,
  LICENSE_CHECK: 16,
  STAFF_LICENSE_CHECK: 17,
  STATUS: 18,
  // 19: № письма — исключить
  // 20: примечание — исключить
}

// Маппинг T1 → T2 (порядок определяет колонки T2)
const T1_TO_T2_COLS = [
  T1.ID,
  T1.TIMESTAMP,
  T1.FILE,
  T1.LEGAL_NAME,
  T1.BRAND_NAME,
  T1.REGION,
  T1.CITY,
  T1.ADDRESS,
  T1.COORDS,
  T1.TYPE,
  T1.INN,
  T1.DIRECTOR,
  T1.DIRECTOR_EMAIL,
  T1.SERVICE,
  T1.LICENSE_CHECK,
  T1.STAFF_LICENSE_CHECK,
  T1.STATUS,
]

const APPROVED_STATUS = 'Утверждена МЗ'

export interface SyncResult {
  added: number
  skipped: number
  total: number
  timestamp: string
  error?: string
}

// In-memory store для последнего результата синхронизации
let lastSyncResult: SyncResult | null = null

export function getLastSyncResult(): SyncResult | null {
  return lastSyncResult
}

function setLastSyncResult(result: SyncResult) {
  lastSyncResult = result
}

function getCell(row: string[], index: number): string {
  return String(row[index] ?? '').trim()
}

function isValidId(id: string): boolean {
  return id.startsWith('ID-')
}

export async function syncT1ToT2(): Promise<SyncResult> {
  const sheets = await getIntegrationSheetsClient()
  const timestamp = new Date().toISOString()

  try {
    // Читаем T1 начиная со строки 2 (строка 1 — заголовки)
    const sourceResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SOURCE_SPREADSHEET_ID,
      range: 'A2:U',
    })
    const sourceRows = (sourceResponse.data.values || []) as string[][]

    // Фильтруем только одобренные заявки с корректным ID
    const approved = sourceRows.filter((row) => {
      const id = getCell(row, T1.ID)
      const status = getCell(row, T1.STATUS)
      return isValidId(id) && status === APPROVED_STATUS
    })

    // Читаем T2 для дедупликации по ID Заявки (col 0)
    const registryResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: REGISTRY_SPREADSHEET_ID,
      range: 'A2:Q',
    })
    const registryRows = (registryResponse.data.values || []) as string[][]

    const existingIds = new Set<string>(
      registryRows.map((row) => getCell(row, 0)).filter((id) => isValidId(id))
    )

    // Находим новые строки (которых ещё нет в T2)
    const newRows = approved.filter((row) => {
      const id = getCell(row, T1.ID)
      return !existingIds.has(id)
    })

    // Маппим колонки T1 → T2
    const mappedRows = newRows.map((row) => T1_TO_T2_COLS.map((colIndex) => getCell(row, colIndex)))

    // Аппендим в T2
    if (mappedRows.length > 0) {
      await sheets.spreadsheets.values.append({
        spreadsheetId: REGISTRY_SPREADSHEET_ID,
        range: 'A:Q',
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: mappedRows,
        },
      })
    }

    const result: SyncResult = {
      added: mappedRows.length,
      skipped: approved.length - mappedRows.length,
      total: approved.length,
      timestamp,
    }

    setLastSyncResult(result)
    return result
  } catch (error) {
    const result: SyncResult = {
      added: 0,
      skipped: 0,
      total: 0,
      timestamp,
      error: error instanceof Error ? error.message : String(error),
    }
    setLastSyncResult(result)
    throw error
  }
}
