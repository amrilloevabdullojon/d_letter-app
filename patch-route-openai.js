const fs = require('fs')
const path = './src/app/api/parse-pdf/route.ts'
let code = fs.readFileSync(path, 'utf8')

code = code.replace(
  /import \{ extractLetterDataWithAI, extractLetterDataFromPdf \} from '@\/lib\/ai'/g,
  `import { extractLetterDataWithAI } from '@/lib/ai'`
)

const oldLogic = `
    let documentText: string | null = null

    if (documentKind === 'pdf') {
      // PDF handles Gemini vision directly
      const base64 = buffer.toString('base64')
      aiData = await withTimeout(
        extractLetterDataFromPdf(base64),
        45000,
        'PDF parsing timeout after 45 seconds'
      )
      extractedText = true // assume vision extracted something
    } else {
      documentText = await extractTextFromOfficeDocument(buffer, documentKind)
      extractedText = Boolean(documentText && documentText.trim())

      if (documentText && documentText.trim()) {
        aiData = await withTimeout(
          extractLetterDataWithAI(documentText),
          45000,
          'Document text parsing timeout after 45 seconds'
        )
      }
    }
`

const newLogic = `
    let documentText: string | null = null

    if (documentKind === 'pdf') {
      try {
        const pdfParse = require('pdf-parse')
        const data = await pdfParse(buffer)
        documentText = data.text
      } catch (error) {
        logger.error('Parse document', 'Failed to parse PDF text locally', { error })
      }
    } else {
      documentText = await extractTextFromOfficeDocument(buffer, documentKind)
    }

    extractedText = Boolean(documentText && documentText.trim())

    if (documentText && documentText.trim()) {
      aiData = await withTimeout(
        extractLetterDataWithAI(documentText),
        45000,
        'Document text parsing timeout after 45 seconds'
      )
    }
`

code = code.replace(oldLogic.trim(), newLogic.trim())

fs.writeFileSync(path, code)
