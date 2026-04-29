import 'server-only'
import { GoogleGenAI } from '@google/genai'
import { logger } from '@/lib/logger.server'

const genai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
})

export async function getEmbedding(text: string): Promise<number[] | null> {
  if (!process.env.GEMINI_API_KEY || !text.trim()) return null

  try {
    const response = await genai.models.embedContent({
      model: 'text-embedding-004',
      contents: text.substring(0, 8000), // Limit size just in case
    })

    return response.embeddings?.[0]?.values || null
  } catch (error) {
    logger.error('AI', error, { action: 'getEmbedding' })
    throw error
  }
}
