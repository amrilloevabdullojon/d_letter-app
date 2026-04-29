import { logger } from '@/lib/logger.server'

interface OcrResponse {
  ParsedResults?: Array<{
    ParsedText: string
  }>
  IsErroredOnProcessing?: boolean
  ErrorMessage?: string[]
}

export async function extractTextWithOCR(base64Data: string): Promise<string | null> {
  const apiKey = process.env.OCR_SPACE_API_KEY || 'helloworld'

  try {
    const formData = new FormData()
    formData.append('apikey', apiKey)
    formData.append('language', 'rus')
    formData.append('isOverlayRequired', 'false')
    // OCR.space expects base64 data to include the data URI scheme
    formData.append('base64Image', `data:application/pdf;base64,${base64Data}`)

    // For PDFs with multiple pages, we might want to specify this
    formData.append('isTable', 'false')
    formData.append('scale', 'true')
    formData.append('OCREngine', '1') // Engine 1 is faster and usually good enough for standard text

    const response = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      throw new Error(`OCR API responded with status: ${response.status}`)
    }

    const data = (await response.json()) as OcrResponse

    if (data.IsErroredOnProcessing) {
      const errorMsg = data.ErrorMessage?.join(', ') || 'Unknown OCR error'
      throw new Error(errorMsg)
    }

    if (!data.ParsedResults || data.ParsedResults.length === 0) {
      return null
    }

    // Join text from all parsed pages
    const text = data.ParsedResults.map((r) => r.ParsedText).join('\n\n')
    return text.trim() || null
  } catch (error) {
    logger.error('OCR', error, { action: 'extractTextWithOCR' })
    return null
  }
}
