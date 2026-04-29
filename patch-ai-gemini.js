const fs = require('fs')
const path = './src/lib/ai.ts'
let code = fs.readFileSync(path, 'utf8')

const oldFunc = `
export async function extractLetterDataFromPdf(
  pdfBase64: string
): Promise<ExtractedLetterData | null> {
  if (!process.env.GEMINI_API_KEY) {
    logger.error('AI', new Error('GEMINI_API_KEY not configured'), { action: 'extractLetterDataFromPdf' })
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
`

if (!code.includes('extractLetterDataFromPdf')) {
  code += '\n' + oldFunc
  fs.writeFileSync(path, code)
}
