const fs = require('fs')
const path = './src/app/api/parse-pdf/route.ts'
let code = fs.readFileSync(path, 'utf8')

if (!code.includes('import { extractTextWithOCR }')) {
  code = code.replace(
    /import \{ extractLetterDataWithAI \} from '@\/lib\/ai'/g,
    `import { extractLetterDataWithAI } from '@/lib/ai'\nimport { extractTextWithOCR } from '@/lib/ocr'`
  )
}

const oldLogic = `
    if (documentKind === 'pdf') {
      try {
        const pdfParse = require('pdf-parse')
        const data = await pdfParse(buffer)
        documentText = data.text
      } catch (error) {
        logger.error('Parse document', 'Failed to parse PDF text locally', { error })
      }
    } else {
`

const newLogic = `
    if (documentKind === 'pdf') {
      try {
        const pdfParse = require('pdf-parse')
        const data = await pdfParse(buffer)
        documentText = data.text
        
        // Если текста почти нет (скорее всего это картинка/скан), пробуем OCR
        if (!documentText || documentText.trim().length < 50) {
          logger.info('Parse document', 'PDF has no text layer, falling back to OCR API')
          const base64 = buffer.toString('base64')
          const ocrText = await extractTextWithOCR(base64)
          if (ocrText) {
            documentText = ocrText
          }
        }
      } catch (error) {
        logger.error('Parse document', 'Failed to parse PDF text locally', { error })
      }
    } else {
`

code = code.replace(oldLogic.trim(), newLogic.trim())

fs.writeFileSync(path, code)
