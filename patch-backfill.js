const fs = require('fs')
const path = './src/app/api/letters/backfill-embeddings/route.ts'
let code = fs.readFileSync(path, 'utf8')

code = code.replace(
  /const embedding = await getEmbedding\(textToEmbed\)/g,
  `const embedding = await getEmbedding(textToEmbed)
      if (!embedding && processed === 0 && failed === 0) {
         return NextResponse.json({ error: "Ошибка эмбеддингов. Проверьте логи или API ключ Gemini. Ключ: " + !!process.env.GEMINI_API_KEY }, { status: 500 })
      }`
)

fs.writeFileSync(path, code)
