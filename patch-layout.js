const fs = require('fs')
const path = './src/app/layout.tsx'
let code = fs.readFileSync(path, 'utf8')

code = code.replace(
  /export default async function RootLayout\(\{ children \}: \{ children: React\.ReactNode \}\) \{\n  const settings = await prisma\.systemSettings\.findUnique\(\{ where: \{ id: 'global' \} \}\)\.catch\(\(\) => null\)\n  const showChat = \(settings\?\.aiEnabled \?\? true\) && \(settings\?\.aiChatEnabled \?\? true\)/g,
  `export default function RootLayout({ children }: { children: React.ReactNode }) {`
)

code = code.replace(/\{showChat && <AIChatWidget \/>\}/g, `<AIChatWidget />`)

fs.writeFileSync(path, code)
