const fs = require('fs')
const path = './src/app/api/parse-pdf/route.ts'
let code = fs.readFileSync(path, 'utf8')

const oldOcr = `
        // Если текста почти нет (скорее всего это картинка/скан), пробуем OCR
        if (!documentText || documentText.trim().length < 50) {
          logger.info('Parse document', 'PDF has no text layer, falling back to OCR API')
          const base64 = buffer.toString('base64')
          const ocrText = await extractTextWithOCR(base64)
          if (ocrText) {
            documentText = ocrText
          }
        }
`

const newOcr = `
        // Если текста почти нет (скорее всего это картинка/скан), пробуем OCR
        if (isParsingEnabled && (!documentText || documentText.trim().length < 50)) {
          logger.info('Parse document', 'PDF has no text layer, falling back to OCR API')
          const base64 = buffer.toString('base64')
          const ocrText = await extractTextWithOCR(base64)
          if (ocrText) {
            documentText = ocrText
          }
        }
`

code = code.replace(oldOcr.trim(), newOcr.trim())
fs.writeFileSync(path, code)
