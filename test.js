const parser = require('postcss-selector-parser')
const fs = require('fs')

function checkFile(file) {
  const css = fs.readFileSync(file, 'utf8')
  const regex = /([^{}]+)\\{/g
  let match
  while ((match = regex.exec(css)) !== null) {
    const sel = match[1].trim()
    if (sel.startsWith('@')) continue
    if (!sel) continue
    try {
      parser().processSync(sel)
    } catch (e) {
      console.log('ERROR IN', file, '-> SELECTOR:', sel)
      console.log(e.message)
    }
  }
}

checkFile('src/app/globals.bak.css')
checkFile('src/app/globals.css')
