import { GoogleGenAI } from '@google/genai'

const genai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
})

export interface ExtractedLetterData {
  number: string | null
  date: string | null
  organization: string | null
  region: string | null
  district: string | null
  contentSummary: string | null
  contentRussian: string | null
}

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

/**
 * Извлекает данные из PDF напрямую с помощью Gemini Vision
 */
export async function extractLetterDataFromPdf(pdfBase64: string): Promise<ExtractedLetterData | null> {
  if (!process.env.GEMINI_API_KEY) {
    console.warn('GEMINI_API_KEY not configured')
    return null
  }

  try {
    const response = await genai.models.generateContent({
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
    })

    const content = response.text
    if (!content) return null

    // Парсим JSON ответ
    let jsonStr = content.trim()

    // Убираем markdown code blocks если есть
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.slice(7)
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.slice(3)
    }
    if (jsonStr.endsWith('```')) {
      jsonStr = jsonStr.slice(0, -3)
    }
    jsonStr = jsonStr.trim()

    const data = JSON.parse(jsonStr) as ExtractedLetterData
    return data
  } catch (error) {
    console.error('AI PDF extraction error:', error)
    return null
  }
}

/**
 * Извлекает данные из текста письма с помощью Gemini AI (legacy)
 */
export async function extractLetterDataWithAI(pdfText: string): Promise<ExtractedLetterData | null> {
  if (!process.env.GEMINI_API_KEY) {
    console.warn('GEMINI_API_KEY not configured')
    return null
  }

  try {
    const response = await genai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: EXTRACTION_PROMPT + '\n\nТекст письма:\n' + pdfText.substring(0, 4000),
    })

    const content = response.text
    if (!content) return null

    let jsonStr = content.trim()
    if (jsonStr.startsWith('```json')) jsonStr = jsonStr.slice(7)
    else if (jsonStr.startsWith('```')) jsonStr = jsonStr.slice(3)
    if (jsonStr.endsWith('```')) jsonStr = jsonStr.slice(0, -3)
    jsonStr = jsonStr.trim()

    return JSON.parse(jsonStr) as ExtractedLetterData
  } catch (error) {
    console.error('AI extraction error:', error)
    return null
  }
}

/**
 * Переводит текст на русский с помощью Gemini
 */
export async function translateToRussian(text: string): Promise<string | null> {
  if (!process.env.GEMINI_API_KEY) return null

  try {
    const response = await genai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: `Translate to Russian. Return only the translation:

${text}`,
    })
    return response.text || null
  } catch (error) {
    console.error('Translation error:', error)
    return null
  }
}

/**
 * Создаёт краткое содержание письма
 */
export async function summarizeLetter(text: string): Promise<string | null> {
  if (!process.env.GEMINI_API_KEY) return null

  try {
    const response = await genai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: `Summarize in Russian (1-2 sentences):

${text}`,
    })
    return response.text || null
  } catch (error) {
    console.error('Summarize error:', error)
    return null
  }
}
