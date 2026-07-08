/**
 * Builds Windows .ico from src/assets/atm.png for electron-builder.
 * Run: node scripts/generate-icon.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pngToIco from 'png-to-ico'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const pngPath = path.join(root, 'src', 'assets', 'atm.png')
const buildDir = path.join(root, 'build')
const icoPath = path.join(buildDir, 'icon.ico')

if (!fs.existsSync(pngPath)) {
  console.error('Missing:', pngPath)
  process.exit(1)
}

fs.mkdirSync(buildDir, { recursive: true })
const buf = await pngToIco(pngPath)
fs.writeFileSync(icoPath, buf)
console.log('Wrote', icoPath)
