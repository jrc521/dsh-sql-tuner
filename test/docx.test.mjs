/**
 * .docx 生成器自测：真的写出一个 .docx，再用 python-docx 打开验证。
 *   ELECTRON_RUN_AS_NODE=1 <node> test/docx.test.mjs
 */
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { buildDocx } from '../src/docx-core.js'

let checks = 0
let failures = 0
function check(label, condition, extra) {
  checks += 1
  if (!condition) {
    failures += 1
    console.error('FAIL  ' + label + (extra === undefined ? '' : '  ::  ' + JSON.stringify(extra)))
  }
}

const blocks = [
  { kind: 'title', text: 'SQL 分析与调优报告' },
  { kind: 'p', text: '数据库类型：mysql' },
  { kind: 'h1', text: '一、SQL 解释' },
  { kind: 'h2', text: '语句 1（查询，第 9 行）' },
  { kind: 'bullet', text: '过滤条件：o.status = 1（可索引）' },
  { kind: 'code', text: 'ALTER TABLE t_order ADD INDEX idx_a (status);\n-- 第二行 <&> "引号"' },
  { kind: 'p', text: '特殊字符转义：<tag> & "quote" \'apos\'' },
  { kind: 'code', text: '' },
]

const bytes = buildDocx(blocks)
check('产物非空', bytes.length > 500, bytes.length)
check('是 ZIP（PK\\x03\\x04）', bytes[0] === 0x50 && bytes[1] === 0x4B && bytes[2] === 3 && bytes[3] === 4, [bytes[0], bytes[1], bytes[2], bytes[3]])

const raw = Buffer.from(bytes).toString('latin1')
for (const part of ['[Content_Types].xml', '_rels/.rels', 'word/document.xml', 'word/styles.xml', 'word/_rels/document.xml.rels']) {
  check('包含部件 ' + part, raw.includes(part))
}
check('段落数符合预期（8 个 block，空 code 也算一段）', (raw.match(/<w:p>/g) || []).length === 9, (raw.match(/<w:p>/g) || []).length)

// 用 python-docx 真正打开
const dir = mkdtempSync(join(tmpdir(), 'sqlt-docx-'))
const docxPath = join(dir, 'report.docx')
const scriptPath = join(dir, 'verify.py')
writeFileSync(docxPath, bytes)

writeFileSync(scriptPath, `import json, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
from docx import Document
doc = Document(sys.argv[1])
out = {"paragraphs": len(doc.paragraphs), "texts": [p.text for p in doc.paragraphs], "styles": sorted({p.style.name for p in doc.paragraphs})}
print(json.dumps(out, ensure_ascii=False))
`, 'utf8')

const python = process.env.PYTHON_BIN || 'C:\\Users\\t-jiangricheng\\.dsh\\dsh-runtimes\\dsh-primary-runtime\\dependencies\\python\\python.exe'

let result = null
try {
  const stdout = execFileSync(python, [scriptPath, docxPath], { encoding: 'utf8', env: { ...process.env, PYTHONIOENCODING: 'utf-8' } })
  result = JSON.parse(stdout)
} catch (error) {
  check('python-docx 能打开该文件', false, error instanceof Error ? error.message.slice(0, 400) : String(error))
}

if (result) {
  check('python-docx 打开成功', true)
  check('段落数 > 8', result.paragraphs > 8, result.paragraphs)
  const joined = result.texts.join('\n')
  check('中文标题正确', joined.includes('SQL 分析与调优报告'), result.texts.slice(0, 3))
  check('中文正文正确', joined.includes('语句 1（查询，第 9 行）'), result.texts.slice(0, 6))
  check('code 行拆成独立段落', joined.includes('ALTER TABLE t_order ADD INDEX idx_a (status);') && joined.includes('-- 第二行 <&> "引号"'), result.texts.filter((t) => t.includes('第二行')))
  check('特殊字符正确转义往返', joined.includes('<tag> & "quote" \'apos\''), result.texts.filter((t) => t.includes('特殊字符')))
  check('用到 Title / Heading1 / Heading2 / Code 样式', result.styles.includes('Title') && result.styles.includes('Heading 1') && result.styles.includes('Code'), result.styles)
}

rmSync(dir, { recursive: true, force: true })

console.log('')
console.log(`${checks - failures}/${checks} 项检查通过`)
if (failures > 0) {
  console.error(failures + ' 项失败')
  process.exit(1)
}
console.log('docx 导出测试通过')
