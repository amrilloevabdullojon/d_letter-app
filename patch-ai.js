const fs = require('fs')
const path = './src/lib/ai.ts'
let code = fs.readFileSync(path, 'utf8')

code = code.replace(
  /response_format: { type: 'json_object' },/g,
  `// response_format: { type: 'json_object' }, // Removed because some Grok models don't support it natively`
)

fs.writeFileSync(path, code)
