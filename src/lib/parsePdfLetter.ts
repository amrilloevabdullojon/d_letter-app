// Парсер для извлечения данных писем из PDF
// Поддерживает узбекские официальные письма

export interface ParsedLetterData {
  number: string | null        // Номер письма (например: "1-son", "7941")
  date: Date | null            // Дата письма
  organization: string | null  // Организация-отправитель
  content: string | null       // Содержание/суть письма
  documentCode: string | null  // Код документа (например: OI70484228)
  region: string | null        // Регион/область
  district: string | null      // Район
  rawText: string              // Полный текст PDF
}

// Узбекские месяцы
const UZ_MONTHS: Record<string, number> = {
  'yanvar': 0, 'fevral': 1, 'mart': 2, 'aprel': 3,
  'may': 4, 'iyun': 5, 'iyul': 6, 'avgust': 7,
  'sentyabr': 8, 'oktabr': 9, 'noyabr': 10, 'dekabr': 11
}

// Русские месяцы
const RU_MONTHS: Record<string, number> = {
  'января': 0, 'февраля': 1, 'марта': 2, 'апреля': 3,
  'мая': 4, 'июня': 5, 'июля': 6, 'августа': 7,
  'сентября': 8, 'октября': 9, 'ноября': 10, 'декабря': 11,
  'январь': 0, 'февраль': 1, 'март': 2, 'апрель': 3,
  'май': 4, 'июнь': 5, 'июль': 6, 'август': 7,
  'сентябрь': 8, 'октябрь': 9, 'ноябрь': 10, 'декабрь': 11
}

/**
 * Извлекает номер письма из текста
 */
function extractNumber(text: string): string | null {
  // Паттерны для номеров писем
  const patterns = [
    /(\d+)-son/i,                           // 1-son, 123-son
    /№\s*(\d+)/,                            // № 123
    /номер[:\s]+(\d+)/i,                    // номер: 123
    /исх[.\s]*№?\s*(\d+)/i,                 // исх. № 123
    /(\d{4,})_/,                            // 7941_ (из имени файла)
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      return match[1]
    }
  }

  return null
}

/**
 * Извлекает дату из текста (поддержка узбекского и русского)
 */
function extractDate(text: string): Date | null {
  // Узбекский формат: 22 oktabr 2025 yil
  const uzPattern = /(\d{1,2})\s+(yanvar|fevral|mart|aprel|may|iyun|iyul|avgust|sentyabr|oktabr|noyabr|dekabr)\s+(\d{4})/i
  const uzMatch = text.match(uzPattern)
  if (uzMatch) {
    const day = parseInt(uzMatch[1])
    const month = UZ_MONTHS[uzMatch[2].toLowerCase()]
    const year = parseInt(uzMatch[3])
    if (month !== undefined) {
      return new Date(year, month, day)
    }
  }

  // Русский формат: 22 октября 2025
  const ruPattern = /(\d{1,2})\s+(января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)\s+(\d{4})/i
  const ruMatch = text.match(ruPattern)
  if (ruMatch) {
    const day = parseInt(ruMatch[1])
    const month = RU_MONTHS[ruMatch[2].toLowerCase()]
    const year = parseInt(ruMatch[3])
    if (month !== undefined) {
      return new Date(year, month, day)
    }
  }

  // Цифровой формат: 22.10.2025 или 2025-10-22
  const numericPatterns = [
    /(\d{2})\.(\d{2})\.(\d{4})/,  // DD.MM.YYYY
    /(\d{4})-(\d{2})-(\d{2})/,    // YYYY-MM-DD
  ]

  for (const pattern of numericPatterns) {
    const match = text.match(pattern)
    if (match) {
      if (pattern.source.startsWith('(\\d{4})')) {
        // YYYY-MM-DD
        return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]))
      } else {
        // DD.MM.YYYY
        return new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]))
      }
    }
  }

  return null
}

/**
 * Извлекает организацию из текста
 */
function extractOrganization(text: string): string | null {
  // Ищем типичные организации
  const orgPatterns = [
    // Поликлиники
    /(\d+-son\s+oilaviy\s+poliklinika)/i,
    /(\d+-сон\s+оилавий\s+поликлиника)/i,
    // Больницы
    /(tuman\s+markaziy\s+shifoxona[si]*)/i,
    /(районн[аяый]+\s+больниц[аы])/i,
    // ССБ - отделы здравоохранения
    /([A-Za-z'']+\s+tuman\s+[Ss]og['']liqni\s+[Ss]aqlash\s+bo['']limi)/i,
    // Области
    /([A-Za-z]+\s+viloyati)/i,
  ]

  for (const pattern of orgPatterns) {
    const match = text.match(pattern)
    if (match) {
      return match[1].trim()
    }
  }

  // Поиск упоминаний конкретных учреждений
  const lines = text.split('\n')
  for (const line of lines) {
    if (line.includes('poliklinika') || line.includes('shifoxona') ||
        line.includes('поликлиника') || line.includes('больница')) {
      const cleaned = line.trim().substring(0, 100)
      if (cleaned.length > 10) {
        return cleaned
      }
    }
  }

  return null
}

/**
 * Извлекает регион (область)
 */
function extractRegion(text: string): string | null {
  const regionPatterns = [
    /(Toshkent|Buxoro|Samarqand|Farg['']ona|Andijon|Namangan|Qashqadaryo|Surxondaryo|Jizzax|Sirdaryo|Navoiy|Xorazm|Qoraqalpog['']iston)\s+viloyati/i,
    /(Ташкент|Бухара|Самарканд|Фергана|Андижан|Наманган|Кашкадарья|Сурхандарья|Джизак|Сырдарья|Навои|Хорезм|Каракалпакстан)[аской]+\s+(область|вилоят)/i,
  ]

  for (const pattern of regionPatterns) {
    const match = text.match(pattern)
    if (match) {
      return match[0]
    }
  }

  return null
}

/**
 * Извлекает район
 */
function extractDistrict(text: string): string | null {
  const districtPattern = /([A-Za-z'']+)\s+tuman/i
  const match = text.match(districtPattern)
  if (match) {
    return match[1] + ' tuman'
  }

  const ruPattern = /([А-Яа-яЁё]+)[аской]+\s+район/i
  const ruMatch = text.match(ruPattern)
  if (ruMatch) {
    return ruMatch[0]
  }

  return null
}

/**
 * Извлекает код документа
 */
function extractDocumentCode(text: string): string | null {
  // IJRO.GOV.UZ коды: OI70484228
  const codePattern = /(?:Ҳужжат\s+коди|код[а]?\s+документа|Document\s+code)[:\s]*([A-Z0-9]+)/i
  const match = text.match(codePattern)
  if (match) {
    return match[1]
  }

  // Прямой поиск кода формата OI + цифры
  const directCode = text.match(/\b(OI\d{8,})\b/)
  if (directCode) {
    return directCode[1]
  }

  return null
}

/**
 * Извлекает содержание письма (краткое описание)
 */
function extractContent(text: string): string | null {
  // Ключевые слова для поиска сути письма
  const keywords = [
    'DMED', 'dmed', 'ДМЕД',
    'to\'g\'irlash', 'тўғирлаш', 'исправ',
    'homilador', 'хомиладор', 'беременн',
    'yordam', 'ёрдам', 'помощь',
    'o\'zgartirish', 'ўзгартириш', 'измен',
    'qo\'shish', 'қўшиш', 'добав',
    'o\'chirish', 'ўчириш', 'удал',
  ]

  // Ищем предложения с ключевыми словами
  const sentences = text.split(/[.!?\n]/)
  for (const sentence of sentences) {
    const lowerSentence = sentence.toLowerCase()
    for (const keyword of keywords) {
      if (lowerSentence.includes(keyword.toLowerCase())) {
        const cleaned = sentence.trim()
        if (cleaned.length > 20 && cleaned.length < 500) {
          return cleaned
        }
      }
    }
  }

  // Если не нашли, берём первое длинное предложение после шапки
  let foundHeader = false
  for (const sentence of sentences) {
    if (sentence.includes('raxbariga') || sentence.includes('руководител')) {
      foundHeader = true
      continue
    }
    if (foundHeader) {
      const cleaned = sentence.trim()
      if (cleaned.length > 50) {
        return cleaned.substring(0, 300)
      }
    }
  }

  return null
}

/**
 * Главная функция парсинга PDF текста
 */
export function parsePdfText(text: string): ParsedLetterData {
  return {
    number: extractNumber(text),
    date: extractDate(text),
    organization: extractOrganization(text),
    content: extractContent(text),
    documentCode: extractDocumentCode(text),
    region: extractRegion(text),
    district: extractDistrict(text),
    rawText: text,
  }
}

/**
 * Вычисляет дедлайн (+7 рабочих дней по умолчанию)
 */
export function calculateDeadline(date: Date, workingDays: number = 7): Date {
  const result = new Date(date)
  let daysAdded = 0

  while (daysAdded < workingDays) {
    result.setDate(result.getDate() + 1)
    const dayOfWeek = result.getDay()
    // Пропускаем выходные (0 = воскресенье, 6 = суббота)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      daysAdded++
    }
  }

  return result
}
