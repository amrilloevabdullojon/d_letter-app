import { GoogleGenAI } from '@google/genai'
const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
async function run() {
  const res = await genai.models.embedContent({
    model: 'text-embedding-004',
    contents: 'hello world',
  })
  console.log(JSON.stringify(res))
}
run()
