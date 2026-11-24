/**
 * 把 icon.svg 栅格化成市场卡片用的 180×180 PNG（GitHub 托管的位图，SVG 会被拒）。
 * 用真实 Node 运行（不是 Electron-as-Node），否则原生模块 ABI 不匹配。
 */
import { createRequire } from 'node:module'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const profileModules = 'C:\\Users\\t-jiangricheng\\.dsh\\profiles\\desktop\\node_modules\\'
const require = createRequire(profileModules + 'noop.js')

let Resvg
try {
  ({ Resvg } = require('@resvg/resvg-js'))
} catch (error) {
  console.error('resvg 不可用: ' + (error instanceof Error ? error.message : String(error)))
  process.exit(2)
}

const svg = readFileSync(join(root, 'icon.svg'), 'utf8')
const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 180 }, background: 'rgba(0,0,0,0)' })
const png = resvg.render().asPng()
const target = join(root, 'assets')
mkdirSync(target, { recursive: true })
writeFileSync(join(target, 'icon-180.png'), png)
console.log('assets/icon-180.png 已生成：' + png.length + ' bytes')
