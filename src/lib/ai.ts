import 'server-only'
import { GoogleGenAI, Type } from '@google/genai'
import { z } from 'zod'
import { logger } from '@/lib/logger.server'

const genai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
})

const MAX_AI_RETRIES = 2
const AI_RETRY_BASE_DELAY_MS = 600

// ✅ ОПТИМИЗАЦИЯ: In-memory кэш для переводов
// Снижает повторные AI API вызовы для одинаковых строк
const translationCache = new Map<string, string>()
const TRANSLATION_CACHE_MAX = 1000 // Максимум 1000 переводов в кэше

function getCachedTranslation(text: string): string | null {
  return translationCache.get(text) || null
}

function setCachedTranslation(text: string, translation: string): void {
  // Простая FIFO очистка при достижении лимита
  if (translationCache.size >= TRANSLATION_CACHE_MAX) {
    const firstKey = translationCache.keys().next().value
    if (firstKey) {
      translationCache.delete(firstKey)
    }
  }
  translationCache.set(text, translation)
}

export interface ExtractedLetterData {
  number: string | null
  date: string | null
  organization: string | null
  region: string | null
  district: string | null
  contentSummary: string | null
  contentRussian: string | null
}

const nullableExtractedString = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (typeof value !== 'string') {
      return null
    }

    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
  })

const extractedLetterDataSchema = z.object({
  number: nullableExtractedString,
  date: nullableExtractedString,
  organization: nullableExtractedString,
  region: nullableExtractedString,
  district: nullableExtractedString,
  contentSummary: nullableExtractedString,
  contentRussian: nullableExtractedString,
})

const EXTRACTION_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    number: { type: Type.STRING, nullable: true },
    date: { type: Type.STRING, nullable: true },
    organization: { type: Type.STRING, nullable: true },
    region: { type: Type.STRING, nullable: true },
    district: { type: Type.STRING, nullable: true },
    contentSummary: { type: Type.STRING, nullable: true },
    contentRussian: { type: Type.STRING, nullable: true },
  },
  required: [
    'number',
    'date',
    'organization',
    'region',
    'district',
    'contentSummary',
    'contentRussian',
  ],
} as const

const EXTRACTION_PROMPT = `Extract letter data from the PDF.
Return clean JSON only (no markdown, no code fences).

Format:
{
  "number": "letter number from the document text (usually after the number sign). Do not use document code or filename. If multiple numbers exist, choose the letter/incoming/outgoing number.",
  "date": "letter date in YYYY-MM-DD or null",
  "organization": "sender organization, translate to Russian if it is not already",
  "region": "region/oblast, translate to Russian if it is not already",
  "district": "district, translate to Russian if it is not already",
  "contentSummary": "short summary in Russian (1-2 sentences) or null",
  "contentRussian": "full translation of the letter text into Russian (if possible) or null"
}

Rules:
- Do not invent data.
- If a field is missing, use null.
- Output JSON only.`

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function parseExtractedLetterData(content: string): ExtractedLetterData | null {
  const trimmed = content.trim()
  if (!trimmed) return null

  let jsonStr = trimmed

  if (jsonStr.startsWith('```json')) {
    jsonStr = jsonStr.slice(7)
  } else if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.slice(3)
  }

  if (jsonStr.endsWith('```')) {
    jsonStr = jsonStr.slice(0, -3)
  }

  jsonStr = jsonStr.trim()

  try {
    const parsed = JSON.parse(jsonStr)
    const result = extractedLetterDataSchema.safeParse(parsed)
    if (!result.success) {
      logger.warn('AI', 'Invalid extraction payload', {
        issues: result.error.issues.map((issue) => issue.message),
      })
      return null
    }

    return result.data
  } catch (error) {
    logger.warn('AI', 'Failed to parse extraction payload', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return null
  }
}

const isRateLimitError = (error: unknown) => {
  if (!error || typeof error !== 'object') return false
  const err = error as {
    status?: number
    code?: number
    message?: string
    error?: { code?: number; status?: string; message?: string }
  }
  if (err.status === 429 || err.code === 429 || err.error?.code === 429) return true
  const message = [err.message, err.error?.status, err.error?.message].filter(Boolean).join(' ')
  return /RESOURCE_EXHAUSTED|429/i.test(message)
}

const withRetry = async <T>(label: string, action: () => Promise<T>): Promise<T> => {
  let lastError: unknown
  for (let attempt = 0; attempt <= MAX_AI_RETRIES; attempt += 1) {
    try {
      return await action()
    } catch (error) {
      lastError = error
      if (!isRateLimitError(error) || attempt === MAX_AI_RETRIES) {
        throw error
      }
      const jitter = Math.floor(Math.random() * 200)
      const delay = AI_RETRY_BASE_DELAY_MS * 2 ** attempt + jitter
      console.warn(`[AI] rate limited, retrying ${label} in ${delay}ms`)
      await sleep(delay)
    }
  }
  throw lastError
}

/**
 * Извлекает данные из PDF напрямую с помощью Gemini Vision
 */
export async function extractLetterDataFromPdf(
  pdfBase64: string
): Promise<ExtractedLetterData | null> {
  if (!process.env.GEMINI_API_KEY) {
    console.warn('GEMINI_API_KEY not configured')
    return null
  }

  try {
    const response = await withRetry('extractLetterDataFromPdf', () =>
      genai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType: 'application/pdf',
                  data: pdfBase64,
                },
              },
              {
                text: EXTRACTION_PROMPT,
              },
            ],
          },
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: EXTRACTION_RESPONSE_SCHEMA,
        },
      })
    )

    const content = response.text
    if (!content) return null
    return parseExtractedLetterData(content)
  } catch (error) {
    logger.error('AI', error, { action: 'extractLetterDataFromPdf' })
    return null
  }
}

/**
 * Извлекает данные из текста письма с помощью Gemini AI (legacy)
 */
export async function extractLetterDataWithAI(
  pdfText: string
): Promise<ExtractedLetterData | null> {
  if (!process.env.GEMINI_API_KEY) {
    console.warn('GEMINI_API_KEY not configured')
    return null
  }

  try {
    const response = await withRetry('extractLetterDataWithAI', () =>
      genai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: EXTRACTION_PROMPT + '\n\nТекст письма:\n' + pdfText.substring(0, 4000),
        config: {
          responseMimeType: 'application/json',
          responseSchema: EXTRACTION_RESPONSE_SCHEMA,
        },
      })
    )

    const content = response.text
    if (!content) return null
    return parseExtractedLetterData(content)
  } catch (error) {
    logger.error('AI', error, { action: 'extractLetterDataWithAI' })
    return null
  }
}

/**
 * Переводит текст на русский с помощью Gemini
 * ✅ ОПТИМИЗАЦИЯ: Кэширует переводы для снижения AI API вызовов
 */
export async function translateToRussian(text: string): Promise<string | null> {
  if (!process.env.GEMINI_API_KEY) return null

  // Проверяем кэш
  const cached = getCachedTranslation(text)
  if (cached) {
    logger.debug('AI', 'Translation cache hit', { text: text.substring(0, 50) })
    return cached
  }

  try {
    const response = await withRetry('translateToRussian', () =>
      genai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Translate to Russian. Return only the translation:

  ${text}`,
      })
    )
    const result = response.text || null

    // Сохраняем в кэш
    if (result) {
      setCachedTranslation(text, result)
    }

    return result
  } catch (error) {
    logger.error('AI', error, { action: 'translateToRussian' })
    return null
  }
}

/**
 * Создаёт краткое содержание письма
 */
export async function summarizeLetter(text: string): Promise<string | null> {
  if (!process.env.GEMINI_API_KEY) return null

  try {
    const response = await withRetry('summarizeLetter', () =>
      genai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Summarize in Russian (1-2 sentences):

  ${text}`,
      })
    )
    return response.text || null
  } catch (error) {
    logger.error('AI', error, { action: 'summarizeLetter' })
    return null
  }
}
