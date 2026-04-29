import OpenAI from 'openai'
import { z } from 'zod'

const openai = new OpenAI({
  apiKey: process.env.XAI_API_KEY || 'fake',
  baseURL: 'https://api.x.ai/v1',
})

async function main() {
  console.log('Testing Grok integration setup')
}
main()
