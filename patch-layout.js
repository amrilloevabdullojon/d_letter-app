const fs = require('fs')
const path = './src/app/layout.tsx'
let code = fs.readFileSync(path, 'utf8')

if (!code.includes('import { prisma }')) {
  code = code.replace(
    /import \{ AIChatWidget \} from '@\/components\/AIChatWidget'/g,
    `import { AIChatWidget } from '@/components/AIChatWidget'\nimport { prisma } from '@/lib/prisma'`
  )
}

const oldFunc = 'export default function RootLayout({ children }: { children: React.ReactNode }) {'
const newFunc = `export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await prisma.systemSettings.findUnique({ where: { id: 'global' } }).catch(() => null)
  const showChat = (settings?.aiEnabled ?? true) && (settings?.aiChatEnabled ?? true)
`
code = code.replace(oldFunc, newFunc)

code = code.replace(/<AIChatWidget \/>/g, `{showChat && <AIChatWidget />}`)

fs.writeFileSync(path, code)
