const fs = require('fs')
const path = './src/lib/embeddings.ts'

const content = `import 'server-only'
import OpenAI from 'openai'
import { logger } from '@/lib/logger.server'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function getEmbedding(text: string): Promise<number[] | null> {
  if (!process.env.OPENAI_API_KEY || !text.trim()) return null

  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text.substring(0, 8000), // Limit size just in case
      dimensions: 768, // Match existing pgvector dimensions
    })

    return response.data[0]?.embedding || null
  } catch (error: any) {
    logger.error('AI', error, { action: 'getEmbedding' })
    throw error // Let the route catch it and show the error directly to user
  }
}
`

fs.writeFileSync(path, content)
