const fs = require('fs')
const env = fs
  .readFileSync('.env', 'utf8')
  .split('\n')
  .find((line) => line.startsWith('GEMINI_API_KEY='))
const key = env ? env.split('=')[1].replace(/['"]/g, '').trim() : ''

const { GoogleGenAI } = require('@google/genai')
const genai = new GoogleGenAI({ apiKey: key })

async function main() {
  try {
    const response = await genai.models.embedContent({
      model: 'text-embedding-004',
      contents: 'test',
    })
    console.log('SUCCESS', response.embeddings[0].values.length)
  } catch (e) {
    console.error('API ERROR:', e.message)
  }
}
main()
