const fs = require('fs')
const path = './src/lib/ai.ts'
let code = fs.readFileSync(path, 'utf8')

// 1. Add openai client
code = code.replace(
  /const grok = new OpenAI\(\{/g,
  `const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'missing-key',
})

const grok = new OpenAI({`
)

// 2. Change extractLetterDataWithAI to use openai instead of grok
const oldExtract = `
export async function extractLetterDataWithAI(
  pdfText: string
): Promise<ExtractedLetterData | null> {
  if (!process.env.XAI_API_KEY) {
    logger.error('AI', new Error('XAI_API_KEY not configured'), {
      action: 'extractLetterDataWithAI',
    })
    return null
  }

  try {
    const response = await withRetry('extractLetterDataWithAI', () =>
      grok.chat.completions.create({
        model: 'grok-4.20',
`

const newExtract = `
export async function extractLetterDataWithAI(
  pdfText: string
): Promise<ExtractedLetterData | null> {
  if (!process.env.OPENAI_API_KEY) {
    logger.error('AI', new Error('OPENAI_API_KEY not configured'), {
      action: 'extractLetterDataWithAI',
    })
    return null
  }

  try {
    const response = await withRetry('extractLetterDataWithAI', () =>
      openai.chat.completions.create({
        model: 'gpt-4o-mini',
`

code = code.replace(oldExtract.trim(), newExtract.trim())

// 3. Remove extractLetterDataFromPdf
const extractPdfStart = code.indexOf('export async function extractLetterDataFromPdf')
if (extractPdfStart !== -1) {
  const extractPdfEnd = code.indexOf('export async function extractLetterDataWithAI')
  if (extractPdfEnd !== -1) {
    code = code.slice(0, extractPdfStart) + code.slice(extractPdfEnd)
  }
}

fs.writeFileSync(path, code)
