const fs = require('fs')

// Patch ai-chat
const chatPath = './src/app/api/ai-chat/route.ts'
let chatCode = fs.readFileSync(chatPath, 'utf8')

if (!chatCode.includes('prisma.systemSettings')) {
  chatCode = chatCode.replace(
    /export async function POST\(request: NextRequest\) \{/g,
    `import { prisma } from '@/lib/prisma'\n\nexport async function POST(request: NextRequest) {`
  )

  const chatCheck = `
    const settings = await prisma.systemSettings.findUnique({ where: { id: 'global' } }).catch(() => null)
    if (settings && (!settings.aiEnabled || !settings.aiChatEnabled)) {
      return NextResponse.json({ success: false, reply: 'AI Chat is currently disabled by administrator.' }, { status: 403 })
    }
`
  chatCode = chatCode.replace(
    /const \{ messages \} = await request\.json\(\)/g,
    `${chatCheck}\n    const { messages } = await request.json()`
  )
  fs.writeFileSync(chatPath, chatCode)
}

// Patch parse-pdf
const parsePath = './src/app/api/parse-pdf/route.ts'
let parseCode = fs.readFileSync(parsePath, 'utf8')

if (!parseCode.includes('prisma.systemSettings')) {
  parseCode = parseCode.replace(
    /export async function POST\(request: NextRequest\) \{/g,
    `import { prisma } from '@/lib/prisma'\n\nexport async function POST(request: NextRequest) {`
  )

  const parseCheck = `
    const settings = await prisma.systemSettings.findUnique({ where: { id: 'global' } }).catch(() => null)
    const isParsingEnabled = (settings?.aiEnabled ?? true) && (settings?.aiParsingEnabled ?? true)
`
  parseCode = parseCode.replace(
    /const formData = await request\.formData\(\)/g,
    `${parseCheck}\n    const formData = await request.formData()`
  )

  // Skip extractLetterDataWithAI if disabled
  parseCode = parseCode.replace(
    /if \(documentText && documentText\.trim\(\)\) \{/g,
    `if (isParsingEnabled && documentText && documentText.trim()) {`
  )
  fs.writeFileSync(parsePath, parseCode)
}
