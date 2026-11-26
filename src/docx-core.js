/**
 * 零依赖 .docx 生成器（store 方式打包的 ZIP + 最小 OOXML）。
 *
 * 之所以自己写：插件是纯浏览器运行、不带 npm 依赖，而 .docx 本质上就是
 * 一个 ZIP 里放几份 XML。这里只实现「写入」这一条路径，够用且可测。
 *
 * blocks 支持：
 *   { kind: 'title' | 'h1' | 'h2' | 'p' | 'code' | 'bullet' | 'meta', text }
 *   code 里的 \n 会拆成多个等宽段落（Word 不认 \n 换行）。
 */

const XMLNS_W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'

function escapeXml(text) {
  return String(text === undefined || text === null ? '' : text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    // 去掉 XML 1.0 不接受的控制字符，否则 Word 打不开
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
}

/** 手写 UTF-8 编码：不依赖 TextEncoder / Buffer，浏览器和 Node 都能跑。 */
function utf8Bytes(text) {
  const out = []
  for (let i = 0; i < text.length; i += 1) {
    let code = text.charCodeAt(i)
    if (code >= 0xD800 && code <= 0xDBFF && i + 1 < text.length) {
      const next = text.charCodeAt(i + 1)
      if (next >= 0xDC00 && next <= 0xDFFF) {
        code = 0x10000 + ((code - 0xD800) << 10) + (next - 0xDC00)
        i += 1
      }
    }
    if (code < 0x80) out.push(code)
    else if (code < 0x800) out.push(0xC0 | (code >> 6), 0x80 | (code & 0x3F))
    else if (code < 0x10000) out.push(0xE0 | (code >> 12), 0x80 | ((code >> 6) & 0x3F), 0x80 | (code & 0x3F))
    else out.push(0xF0 | (code >> 18), 0x80 | ((code >> 12) & 0x3F), 0x80 | ((code >> 6) & 0x3F), 0x80 | (code & 0x3F))
  }
  return Uint8Array.from(out)
}

// ---------------------------------------------------------------- CRC32 / ZIP

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i += 1) {
    let c = i
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1
    table[i] = c >>> 0
  }
  return table
})()

function crc32(bytes) {
  let crc = 0xFFFFFFFF
  for (let i = 0; i < bytes.length; i += 1) crc = CRC_TABLE[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8)
  return (crc ^ 0xFFFFFFFF) >>> 0
}

function concatBytes(parts) {
  let total = 0
  for (const part of parts) total += part.length
  const out = new Uint8Array(total)
  let offset = 0
  for (const part of parts) {
    out.set(part, offset)
    offset += part.length
  }
  return out
}

/** files: [{ name, data(Uint8Array) }] → ZIP（不压缩） */
function zipStore(files) {
  const chunks = []
  const central = []
  let offset = 0
  const DOS_TIME = 0
  const DOS_DATE = 0x5021 // 2020-01-01，固定值让产物可复现

  for (const file of files) {
    const nameBytes = utf8Bytes(file.name)
    const data = file.data
    const crc = crc32(data)

    const local = new Uint8Array(30 + nameBytes.length)
    const lv = new DataView(local.buffer)
    lv.setUint32(0, 0x04034b50, true)
    lv.setUint16(4, 20, true)
    lv.setUint16(6, 0x0800, true) // UTF-8 文件名
    lv.setUint16(8, 0, true) // store
    lv.setUint16(10, DOS_TIME, true)
    lv.setUint16(12, DOS_DATE, true)
    lv.setUint32(14, crc, true)
    lv.setUint32(18, data.length, true)
    lv.setUint32(22, data.length, true)
    lv.setUint16(26, nameBytes.length, true)
    lv.setUint16(28, 0, true)
    local.set(nameBytes, 30)

    chunks.push(local, data)

    const cen = new Uint8Array(46 + nameBytes.length)
    const cv = new DataView(cen.buffer)
    cv.setUint32(0, 0x02014b50, true)
    cv.setUint16(4, 20, true) // made by
    cv.setUint16(6, 20, true) // needed
    cv.setUint16(8, 0x0800, true)
    cv.setUint16(10, 0, true)
    cv.setUint16(12, DOS_TIME, true)
    cv.setUint16(14, DOS_DATE, true)
    cv.setUint32(16, crc, true)
    cv.setUint32(20, data.length, true)
    cv.setUint32(24, data.length, true)
    cv.setUint16(28, nameBytes.length, true)
    cv.setUint16(30, 0, true)
    cv.setUint16(32, 0, true)
    cv.setUint16(34, 0, true)
    cv.setUint16(36, 0, true)
    cv.setUint32(38, 0, true)
    cv.setUint32(42, offset, true)
    cen.set(nameBytes, 46)
    central.push(cen)

    offset += local.length + data.length
  }

  const centralBytes = concatBytes(central)
  const eocd = new Uint8Array(22)
  const ev = new DataView(eocd.buffer)
  ev.setUint32(0, 0x06054b50, true)
  ev.setUint16(4, 0, true)
  ev.setUint16(6, 0, true)
  ev.setUint16(8, files.length, true)
  ev.setUint16(10, files.length, true)
  ev.setUint32(12, centralBytes.length, true)
  ev.setUint32(16, offset, true)
  ev.setUint16(20, 0, true)

  return concatBytes([...chunks, centralBytes, eocd])
}

// ---------------------------------------------------------------- OOXML 片段

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`

const DOCUMENT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="${XMLNS_W}">
<w:docDefaults><w:rPrDefault><w:rPr>
<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Microsoft YaHei"/>
<w:sz w:val="21"/><w:szCs w:val="21"/>
</w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="80" w:line="300" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>
<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:qFormat/>
<w:pPr><w:spacing w:before="0" w:after="160"/></w:pPr><w:rPr><w:b/><w:sz w:val="36"/><w:szCs w:val="36"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:qFormat/>
<w:pPr><w:keepNext/><w:spacing w:before="280" w:after="120"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:sz w:val="30"/><w:szCs w:val="30"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:qFormat/>
<w:pPr><w:keepNext/><w:spacing w:before="200" w:after="80"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Code"><w:name w:val="Code"/><w:basedOn w:val="Normal"/>
<w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:ind w:left="120"/><w:shd w:val="clear" w:color="auto" w:fill="F2F4F7"/></w:pPr>
<w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:style>
</w:styles>`

function paragraph(styleId, text) {
  const style = styleId ? `<w:pPr><w:pStyle w:val="${styleId}"/></w:pPr>` : ''
  return `<w:p>${style}<w:r><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`
}

function codeParagraphs(text) {
  const lines = String(text === undefined || text === null ? '' : text).split(/\r?\n/)
  const out = []
  for (const line of lines) {
    out.push(paragraph('Code', line === '' ? ' ' : line))
  }
  return out
}

/**
 * @param {Array<{kind: string, text: string}>} blocks
 * @returns {Uint8Array} .docx 字节
 */
export function buildDocx(blocks) {
  const body = []
  for (const block of blocks || []) {
    const kind = block && block.kind ? block.kind : 'p'
    const text = block && block.text !== undefined ? block.text : ''
    if (kind === 'title') body.push(paragraph('Title', text))
    else if (kind === 'h1') body.push(paragraph('Heading1', text))
    else if (kind === 'h2') body.push(paragraph('Heading2', text))
    else if (kind === 'code') body.push(...codeParagraphs(text))
    else if (kind === 'bullet') body.push(paragraph('Normal', '•  ' + text))
    else body.push(paragraph('Normal', text))
  }
  if (body.length === 0) body.push(paragraph('Normal', ''))

  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="${XMLNS_W}"><w:body>
${body.join('\n')}
<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr>
</w:body></w:document>`

  return zipStore([
    { name: '[Content_Types].xml', data: utf8Bytes(CONTENT_TYPES) },
    { name: '_rels/.rels', data: utf8Bytes(ROOT_RELS) },
    { name: 'word/_rels/document.xml.rels', data: utf8Bytes(DOCUMENT_RELS) },
    { name: 'word/document.xml', data: utf8Bytes(document) },
    { name: 'word/styles.xml', data: utf8Bytes(STYLES) },
  ])
}
