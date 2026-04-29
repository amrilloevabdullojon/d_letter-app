const fs = require('fs')
const path = './src/components/AIChatWidget.tsx'
let code = fs.readFileSync(path, 'utf8')

if (!code.includes('import { getPublicAiSettings }')) {
  code = code.replace(
    /import \{ hapticLight, hapticMedium \} from '@\/lib\/haptic'/g,
    `import { hapticLight, hapticMedium } from '@/lib/haptic'\nimport { getPublicAiSettings } from '@/app/actions/settings'`
  )

  code = code.replace(
    /const \[mounted, setMounted\] = useState\(false\)/g,
    `const [mounted, setMounted] = useState(false)\n  const [isEnabled, setIsEnabled] = useState(true)`
  )

  const oldEffect = `
  useEffect(() => {
    setMounted(true)
  }, [])
`

  const newEffect = `
  useEffect(() => {
    getPublicAiSettings().then(res => {
      setIsEnabled(res.aiEnabled && res.aiChatEnabled)
      setMounted(true)
    })
  }, [])
`
  if (code.includes(oldEffect.trim())) {
    code = code.replace(oldEffect.trim(), newEffect.trim())
  } else {
    // maybe it doesn't have useEffect?
    code = code.replace(
      /const \[isLoading, setIsLoading\] = useState\(false\)/g,
      `const [isLoading, setIsLoading] = useState(false)\n\n  useEffect(() => {\n    getPublicAiSettings().then(res => {\n      setIsEnabled(res.aiEnabled && res.aiChatEnabled)\n      setMounted(true)\n    })\n  }, [])`
    )
  }

  code = code.replace(/if \(!mounted\) return null/g, `if (!mounted || !isEnabled) return null`)

  fs.writeFileSync(path, code)
}
