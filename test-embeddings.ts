import OpenAI from 'openai'
import dotenv from 'dotenv'
dotenv.config()

const grok = new OpenAI({
  apiKey: process.env.XAI_API_KEY || 'missing-key',
  baseURL: 'https://api.x.ai/v1',
})

async function main() {
  try {
    const response = await grok.embeddings.create({
      model: 'v1', // xAI's embedding model is sometimes called "v1" or they don't have one?
      input: 'Test string',
    })
    console.log('Embedding length:', response.data[0].embedding.length)
  } catch (e: any) {
    console.log('Error:', e.message)
  }
}
main()
