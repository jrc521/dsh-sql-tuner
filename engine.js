/**
 * dsh-sql-tuner · engine
 *
 * 纯函数式 SQL 结构分析引擎：没有 I/O、没有依赖、没有语言文案。
 * Host 侧（Node 测试）与浏览器侧（面板）共用同一份实现，构建时内联进 client.js。
 *
 * 对外接口：
 *   parseSchema(text)            把 DDL / 数据字典解析成表对象
 *   analyze(request)             产出结构化报告（解释 / 发现 / 索引建议 / 执行建议）
 *   parseIndexLines(text)        解析手工补充的索引行
 */

export const DIALECTS = [
  'mysql', 'mariadb', 'tidb', 'postgresql', 'oracle', 'sqlserver',
  'sqlite', 'hive', 'spark', 'clickhouse', 'doris', 'db2', 'dm', 'other',
]

/** 无索引概念、按分区/主键裁剪的引擎。 */
const COLUMNAR = new Set(['hive', 'spark', 'clickhouse', 'doris'])
/** 支持 LIMIT n OFFSET m 的引擎。 */
const LIMIT_STYLE = new Set(['mysql', 'mariadb', 'tidb', 'postgresql', 'sqlite', 'hive', 'spark', 'clickhouse', 'doris', 'dm', 'other'])
/** 大表阈值：行数超过它才提示全表扫描风险。 */
const BIG_TABLE = 1e6

const MULTI_OPS = ['<>', '!=', '>=', '<=', '||', '&&', '::', '->>', '->', '=>']

const NON_COLUMN_WORDS = new Set([
  'null', 'true', 'false', 'and', 'or', 'not', 'in', 'like', 'ilike', 'between', 'is',
  'case', 'when', 'then', 'else', 'end', 'cast', 'as', 'interval', 'distinct', 'all',
  'any', 'some', 'exists', 'escape', 'collate', 'default', 'current_date', 'current_time',
  'current_timestamp', 'now', 'systimestamp', 'getdate', 'localtime', 'utc_timestamp',
  'date', 'time', 'timestamp', 'year', 'month', 'day', 'hour', 'minute', 'second',
  'by', 'asc', 'desc', 'nulls', 'rows', 'only', 'first', 'next', 'row',
])

const CLAUSE_WORDS = new Set([
  'select', 'from', 'where', 'group', 'having', 'order', 'limit', 'offset', 'union',
  'except', 'intersect', 'join', 'inner', 'left', 'right', 'full', 'cross', 'outer',
  'on', 'using', 'window', 'returning', 'into', 'values', 'set', 'for', 'fetch', 'top',
  'straight_join', 'qualify', 'lateral', 'apply', 'pivot', 'unpivot',
])

const JOIN_WORDS = new Set(['join', 'inner', 'left', 'right', 'full', 'cross', 'outer', 'straight_join'])

/** 一条 JOIN 子句可能从这些词开始，用来界定上一条 ON 的结束。 */
const JOIN_PHRASE_WORDS = new Set([
  'join', 'left', 'right', 'full', 'cross', 'inner', 'outer', 'straight_join', 'apply', 'lateral',
])

const AGG_FUNCS = new Set([
  'count', 'sum', 'avg', 'min', 'max', 'group_concat', 'string_agg', 'listagg', 'array_agg',
  'stddev', 'variance', 'var_pop', 'var_samp', 'stddev_pop', 'stddev_samp', 'median',
  'percentile_cont', 'percentile_disc', 'approx_count_distinct', 'collect_list', 'collect_set',
  'bit_and', 'bit_or', 'bool_and', 'bool_or', 'every', 'any_value',
])

const WINDOW_FUNCS = new Set([
  'row_number', 'rank', 'dense_rank', 'ntile', 'lag', 'lead', 'first_value', 'last_value',
  'nth_value', 'percent_rank', 'cume_dist',
])

// ---------------------------------------------------------------- 词法

function isWordStart(ch) {
  return /[A-Za-z_$\u0080-\uffff]/.test(ch)
}

function isWordPart(ch) {
  return /[A-Za-z0-9_$\u0080-\uffff]/.test(ch)
}

function tokenize(sql) {
  const out = []
  const n = sql.length
  let i = 0
  while (i < n) {
    const ch = sql[i]
    if (ch === ' ' || ch === '\t' || ch === '\r' || ch === '\n' || ch === '\uFEFF') {
      i += 1
      continue
    }
    if (ch === '-' && sql[i + 1] === '-') {
      const nl = sql.indexOf('\n', i)
      const stop = nl < 0 ? n : nl
      out.push({ t: 'comment', v: sql.slice(i, stop), start: i, end: stop })
      i = stop
      continue
    }
    if (ch === '#') {
      const nl = sql.indexOf('\n', i)
      const stop = nl < 0 ? n : nl
      out.push({ t: 'comment', v: sql.slice(i, stop), start: i, end: stop })
      i = stop
      continue
    }
    if (ch === '/' && sql[i + 1] === '*') {
      const close = sql.indexOf('*/', i + 2)
      const stop = close < 0 ? n : close + 2
      out.push({ t: 'comment', v: sql.slice(i, stop), start: i, end: stop })
      i = stop
      continue
    }
    if (ch === "'") {
      let j = i + 1
      let value = ''
      while (j < n) {
        if (sql[j] === "'") {
          if (sql[j + 1] === "'") {
            value += "'"
            j += 2
            continue
          }
          j += 1
          break
        }
        if (sql[j] === '\\' && (sql[j + 1] === "'" || sql[j + 1] === '\\')) {
          value += sql[j + 1]
          j += 2
          continue
        }
        value += sql[j]
        j += 1
      }
      out.push({ t: 'str', v: value, raw: sql.slice(i, j), start: i, end: j })
      i = j
      continue
    }
    if (ch === '"' || ch === '`') {
      const quote = ch
      let j = i + 1
      let value = ''
      while (j < n) {
        if (sql[j] === quote) {
          if (sql[j + 1] === quote) {
            value += quote
            j += 2
            continue
          }
          j += 1
          break
        }
        value += sql[j]
        j += 1
      }
      out.push({ t: 'id', v: value, quoted: true, raw: sql.slice(i, j), start: i, end: j })
      i = j
      continue
    }
    if (ch === '[') {
      const close = sql.indexOf(']', i + 1)
      if (close > 0) {
        out.push({ t: 'id', v: sql.slice(i + 1, close), quoted: true, raw: sql.slice(i, close + 1), start: i, end: close + 1 })
        i = close + 1
        continue
      }
    }
    if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(sql[i + 1] || ''))) {
      let j = i
      while (j < n && /[0-9.]/.test(sql[j])) j += 1
      while (j < n && /[0-9eExXa-fA-F+-]/.test(sql[j]) && !/[\s,)]/.test(sql[j])) {
        if ((sql[j] === '+' || sql[j] === '-') && !/[eE]/.test(sql[j - 1])) break
        j += 1
      }
      out.push({ t: 'num', v: sql.slice(i, j), start: i, end: j })
      i = j
      continue
    }
    if (isWordStart(ch)) {
      let j = i + 1
      while (j < n && isWordPart(sql[j])) j += 1
      out.push({ t: 'id', v: sql.slice(i, j), start: i, end: j })
      i = j
      continue
    }
    let matched = null
    for (const op of MULTI_OPS) {
      if (sql.startsWith(op, i)) {
        matched = op
        break
      }
    }
    if (matched) {
      out.push({ t: 'op', v: matched, start: i, end: i + matched.length })
      i += matched.length
      continue
    }
    out.push({ t: 'punct', v: ch, start: i, end: i + 1 })
    i += 1
  }
  return out
}

function lower(token) {
  return token && token.t === 'id' && !token.quoted ? token.v.toLowerCase() : token ? token.v.toLowerCase() : ''
}

function isWord(token, word) {
  return Boolean(token) && token.t === 'id' && lower(token) === word
}

function computeDepths(tokens) {
  let depth = 0
  const out = new Array(tokens.length)
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i]
    if (token.v === ')') {
      depth = Math.max(0, depth - 1)
      out[i] = depth
      continue
    }
    out[i] = depth
    if (token.v === '(') depth += 1
  }
  return out
}

function significant(tokens) {
  return tokens.filter((t) => t.t !== 'comment')
}

function splitStatements(sql) {
  const tokens = tokenize(sql)
  const statements = []
  let current = []
  let depth = 0
  for (const token of tokens) {
    if (token.v === '(') depth += 1
    if (token.v === ')') depth = Math.max(0, depth - 1)
    if (token.t === 'punct' && token.v === ';' && depth === 0) {
      if (significant(current).length > 0) statements.push(current)
      current = []
      continue
    }
    current.push(token)
  }
  if (significant(current).length > 0) statements.push(current)
  return statements
}

// ---------------------------------------------------------------- 表结构解析

function normalizeName(raw) {
  return String(raw || '')
    .replace(/[`"\[\]]/g, '')
    .trim()
    .toLowerCase()
}

function splitTopLevelCommas(text) {
  const parts = []
  let depth = 0
  let quote = ''
  let buffer = ''
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]
    if (quote) {
      buffer += ch
      if (ch === quote) quote = ''
      continue
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      quote = ch
      buffer += ch
      continue
    }
    if (ch === '(') depth += 1
    if (ch === ')') depth -= 1
    if (ch === ',' && depth === 0) {
      parts.push(buffer)
      buffer = ''
      continue
    }
    buffer += ch
  }
  if (buffer.trim() !== '') parts.push(buffer)
  return parts
}

function findClosingParen(text, openIndex) {
  let depth = 0
  let quote = ''
  for (let i = openIndex; i < text.length; i += 1) {
    const ch = text[i]
    if (quote) {
      if (ch === quote) quote = ''
      continue
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      quote = ch
      continue
    }
    if (ch === '(') depth += 1
    if (ch === ')') {
      depth -= 1
      if (depth === 0) return i
    }
  }
  return -1
}

function parseColumnList(text) {
  return splitTopLevelCommas(text)
    .map((part) => columnNameFromExpr(part))
    .filter((name) => name !== '')
}

/** 从列表达式里取出真实列名：`col`、`col(10)` 前缀索引、`to_days(col)` 函数包装。 */
function columnNameFromExpr(part) {
  const text = String(part || '').trim()
  if (text === '') return ''
  const head = /^([`"\w$]+)\s*\(/.exec(text)
  if (head && !/^[\d\s]+\)/.test(text.slice(head[0].length))) {
    const close = findClosingParen(text, text.indexOf('('))
    const inner = close > 0 ? text.slice(text.indexOf('(') + 1, close) : ''
    const innerName = /[`"\w$]+/.exec(inner.replace(/^[\d\s]+/, ''))
    if (innerName && !/^\d+$/.test(innerName[0])) return normalizeName(innerName[0])
  }
  return normalizeName(text.split(/[\s(]/)[0])
}

function isColumnDefinition(item) {
  return !/^\s*(primary\s+key|unique|key\b|index\b|constraint|foreign\s+key|check|period|exclude|fulltext|spatial)\b/i.test(item)
}

function newTable(name, rawName) {
  return {
    name,
    rawName: rawName || name,
    rows: null,
    columns: [],
    primaryKey: [],
    foreignKeys: [],
    partitionKeys: [],
    indexes: [],
    engine: '',
    comment: '',
  }
}

function ensureTable(tables, byName, rawName) {
  const name = normalizeName(rawName)
  if (byName.has(name)) return byName.get(name)
  const table = newTable(name, String(rawName || name).replace(/[`"\[\]]/g, ''))
  tables.push(table)
  byName.set(name, table)
  return table
}

function parseColumnDefinition(item, table) {
  const text = item.trim()
  if (text === '') return
  const tokens = tokenize(text)
  const ids = tokens.filter((t) => t.t === 'id')
  if (ids.length === 0) return
  const name = normalizeName(ids[0].v)
  const typeTokens = []
  for (let i = 1; i < tokens.length; i += 1) {
    const token = tokens[i]
    if (token.t === 'id') {
      const word = lower(token)
      if (
        word === 'not' || word === 'null' || word === 'default' || word === 'comment' ||
        word === 'primary' || word === 'unique' || word === 'references' || word === 'constraint' ||
        word === 'check' || word === 'auto_increment' || word === 'generated' || word === 'collate' ||
        word === 'character' || word === 'on' || word === 'unsigned' || word === 'zerofill' ||
        word === 'identity' || word === 'encode' || word === 'distkey' || word === 'sortkey'
      ) break
    }
    if (token.v === '(') {
      const close = findClosingParen(text, token.start)
      if (close < 0) break
      typeTokens.push(text.slice(token.start, close + 1))
      while (i < tokens.length && tokens[i].start <= close) i += 1
      i -= 1
      continue
    }
    typeTokens.push(token.v)
  }
  const type = typeTokens.join(' ').replace(/\s+/g, ' ').trim().toLowerCase()
  const upper = text.toUpperCase()
  const nullable = !/\bNOT\s+NULL\b/i.test(upper)
  let comment = ''
  const commentMatch = /COMMENT\s+'((?:[^']|'')*)'/i.exec(text)
  if (commentMatch) comment = commentMatch[1].replace(/''/g, "'")
  const column = { name, type, nullable, comment }
  table.columns.push(column)
  if (/\bPRIMARY\s+KEY\b/i.test(text)) table.primaryKey.push(name)
  const refMatch = /REFERENCES\s+([`"[\w.$]+)\s*\(([^)]*)\)/i.exec(text)
  if (refMatch) {
    table.foreignKeys.push({
      columns: [name],
      refTable: normalizeName(refMatch[1]),
      refColumns: parseColumnList(refMatch[2]),
      name: '',
    })
  }
  if (/\bUNIQUE\b/i.test(upper) && !/\bUNIQUE\s+(KEY|INDEX)\b/i.test(upper)) {
    table.indexes.push({ name: 'uk_' + name, columns: [name], unique: true, method: 'btree', source: 'ddl' })
  }
}

function parseTableBody(body, table) {
  for (const item of splitTopLevelCommas(body)) {
    const text = item.trim()
    if (text === '') continue
    const upper = text.toUpperCase()
    const head = upper.replace(/\s+/g, ' ').trim()

    if (/^PRIMARY\s+KEY\b/.test(head)) {
      const open = text.indexOf('(')
      const close = open < 0 ? -1 : findClosingParen(text, open)
      if (open >= 0 && close > 0) table.primaryKey = parseColumnList(text.slice(open + 1, close))
      continue
    }
    if (/^CONSTRAINT\b/.test(head) && /FOREIGN\s+KEY/.test(head)) {
      const fk = parseForeignKey(text, head)
      if (fk) table.foreignKeys.push(fk)
      continue
    }
    if (/^(FOREIGN\s+KEY|REFERENCES)\b/.test(head)) {
      const fk = parseForeignKey(text, head)
      if (fk) table.foreignKeys.push(fk)
      continue
    }
    const indexMatch = /^(UNIQUE\s+)?(?:FULLTEXT\s+|SPATIAL\s+)?(KEY|INDEX)\s*(?:([`"\w$]+)\s*)?\(/i.exec(text)
    if (indexMatch) {
      const open = text.indexOf('(', indexMatch.index + indexMatch[0].length - 1)
      const close = open < 0 ? -1 : findClosingParen(text, open)
      if (open >= 0 && close > 0) {
        table.indexes.push({
          name: normalizeName(indexMatch[3] || ''),
          columns: parseColumnList(text.slice(open + 1, close)),
          unique: Boolean(indexMatch[1]),
          method: /FULLTEXT/i.test(indexMatch[0]) ? 'fulltext' : /SPATIAL/i.test(indexMatch[0]) ? 'spatial' : 'btree',
          source: 'ddl',
        })
      }
      continue
    }
    if (/^CHECK\b/.test(head) || /^EXCLUDE\b/.test(head)) continue
    if (isColumnDefinition(text)) parseColumnDefinition(text, table)
  }
  if (table.primaryKey.length > 0) {
    table.indexes.push({ name: 'primary', columns: table.primaryKey.slice(), unique: true, method: 'btree', source: 'pk' })
  }
}

function parseForeignKey(text, head) {
  const fkMatch = /FOREIGN\s+KEY\s*\(([^)]*)\)\s*REFERENCES\s+([`"[\w.$]+)\s*(?:\(([^)]*)\))?/i.exec(text)
  if (!fkMatch) return null
  const nameMatch = /^CONSTRAINT\s+([`"\w$]+)/i.exec(head)
  return {
    columns: parseColumnList(fkMatch[1]),
    refTable: normalizeName(fkMatch[2]),
    refColumns: fkMatch[3] ? parseColumnList(fkMatch[3]) : [],
    name: nameMatch ? normalizeName(nameMatch[1]) : '',
  }
}

function applyPartitionTrailer(trailer, table) {
  const text = String(trailer || '')
  const partitionMatch = /PARTITION\s+BY\s+(?:RANGE|LIST|HASH|KEY|RANGE\s+COLUMNS|LIST\s+COLUMNS)\s*(?:\(([^)]*)\)|\(([^)]*)\)|\s+([`"\w$]+))/i.exec(text)
  if (partitionMatch) {
    const inner = partitionMatch[1] || partitionMatch[2] || partitionMatch[3] || ''
    const keys = parseColumnList(inner)
    for (const key of keys) {
      if (key && !table.partitionKeys.includes(key)) table.partitionKeys.push(key)
    }
  }
  const hivePartition = /PARTITIONED\s+BY\s*\(/i.exec(text)
  if (hivePartition) {
    const open = text.indexOf('(', hivePartition.index)
    const close = open < 0 ? -1 : findClosingParen(text, open)
    if (open >= 0 && close > 0) {
      for (const part of splitTopLevelCommas(text.slice(open + 1, close))) {
        const key = normalizeName(part.split(/\s+/)[0])
        if (key && !table.partitionKeys.includes(key)) table.partitionKeys.push(key)
      }
    }
  }
  const engineMatch = /ENGINE\s*=\s*([`"\w$]+)/i.exec(text)
  if (engineMatch) table.engine = normalizeName(engineMatch[1])
}

function lineNumberAt(text, index) {
  let line = 1
  for (let i = 0; i < index && i < text.length; i += 1) {
    if (text.charCodeAt(i) === 10) line += 1
  }
  return line
}

function parseDirectives(text) {
  const directives = []
  const pattern = /^[ \t]*(?:--|#|\/\/)[ \t]*(rows|行数|table|表|partition|分区|index|索引)\s*[:：=]?\s*(.*)$/gim
  let match = pattern.exec(text)
  while (match) {
    const kind = match[1].toLowerCase()
    const value = match[2].trim()
    directives.push({
      kind: /^(rows|行数)$/.test(kind) ? 'rows' : /^(table|表)$/.test(kind) ? 'table' : /^(partition|分区)$/.test(kind) ? 'partition' : 'index',
      value,
      at: match.index,
      line: lineNumberAt(text, match.index),
    })
    match = pattern.exec(text)
  }
  return directives
}

function parseSize(text) {
  const raw = String(text || '').trim().toLowerCase().replace(/[,，_\s]/g, '')
  const match = /^([0-9]*\.?[0-9]+)([kmgtw万]?)$/.exec(raw)
  if (!match) return null
  const base = Number(match[1])
  if (!Number.isFinite(base)) return null
  const unit = match[2]
  if (unit === 'k') return Math.round(base * 1e3)
  if (unit === 'm') return Math.round(base * 1e6)
  if (unit === 'g') return Math.round(base * 1e9)
  if (unit === 't') return Math.round(base * 1e12)
  if (unit === 'w' || unit === '万') return Math.round(base * 1e4)
  return Math.round(base)
}

/**
 * 解析 DDL / 数据字典。返回表对象数组（行数未填写时为 null）。
 * 支持：CREATE TABLE（含主键/外键/索引/分区/注释）、CREATE INDEX、
 * ALTER TABLE ADD INDEX、以及 `-- rows: 1200万` 这类行数指令。
 */
export function parseSchema(text) {
  const source = String(text || '').replace(/\r\n?/g, '\n')
  const tables = []
  const byName = new Map()
  if (source.trim() === '') return tables

  const directives = parseDirectives(source)
  const pendingRows = new Map()
  const pendingPartition = new Map()
  const pendingIndex = new Map()

  const directiveFor = (tableName) => {
    const key = normalizeName(tableName)
    const table = byName.get(key)
    if (!table) return
    if (pendingRows.has(key)) {
      table.rows = pendingRows.get(key)
      pendingRows.delete(key)
    }
    if (pendingPartition.has(key)) {
      for (const col of pendingPartition.get(key)) {
        if (col && !table.partitionKeys.includes(col)) table.partitionKeys.push(col)
      }
      pendingPartition.delete(key)
    }
    if (pendingIndex.has(key)) {
      for (const idx of pendingIndex.get(key)) table.indexes.push(idx)
      pendingIndex.delete(key)
    }
  }

  // 先登记指令：行数 / 分区 指令作用到「其后最近的一张表」，索引指令带表名
  const tablePositions = []
  const createTablePattern = /CREATE\s+(?:OR\s+REPLACE\s+)?(?:UNLOGGED\s+|TEMPORARY\s+|TEMP\s+|EXTERNAL\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([`"[\w.$]+)/gi
  let ctMatch = createTablePattern.exec(source)
  while (ctMatch) {
    tablePositions.push({ name: ctMatch[1], at: ctMatch.index })
    ctMatch = createTablePattern.exec(source)
  }

  for (const directive of directives) {
    if (directive.kind === 'rows') {
      const next = tablePositions.find((t) => t.at >= directive.at)
      if (next) {
        const size = parseSize(directive.value)
        if (size !== null) pendingRows.set(normalizeName(next.name), size)
      }
    } else if (directive.kind === 'partition') {
      const next = tablePositions.find((t) => t.at >= directive.at)
      if (next) pendingPartition.set(normalizeName(next.name), parseColumnList(directive.value))
    } else if (directive.kind === 'index') {
      const parsed = /([`"\w$.]+)\s*(?:->|:|\s)\s*(.+)/.exec(directive.value)
      const owner = parsed ? normalizeName(parsed[1]) : ''
      const spec = parsed ? parsed[2] : directive.value
      const index = parseIndexSpec(spec, 'manual')
      if (owner && index) {
        const list = pendingIndex.get(owner) || []
        list.push(index)
        pendingIndex.set(owner, list)
      }
    }
  }

  // CREATE TABLE
  const consumed = new Set()
  const re = /CREATE\s+(?:OR\s+REPLACE\s+)?(?:UNLOGGED\s+|TEMPORARY\s+|TEMP\s+|EXTERNAL\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([`"[\w.$]+)\s*(?:\(|\()/gi
  let match = re.exec(source)
  while (match) {
    const rawName = match[1]
    const openIndex = source.indexOf('(', match.index + match[0].length - 1)
    const closeIndex = openIndex < 0 ? -1 : findClosingParen(source, openIndex)
    if (openIndex < 0 || closeIndex < 0) {
      match = re.exec(source)
      continue
    }
    consumed.add(match.index)
    const table = ensureTable(tables, byName, rawName)
    const body = source.slice(openIndex + 1, closeIndex)
    parseTableBody(body, table)
    const semi = source.indexOf(';', closeIndex)
    const trailerEnd = semi < 0 ? Math.min(source.length, closeIndex + 400) : semi
    applyPartitionTrailer(source.slice(closeIndex + 1, trailerEnd), table)
    const commentMatch = /COMMENT\s*=\s*'((?:[^']|'')*)'/i.exec(source.slice(closeIndex + 1, trailerEnd))
    if (commentMatch) table.comment = commentMatch[1].replace(/''/g, "'")
    directiveFor(rawName)
    match = re.exec(source)
  }

  // CREATE INDEX
  const indexRe = /CREATE\s+(?:UNIQUE\s+|FULLTEXT\s+|SPATIAL\s+)?(?:BITMAP\s+)?INDEX\s+(?:CONCURRENTLY\s+|IF\s+NOT\s+EXISTS\s+)?([`"\w$.]+)\s+ON\s+([`"[\w.$]+)\s*(?:USING\s+[\w]+\s*)?\(/gi
  let indexMatch = indexRe.exec(source)
  while (indexMatch) {
    const openIndex = source.indexOf('(', indexMatch.index + indexMatch[0].length - 1)
    const closeIndex = openIndex < 0 ? -1 : findClosingParen(source, openIndex)
    if (openIndex < 0 || closeIndex < 0) {
      indexMatch = indexRe.exec(source)
      continue
    }
    const table = ensureTable(tables, byName, indexMatch[2])
    const keyword = indexMatch[0].toUpperCase()
    table.indexes.push({
      name: normalizeName(indexMatch[1]),
      columns: parseColumnList(source.slice(openIndex + 1, closeIndex)),
      unique: keyword.includes('UNIQUE'),
      method: keyword.includes('FULLTEXT') ? 'fulltext' : keyword.includes('SPATIAL') ? 'spatial' : keyword.includes('BITMAP') ? 'bitmap' : 'btree',
      source: 'ddl',
    })
    indexMatch = indexRe.exec(source)
  }

  // ALTER TABLE ADD [UNIQUE] INDEX / KEY / PRIMARY KEY
  const alterRe = /ALTER\s+TABLE\s+([`"[\w.$]+)\s+ADD\s+(?:CONSTRAINT\s+[`"\w$]+\s+)?(UNIQUE\s+)?(?:KEY|INDEX)\s*([`"\w$]+)?\s*\(/gi
  let alterMatch = alterRe.exec(source)
  while (alterMatch) {
    const openIndex = source.indexOf('(', alterMatch.index + alterMatch[0].length - 1)
    const closeIndex = openIndex < 0 ? -1 : findClosingParen(source, openIndex)
    if (openIndex < 0 || closeIndex < 0) {
      alterMatch = alterRe.exec(source)
      continue
    }
    const table = ensureTable(tables, byName, alterMatch[1])
    const columns = parseColumnList(source.slice(openIndex + 1, closeIndex))
    if (columns.length > 0) {
      table.indexes.push({
        name: normalizeName(alterMatch[3] || ''),
        columns,
        unique: Boolean(alterMatch[2]),
        method: 'btree',
        source: 'ddl',
      })
    }
    alterMatch = alterRe.exec(source)
  }

  // 表名兜底：指令里出现但正文没建表的
  for (const key of pendingRows.keys()) {
    const table = ensureTable(tables, byName, key)
    table.rows = pendingRows.get(key)
  }

  for (const table of tables) dedupeIndexes(table)
  for (const table of tables) directiveFor(table.name)

  return tables
}

function dedupeIndexes(table) {
  const seen = new Set()
  const kept = []
  for (const index of table.indexes) {
    if (!index || !Array.isArray(index.columns) || index.columns.length === 0) continue
    const key = index.columns.join(',')
    if (seen.has(key) && !index.unique) continue
    seen.add(key)
    kept.push(index)
  }
  table.indexes = kept
}

/** 解析「索引行」：`idx_a(a, b)` / `a, b` / `uk_user: user_id, tenant_id`。 */
export function parseIndexLines(text) {
  const out = []
  for (const line of String(text || '').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (trimmed === '') continue
    const index = parseIndexSpec(trimmed, 'manual')
    if (index) out.push(index)
  }
  return out
}

function parseIndexSpec(spec, source) {
  const text = String(spec || '').trim()
  if (text === '') return null
  const unique = /^unique\b/i.test(text)
  const body = text.replace(/^unique\s+/i, '')
  const named = /^([`"\w$.\-]+)\s*[:：(]\s*(.+)$/.exec(body)
  let name = ''
  let columnsText = body
  if (named && named[2].includes(',')) {
    name = normalizeName(named[1])
    columnsText = named[2]
  }
  const columns = parseColumnList(columnsText.replace(/^\(|\)$/g, ''))
  if (columns.length === 0) return null
  return { name, columns, unique, method: 'btree', source: source || 'manual' }
}

// ---------------------------------------------------------------- 语句解析

function tokenText(tokens, from, to) {
  const noSpaceBefore = new Set(['.', ',', ')', ']', ';'])
  const noSpaceAfter = new Set(['.', '('])
  // 这些关键字后面的 '(' 要留空格（IN (…)、EXISTS (…)），函数名后面不留（count(*)）
  const spaceBeforeParen = new Set([
    'in', 'exists', 'not', 'and', 'or', 'on', 'using', 'where', 'values', 'between',
    'select', 'from', 'union', 'all', 'any', 'some',
  ])
  let out = ''
  let previous = ''
  let previousWord = ''
  let previousIsWord = false
  for (let i = from; i < to && i < tokens.length; i += 1) {
    const token = tokens[i]
    if (token.t === 'comment') continue
    const piece = token.raw ? token.raw : token.t === 'str' ? "'" + token.v + "'" : token.v
    if (out === '') {
      out = piece
    } else {
      const firstChar = piece[0] || ''
      const isCall = firstChar === '(' && previousIsWord && !spaceBeforeParen.has(previousWord)
      if (noSpaceBefore.has(firstChar) || noSpaceAfter.has(previous) || isCall) out += piece
      else out += ' ' + piece
    }
    previous = piece[piece.length - 1] || ''
    previousWord = token.t === 'id' ? lower(token) : ''
    previousIsWord = token.t === 'id' && piece === token.v
  }
  return out.trim()
}

function collectRefs(tokens, from, to, skipWords) {
  const refs = []
  for (let i = from; i < to; i += 1) {
    const token = tokens[i]
    if (token.t !== 'id') continue
    const word = lower(token)
    if (skipWords && skipWords.has(word)) continue
    if (!token.quoted && NON_COLUMN_WORDS.has(word)) continue
    if (!token.quoted && CLAUSE_WORDS.has(word) && word !== 'from') continue
    const parts = [token.v]
    let j = i + 1
    while (j + 1 < to && tokens[j].v === '.' && (tokens[j + 1].t === 'id' || tokens[j + 1].v === '*')) {
      parts.push(tokens[j + 1].v)
      j += 2
    }
    if (tokens[j] && tokens[j].v === '(') continue
    refs.push({
      parts,
      start: i,
      end: j,
      raw: parts.join('.'),
      qualifier: parts.length > 1 ? parts[parts.length - 2] : '',
      column: parts[parts.length - 1],
    })
    i = j - 1
  }
  return refs
}

function refKey(ref) {
  return ref.qualifier ? normalizeName(ref.qualifier) + '.' + normalizeName(ref.column) : normalizeName(ref.column)
}

function splitConjuncts(tokens, from, to, depths) {
  const segments = []
  const base = depths[from] || 0
  let start = from
  let connector = null
  for (let i = from; i < to; i += 1) {
    const token = tokens[i]
    if ((depths[i] || 0) !== base) continue
    if (isWord(token, 'and') || isWord(token, 'or')) {
      const next = tokens.slice(i + 1, i + 2)[0]
      if (isWord(next, 'and') || isWord(next, 'or')) continue
      if (i > start) segments.push({ start, end: i, connector })
      connector = lower(token)
      start = i + 1
    }
  }
  if (start < to) segments.push({ start, end: to, connector })
  return segments.filter((segment) => segment.end > segment.start)
}

/**
 * 把 `(A OR B)` 这种整段被括号包住的复合条件拆成独立条件，
 * 否则 `x LIKE '%a%' OR y = 1` 会被当成「一个比较」，右半边被误读成列参与连接判断。
 */
function expandSegments(tokens, depths, from, to) {
  const out = []
  for (const segment of splitConjuncts(tokens, from, to, depths)) {
    const stripped = stripOuterParens(tokens, segment.start, segment.end)
    const inner = splitConjuncts(tokens, stripped.start, stripped.end, depths)
    if (inner.length > 1) {
      for (const child of inner) {
        out.push({ start: child.start, end: child.end, connector: child.connector || segment.connector })
      }
      continue
    }
    out.push(segment)
  }
  return out
}

function stripOuterParens(tokens, from, to) {
  let start = from
  let end = to
  while (start < end && tokens[start].v === '(' && tokens[end - 1] && tokens[end - 1].v === ')') {
    let depth = 0
    let closesAtEnd = false
    for (let i = start; i < end; i += 1) {
      if (tokens[i].v === '(') depth += 1
      if (tokens[i].v === ')') {
        depth -= 1
        if (depth === 0) {
          closesAtEnd = i === end - 1
          break
        }
      }
    }
    if (!closesAtEnd) break
    start += 1
    end -= 1
  }
  return { start, end }
}

function findOperator(tokens, from, to) {
  for (let i = from; i < to; i += 1) {
    const token = tokens[i]
    if (token.t === 'op' && ['=', '<>', '!=', '>=', '<=', '>', '<'].includes(token.v)) return { index: i, op: token.v }
    if (token.t === 'punct' && ['=', '>', '<'].includes(token.v)) return { index: i, op: token.v }
    if (token.t === 'id') {
      const word = lower(token)
      if (word === 'like' || word === 'ilike' || word === 'regexp' || word === 'rlike') return { index: i, op: word }
      if (word === 'between') return { index: i, op: 'between' }
      if (word === 'in') return { index: i, op: 'in' }
      if (word === 'is') return { index: i, op: 'is' }
      if (word === 'not') {
        const next = tokens[i + 1]
        if (isWord(next, 'in')) return { index: i, op: 'not in' }
        if (isWord(next, 'like')) return { index: i, op: 'not like' }
        if (isWord(next, 'between')) return { index: i, op: 'not between' }
      }
    }
  }
  return null
}

function sideInfo(tokens, from, to, depths) {
  const stripped = stripOuterParens(tokens, from, to)
  const start = stripped.start
  const end = stripped.end
  const refs = collectRefs(tokens, start, end)
  let func = ''
  if (end - start >= 3 && tokens[start].t === 'id' && tokens[start + 1] && tokens[start + 1].v === '(') {
    func = lower(tokens[start])
  }
  let literal = ''
  const values = []
  const stringTokens = []
  for (let i = start; i < end; i += 1) {
    if (tokens[i].t === 'str') stringTokens.push(tokens[i].v)
    if (tokens[i].t === 'num') values.push(tokens[i].v)
    if (isWord(tokens[i], 'null')) values.push('null')
  }
  if (stringTokens.length > 0) literal = 'string'
  else if (values.length > 0) literal = values.includes('null') && values.length === 1 ? 'null' : 'number'
  let arithmetic = false
  for (let i = start; i < end; i += 1) {
    if (tokens[i].t === 'op' && ['+', '-', '*', '/', '%', '||'].includes(tokens[i].v)) arithmetic = true
    if (tokens[i].t === 'punct' && ['+', '-', '*', '/', '%'].includes(tokens[i].v)) arithmetic = true
  }
  const isFunctionCall = refs.length > 0 && func !== ''
  return {
    start,
    end,
    refs,
    func: isFunctionCall ? func : '',
    literal,
    arithmetic,
    isConstant: refs.length === 0,
    isSingleColumn: refs.length === 1 && !isFunctionCall && !arithmetic,
    raw: tokenText(tokens, start, end),
  }
}

function lineOfToken(statement, token) {
  if (!token) return statement.startLine
  let line = statement.startLine
  const text = statement.text
  for (let i = 0; i < token.start && i < text.length; i += 1) {
    if (text.charCodeAt(i) === 10) line += 1
  }
  return line
}

function containsTopLevelOr(tokens, depths, from, to) {
  const base = depths[from] || 0
  for (let i = from; i < to; i += 1) {
    if (!isWord(tokens[i], 'or')) continue
    // 只看本层与紧邻的一层括号：子查询里（深度差 ≥2）的 OR 不算跨列 OR
    if ((depths[i] || 0) - base <= 1) return true
  }
  return false
}

function analyzePredicateSegment(statement, tokens, depths, segment, aliasMap) {
  const stripped = stripOuterParens(tokens, segment.start, segment.end)
  const operator = findOperator(tokens, stripped.start, stripped.end)
  if (!operator) {
    const side = sideInfo(tokens, stripped.start, stripped.end, depths)
    return {
      kind: 'expr',
      op: '',
      left: side,
      right: null,
      columns: side.refs,
      sargable: false,
      funcOnColumn: side.func,
      connector: segment.connector,
      hasOr: containsTopLevelOr(tokens, depths, stripped.start, stripped.end),
      line: lineOfToken(statement, tokens[stripped.start]),
      raw: side.raw,
    }
  }

  const left = sideInfo(tokens, stripped.start, operator.index, depths)
  const rightStart = operator.op === 'between' || operator.op === 'not between'
    ? operator.index + 1
    : operator.op === 'in' || operator.op === 'not in' || operator.op === 'is'
      ? tokens[operator.index + 1] && tokens[operator.index + 1].v === '(' ? operator.index + 1 : operator.index + 1
      : operator.index + 1
  const right = sideInfo(tokens, Math.min(rightStart, stripped.end), stripped.end, depths)

  const leftCols = left.refs.filter((ref) => resolveQualifier(ref, aliasMap))
  const rightCols = right.refs.filter((ref) => resolveQualifier(ref, aliasMap))
  const isJoin = leftCols.length === 1 && rightCols.length === 1 && !left.func && !right.func &&
    resolveQualifier(leftCols[0], aliasMap) !== resolveQualifier(rightCols[0], aliasMap)

  let sargable = false
  if (['=', '>', '<', '>=', '<=', '<>', '!=', 'between', 'in', 'not in', 'is'].includes(operator.op)) {
    if (leftCols.length === 1 && !left.func && !left.arithmetic && right.isConstant) sargable = true
    if (rightCols.length === 1 && !right.func && !right.arithmetic && left.isConstant) sargable = true
    if (right.isConstant && left.func) sargable = false
  }
  if (operator.op === 'like' || operator.op === 'ilike' || operator.op === 'regexp' || operator.op === 'rlike') {
    sargable = leftCols.length === 1 && !left.func && right.isConstant
  }

  const columns = leftCols.concat(rightCols)
  return {
    kind: isJoin ? 'join' : operator.op === 'like' || operator.op === 'not like' ? 'like' : sargable ? 'filter' : 'expr',
    op: operator.op,
    left,
    right,
    columns,
    sargable,
    funcOnColumn: left.func || right.func || '',
    connector: segment.connector,
    hasOr: containsTopLevelOr(tokens, depths, stripped.start, stripped.end),
    line: lineOfToken(statement, tokens[stripped.start]),
    raw: tokenText(tokens, stripped.start, stripped.end),
    pattern: operator.op === 'like' || operator.op === 'not like' || operator.op === 'ilike' ? (right.literal === 'string' ? extractStringLiteral(tokens, right.start, right.end) : '') : '',
    value: extractLiteral(tokens, right.start, right.end),
  }
}

function extractStringLiteral(tokens, from, to) {
  for (let i = from; i < to; i += 1) {
    if (tokens[i].t === 'str') return tokens[i].v
  }
  return ''
}

function extractLiteral(tokens, from, to) {
  for (let i = from; i < to; i += 1) {
    if (tokens[i].t === 'str') return tokens[i].v
    if (tokens[i].t === 'num') return tokens[i].v
  }
  return ''
}

function resolveQualifier(ref, aliasMap) {
  if (ref.parts.length === 1) {
    if (aliasMap.size === 1) {
      for (const table of aliasMap.values()) return table
      return ''
    }
    for (const table of aliasMap.values()) {
      if (table.columns.some((col) => col.name === normalizeName(ref.column))) return table
    }
    return ''
  }
  const qualifier = normalizeName(ref.qualifier)
  return aliasMap.get(qualifier) || null
}

function parseTableRefs(tokens, depths, from, to, statement) {
  const refs = []
  let i = from
  while (i < to) {
    const token = tokens[i]
    if (token.v === '(') {
      let depth = 0
      let j = i
      for (; j < to; j += 1) {
        if (tokens[j].v === '(') depth += 1
        if (tokens[j].v === ')') {
          depth -= 1
          if (depth === 0) break
        }
      }
      i = j + 1
      continue
    }
    if (token.t === 'id') {
      const word = lower(token)
      if (!token.quoted && (JOIN_WORDS.has(word) || word === 'on' || word === 'using')) break
      if (!token.quoted && CLAUSE_WORDS.has(word)) {
        i += 1
        continue
      }
      const parts = [token.v]
      let j = i + 1
      while (j + 1 < to && tokens[j].v === '.' && tokens[j + 1].t === 'id') {
        parts.push(tokens[j + 1].v)
        j += 2
      }
      let alias = ''
      let k = j
      if (isWord(tokens[k], 'as') && tokens[k + 1] && tokens[k + 1].t === 'id') {
        alias = tokens[k + 1].v
        k += 2
      } else if (tokens[k] && tokens[k].t === 'id' && !CLAUSE_WORDS.has(lower(tokens[k])) && !JOIN_WORDS.has(lower(tokens[k]))) {
        alias = tokens[k].v
        k += 1
      }
      const name = normalizeName(parts[parts.length - 1])
      if (name !== '' && !NON_COLUMN_WORDS.has(name)) {
        refs.push({
          name,
          rawName: parts.join('.'),
          schema: parts.length > 1 ? normalizeName(parts[parts.length - 2]) : '',
          alias: normalizeName(alias),
          line: lineOfToken(statement, token),
        })
      }
      i = Math.max(k, i + 1)
      continue
    }
    i += 1
  }
  return refs
}

function parseOrderBy(tokens, depths, from, to) {
  const items = []
  let i = from
  while (i < to) {
    const token = tokens[i]
    if (token.t === 'id') {
      const parts = [token.v]
      let j = i + 1
      while (j + 1 < to && tokens[j].v === '.' && tokens[j + 1].t === 'id') {
        parts.push(tokens[j + 1].v)
        j += 2
      }
      if (tokens[j] && tokens[j].v === '(') {
        let depth = 0
        for (; j < to; j += 1) {
          if (tokens[j].v === '(') depth += 1
          if (tokens[j].v === ')') {
            depth -= 1
            if (depth === 0) break
          }
        }
        i = j + 1
        continue
      }
      let direction = 'asc'
      let k = j
      if (isWord(tokens[k], 'desc')) {
        direction = 'desc'
        k += 1
      } else if (isWord(tokens[k], 'asc')) {
        k += 1
      }
      if (isWord(tokens[k], 'nulls')) k += 2
      items.push({
        column: normalizeName(parts[parts.length - 1]),
        qualifier: parts.length > 1 ? normalizeName(parts[parts.length - 2]) : '',
        direction,
        ordinal: parts.length === 1 && /^[0-9]+$/.test(parts[0]) ? Number(parts[0]) : null,
      })
      i = Math.max(k, i + 1)
      continue
    }
    i += 1
  }
  return items
}

function findTopLevel(tokens, depths, words, from) {
  for (let i = from || 0; i < tokens.length; i += 1) {
    if (depths[i] !== 0) continue
    const word = lower(tokens[i])
    if (words.includes(word)) return i
  }
  return -1
}

function findTopLevelAll(tokens, depths, words, from) {
  const out = []
  for (let i = from || 0; i < tokens.length; i += 1) {
    if (depths[i] !== 0) continue
    if (words.includes(lower(tokens[i]))) out.push(i)
  }
  return out
}

function parseStatement(statement, options) {
  const tokens = significant(statement.tokens)
  const depths = computeDepths(tokens)
  const result = {
    text: statement.text,
    startLine: statement.startLine,
    kind: '',
    explain: false,
    tables: [],
    joins: [],
    predicates: [],
    selectItems: [],
    groupBy: [],
    having: [],
    orderBy: [],
    limit: null,
    offset: null,
    distinct: false,
    starSelect: false,
    aggregates: [],
    windowFuncs: [],
    subqueries: [],
    unions: [],
    ctes: [],
    setOperations: [],
    warnings: [],
  }
  if (tokens.length === 0) return result

  let cursor = 0
  while (cursor < tokens.length && ['explain', 'describe', 'desc', 'analyze', 'analyse', 'explain'].includes(lower(tokens[cursor]))) {
    result.explain = true
    cursor += 1
    if (isWord(tokens[cursor], 'analyze') || isWord(tokens[cursor], 'format')) cursor += 2
  }
  const firstWord = tokens[cursor] ? lower(tokens[cursor]) : ''
  result.kind = firstWord ? firstWord.toUpperCase() : 'UNKNOWN'

  // CTE
  if (firstWord === 'with') {
    let i = cursor + 1
    while (i < tokens.length) {
      if (tokens[i].t === 'id' && tokens[i + 1] && (tokens[i + 1].v === '(' || isWord(tokens[i + 1], 'as'))) {
        result.ctes.push(normalizeName(tokens[i].v))
        while (i < tokens.length && tokens[i].v !== '(') i += 1
        let depth = 0
        for (; i < tokens.length; i += 1) {
          if (tokens[i].v === '(') depth += 1
          if (tokens[i].v === ')') {
            depth -= 1
            if (depth === 0) {
              i += 1
              break
            }
          }
        }
        if (tokens[i] && tokens[i].v === ',') {
          i += 1
          continue
        }
        break
      }
      i += 1
    }
    cursor = i
    const afterCte = tokens[cursor] ? lower(tokens[cursor]) : ''
    result.kind = afterCte ? afterCte.toUpperCase() : 'SELECT'
  }

  const selectAt = findTopLevel(tokens, depths, ['select'], cursor)
  const fromAt = findTopLevel(tokens, depths, ['from'], cursor)
  const whereAt = findTopLevel(tokens, depths, ['where'], cursor)
  const groupAt = findTopLevel(tokens, depths, ['group'], cursor)
  const havingAt = findTopLevel(tokens, depths, ['having'], cursor)
  const orderAt = findTopLevel(tokens, depths, ['order'], cursor)
  const limitAt = findTopLevel(tokens, depths, ['limit'], cursor)
  const offsetAt = findTopLevel(tokens, depths, ['offset'], cursor)
  const updateAt = findTopLevel(tokens, depths, ['update'], cursor)
  const deleteAt = findTopLevel(tokens, depths, ['delete'], cursor)
  const insertAt = findTopLevel(tokens, depths, ['insert'], cursor)
  const mergeAt = findTopLevel(tokens, depths, ['merge'], cursor)
  const unionAt = findTopLevelAll(tokens, depths, ['union', 'except', 'intersect'], cursor)
  const qualifyAt = findTopLevel(tokens, depths, ['qualify'], cursor)
  const setAt = findTopLevel(tokens, depths, ['set'], cursor)
  const valuesAt = findTopLevel(tokens, depths, ['values'], cursor)

  const clauseStops = [
    fromAt, whereAt, groupAt, havingAt, orderAt, limitAt, offsetAt,
    unionAt[0], qualifyAt, setAt, valuesAt,
  ].filter((index) => index > 0)

  // SELECT 列表
  if (selectAt >= 0) {
    const selectEnd = [
      fromAt > selectAt ? fromAt : -1,
      whereAt > selectAt ? whereAt : -1,
      groupAt > selectAt ? groupAt : -1,
      orderAt > selectAt ? orderAt : -1,
      unionAt.find((index) => index > selectAt) ?? -1,
    ].filter((index) => index > 0).sort((a, b) => a - b)[0]
    const end = selectEnd === undefined ? tokens.length : selectEnd
    let start = selectAt + 1
    if (isWord(tokens[start], 'distinct')) {
      result.distinct = true
      start += 1
    } else if (isWord(tokens[start], 'all')) {
      start += 1
    }
    if (isWord(tokens[start], 'top')) start += 2
    for (const item of splitTopLevelCommas(tokenText(tokens, start, end))) {
      const trimmed = item.trim()
      if (trimmed === '') continue
      result.selectItems.push(trimmed)
      if (/^\*$/.test(trimmed) || /\.\*$/.test(trimmed)) result.starSelect = true
    }
    for (let i = start; i < end; i += 1) {
      if (tokens[i].t === 'id' && tokens[i + 1] && tokens[i + 1].v === '(') {
        const fn = lower(tokens[i])
        if (AGG_FUNCS.has(fn) && !result.aggregates.includes(fn)) result.aggregates.push(fn)
        if (WINDOW_FUNCS.has(fn) && !result.windowFuncs.includes(fn)) result.windowFuncs.push(fn)
      }
    }
  }

  // 主表 / 连接表
  const fromRanges = []
  if (fromAt >= 0) {
    const end = clauseStops.filter((index) => index > fromAt).sort((a, b) => a - b)[0] ?? tokens.length
    fromRanges.push({ from: fromAt + 1, to: end })
  }
  if (updateAt >= 0) {
    const end = clauseStops.filter((index) => index > updateAt).sort((a, b) => a - b)[0] ?? tokens.length
    fromRanges.push({ from: updateAt + 1, to: end })
  }
  if (deleteAt >= 0 && fromAt < 0) {
    const end = clauseStops.filter((index) => index > deleteAt).sort((a, b) => a - b)[0] ?? tokens.length
    fromRanges.push({ from: deleteAt + 2, to: end })
  }
  if (insertAt >= 0) {
    const intoAt = findTopLevel(tokens, depths, ['into'], insertAt)
    if (intoAt >= 0) {
      const end = clauseStops.filter((index) => index > intoAt).sort((a, b) => a - b)[0] ?? tokens.length
      fromRanges.push({ from: intoAt + 1, to: end })
    }
  }
  if (mergeAt >= 0) {
    const intoAt = findTopLevel(tokens, depths, ['into'], mergeAt)
    if (intoAt >= 0) {
      const end = clauseStops.filter((index) => index > intoAt).sort((a, b) => a - b)[0] ?? tokens.length
      fromRanges.push({ from: intoAt + 1, to: end })
    }
    const usingAt = findTopLevel(tokens, depths, ['using'], mergeAt)
    if (usingAt >= 0) {
      const end = clauseStops.filter((index) => index > usingAt).sort((a, b) => a - b)[0] ?? tokens.length
      fromRanges.push({ from: usingAt + 1, to: end })
    }
  }

  const aliasMap = new Map()
  const registerRefs = (refs, role) => {
    for (const ref of refs) {
      const tableMeta = options.tableByName.get(ref.name) || null
      const alias = ref.alias || ref.name
      if (!aliasMap.has(alias)) {
        const entry = {
          name: ref.name,
          rawName: ref.rawName,
          alias,
          resolved: tableMeta,
          line: ref.line,
          role,
        }
        result.tables.push(entry)
        aliasMap.set(alias, tableMeta || {
          name: entry.name,
          rawName: entry.rawName,
          rows: null,
          columns: [],
          primaryKey: [],
          foreignKeys: [],
          partitionKeys: [],
          indexes: [],
        })
      }
      if (!aliasMap.has(ref.name)) aliasMap.set(ref.name, aliasMap.get(alias))
    }
  }

  const targetRole = result.kind === 'UPDATE' || result.kind === 'DELETE' || result.kind === 'INSERT' ? 'target' : 'source'
  for (const range of fromRanges) {
    registerRefs(parseTableRefs(tokens, depths, range.from, range.to, result), targetRole)
  }

  // JOIN 片段
  const joinAt = findTopLevelAll(tokens, depths, ['join', 'straight_join', 'apply', 'lateral'], cursor)
  for (const index of joinAt) {
    const end = clauseStops.filter((stop) => stop > index).sort((a, b) => a - b)[0] ?? tokens.length
    const onAt = findTopLevel(tokens, depths, ['on', 'using'], index)
    const tableRefs = parseTableRefs(tokens, depths, index + 1, onAt > index ? onAt : end, result)
    let joinKind = 'INNER'
    for (let i = Math.max(0, index - 3); i < index; i += 1) {
      const word = lower(tokens[i])
      if (word === 'left') joinKind = 'LEFT'
      else if (word === 'right') joinKind = 'RIGHT'
      else if (word === 'full') joinKind = 'FULL'
      else if (word === 'cross') joinKind = 'CROSS'
    }
    if (tableRefs.length > 0) {
      registerRefs(tableRefs.slice(0, 1), 'source')
      const attached = normalizeName(tableRefs[0].alias || tableRefs[0].name)
      result.joins.push({ kind: joinKind, table: attached, at: index })
    }
    if (onAt > index) {
      // ON 的范围要停在下一条 JOIN 的关键字（含 LEFT/RIGHT 等修饰词）之前，
      // 否则第二个 JOIN 的 ON 会被卷进第一条 ON 的条件里
      const onLimit = clauseStops.filter((stop) => stop > onAt).sort((a, b) => a - b)[0] ?? end
      let onEnd = onLimit
      for (let i = onAt + 1; i < onLimit; i += 1) {
        if ((depths[i] || 0) !== 0) continue
        if (tokens[i].t === 'id' && !tokens[i].quoted && JOIN_PHRASE_WORDS.has(lower(tokens[i]))) {
          onEnd = i
          break
        }
      }
      for (const segment of expandSegments(tokens, depths, onAt + 1, onEnd)) {
        result.predicates.push(analyzePredicateSegment(result, tokens, depths, segment, aliasMap))
      }
    }
  }

  // WHERE / HAVING / QUALIFY
  for (const [startAt, target] of [[whereAt, 'where'], [havingAt, 'having'], [qualifyAt, 'qualify']]) {
    if (startAt < 0) continue
    const end = clauseStops.filter((index) => index > startAt).sort((a, b) => a - b)[0] ?? tokens.length
    for (const segment of expandSegments(tokens, depths, startAt + 1, end)) {
      const predicate = analyzePredicateSegment(result, tokens, depths, segment, aliasMap)
      predicate.clause = target
      if (target === 'having') result.having.push(predicate)
      else result.predicates.push(predicate)
    }
  }

  // GROUP BY
  if (groupAt >= 0) {
    const end = clauseStops.filter((index) => index > groupAt).sort((a, b) => a - b)[0] ?? tokens.length
    for (const item of parseOrderBy(tokens, depths, groupAt + 2, end)) result.groupBy.push(item)
    if (result.groupBy.length === 0) {
      for (const ref of collectRefs(tokens, groupAt + 2, end)) {
        result.groupBy.push({ column: normalizeName(ref.column), qualifier: normalizeName(ref.qualifier), direction: 'asc', ordinal: null })
      }
    }
  }

  // ORDER BY
  if (orderAt >= 0) {
    const end = clauseStops.filter((index) => index > orderAt).sort((a, b) => a - b)[0] ?? tokens.length
    result.orderBy = parseOrderBy(tokens, depths, orderAt + 2, end)
  }

  // LIMIT / OFFSET
  if (limitAt >= 0) {
    const value = tokens[limitAt + 1]
    if (value && value.t === 'num') result.limit = Number(value.v)
    if (value && (isWord(value, 'all'))) result.limit = null
    if (isWord(tokens[limitAt + 2], 'offset') && tokens[limitAt + 3] && tokens[limitAt + 3].t === 'num') {
      result.offset = Number(tokens[limitAt + 3].v)
    }
    // MySQL: LIMIT offset, count
    if (value && value.t === 'num' && tokens[limitAt + 2] && tokens[limitAt + 2].v === ',') {
      result.offset = Number(value.v)
      if (tokens[limitAt + 3] && tokens[limitAt + 3].t === 'num') result.limit = Number(tokens[limitAt + 3].v)
    }
  }
  if (offsetAt >= 0 && result.offset === null) {
    const value = tokens[offsetAt + 1]
    if (value && value.t === 'num') result.offset = Number(value.v)
  }
  if (result.kind === 'SELECT' && result.limit === null && result.offset === null) {
    const fetchAt = findTopLevel(tokens, depths, ['fetch'], cursor)
    if (fetchAt >= 0) {
      const value = tokens[fetchAt + 2]
      if (value && value.t === 'num') result.limit = Number(value.v)
    }
  }

  // UNION
  for (const index of unionAt) {
    const next = tokens[index + 1]
    result.unions.push({ kind: isWord(next, 'all') ? 'UNION ALL' : lower(tokens[index]) === 'union' ? 'UNION' : lower(tokens[index]).toUpperCase() })
  }

  // 子查询
  for (let i = 0; i < tokens.length; i += 1) {
    if (tokens[i].v !== '(') continue
    let depth = 0
    let close = -1
    for (let j = i; j < tokens.length; j += 1) {
      if (tokens[j].v === '(') depth += 1
      if (tokens[j].v === ')') {
        depth -= 1
        if (depth === 0) {
          close = j
          break
        }
      }
    }
    if (close < 0) continue
    const inner = tokens.slice(i + 1, close)
    if (inner.some((token) => isWord(token, 'select'))) {
      const innerRefs = collectRefs(tokens, i + 1, close)
      let correlated = false
      for (const ref of innerRefs) {
        if (ref.qualifier && aliasMap.has(normalizeName(ref.qualifier))) {
          correlated = true
          break
        }
      }
      result.subqueries.push({
        line: lineOfToken(result, tokens[i]),
        correlated,
        inPredicate: isWord(tokens[i - 1], 'in') || isWord(tokens[i - 1], 'exists') ||
          (isWord(tokens[i - 1], 'not') && isWord(tokens[i - 2], 'in')),
        raw: tokenText(tokens, i, close + 1).slice(0, 400),
      })
    }
    i = close
  }

  return result
}

// ---------------------------------------------------------------- 索引匹配

function columnSetFor(statement, tableMeta, alias, includeJoin) {
  const equality = new Set()
  const joinEquality = new Set()
  const range = new Set()
  const all = new Set()
  const map = aliasMapFor(statement)
  for (const predicate of statement.predicates) {
    if (predicate.clause === 'having') continue
    for (const ref of predicate.columns) {
      const resolved = resolveQualifier(ref, map)
      if (!resolved) continue
      if (resolved.name !== tableMeta.name) continue
      const column = normalizeName(ref.column)
      all.add(column)
      if (predicate.kind === 'join') {
        if (includeJoin) joinEquality.add(column)
        continue
      }
      if (!predicate.sargable) continue
      if (['=', 'in', 'is'].includes(predicate.op)) equality.add(column)
      else if (predicate.op === 'like' || predicate.op === 'not like') {
        // 前导通配符（%x / _x）走不了索引，不能拿它去拼索引建议
        if (predicate.pattern && !/^[%_]/.test(predicate.pattern)) range.add(column)
      } else if (['>', '<', '>=', '<=', 'between'].includes(predicate.op)) range.add(column)
    }
  }
  return { equality, joinEquality, range, all }
}

function aliasMapFor(statement) {
  const map = new Map()
  for (const table of statement.tables) {
    map.set(table.alias, table.resolved || { name: table.name, columns: [], indexes: [], primaryKey: [], foreignKeys: [], partitionKeys: [], rows: null })
  }
  return map
}

function matchIndex(tableMeta, equality, range, orderColumns) {
  if (!tableMeta || !Array.isArray(tableMeta.indexes) || tableMeta.indexes.length === 0) return null
  let best = null
  for (const index of tableMeta.indexes) {
    const columns = index.columns.map(normalizeName)
    if (columns.length === 0) continue
    let position = 0
    let equalityUsed = 0
    let rangeUsed = false
    while (position < columns.length && equality.has(columns[position])) {
      position += 1
      equalityUsed += 1
    }
    if (position < columns.length && range.has(columns[position])) {
      position += 1
      rangeUsed = true
    }
    let orderUsed = 0
    if (!rangeUsed) {
      let orderPosition = position
      for (const column of orderColumns) {
        if (columns[orderPosition] === column) {
          orderPosition += 1
          orderUsed += 1
        } else {
          break
        }
      }
    }
    const score = equalityUsed * 10 + (rangeUsed ? 5 : 0) + orderUsed * 2 + (index.unique ? 1 : 0)
    if (equalityUsed === 0 && !rangeUsed && orderUsed === 0) continue
    if (!best || score > best.score) {
      best = {
        index,
        score,
        equalityUsed,
        rangeUsed,
        orderUsed,
        prefix: columns.slice(0, Math.max(position, orderUsed)),
        uniqueEquality: Boolean(index.unique) && equalityUsed === columns.length,
      }
    }
  }
  return best
}

function formatRows(rows) {
  if (rows === null || rows === undefined) return null
  return rows
}

// ---------------------------------------------------------------- 规则

function pushFinding(findings, finding) {
  const key = finding.code + '|' + (finding.table || '') + '|' + (finding.columns ? finding.columns.join(',') : '') + '|' + (finding.line || '')
  if (findings.some((item) => item.key === key)) return
  findings.push({ ...finding, key })
}

function detectTypeMismatch(columnType, literalKind) {
  if (!columnType || !literalKind) return false
  const type = columnType.toLowerCase()
  const numeric = /int|numeric|decimal|number|float|double|real|serial|money/.test(type) && !/char|text|varchar/.test(type)
  const textual = /char|text|varchar|string|clob/.test(type)
  if (numeric && literalKind === 'string') return true
  if (textual && literalKind === 'number') return true
  return false
}

function indexColumnsOf(tableMeta, column) {
  return (tableMeta.indexes || []).filter((index) => index.columns.map(normalizeName).includes(normalizeName(column)))
}

/** 复合索引建议：等值列 → 范围列 → 排序列；跳过已被现有索引前缀覆盖的。 */
function buildIndexSuggestion(tableMeta, equality, range, orderColumns) {
  const columns = []
  const seen = new Set()
  const push = (column) => {
    const key = normalizeName(column)
    if (!key || seen.has(key)) return
    seen.add(key)
    columns.push(key)
  }
  for (const column of equality) push(column)
  for (const column of range) push(column)
  for (const column of orderColumns) push(column)
  const limited = columns.slice(0, 5)
  if (limited.length === 0) return null
  const existing = (tableMeta.indexes || []).find((index) => {
    const cols = index.columns.map(normalizeName)
    if (cols.length < limited.length) return false
    return limited.every((column, position) => cols[position] === column)
  })
  if (existing) return null
  const partial = (tableMeta.indexes || []).find((index) => {
    const cols = index.columns.map(normalizeName)
    return cols.length > 0 && cols[0] === limited[0]
  })
  const name = 'idx_' + normalizeName(tableMeta.name).replace(/[^a-z0-9]+/g, '_') + '_' + limited.join('_')
  return {
    table: tableMeta.name,
    columns: limited,
    name,
    replaces: partial ? partial.name || partial.columns.join(',') : '',
    equalityColumns: [...equality].map(normalizeName),
    rangeColumns: [...range].map(normalizeName),
    orderColumns: orderColumns.map(normalizeName),
  }
}

function indexDdlFor(dialect, suggestion) {
  const table = suggestion.table
  const columns = suggestion.columns.join(', ')
  const name = suggestion.name
  switch (dialect) {
    case 'postgresql':
      return `CREATE INDEX CONCURRENTLY ${name} ON ${table} (${columns});`
    case 'oracle':
      return `CREATE INDEX ${name} ON ${table} (${columns}) ONLINE;`
    case 'sqlserver':
      return `CREATE NONCLUSTERED INDEX ${name} ON ${table} (${columns}) WITH (ONLINE = ON, DATA_COMPRESSION = PAGE);`
    case 'sqlite':
      return `CREATE INDEX ${name} ON ${table} (${columns});`
    case 'db2':
      return `CREATE INDEX ${name} ON ${table} (${columns}) ALLOW REVERSE SCANS;`
    case 'hive':
    case 'spark':
      return `-- ${table}: 该引擎无二级索引，请改走分区裁剪 / 分桶 / Z-ORDER：\n-- ALTER TABLE ${table} CLUSTERED BY (${columns}) INTO 64 BUCKETS;`
    case 'clickhouse':
      return `ALTER TABLE ${table} ADD INDEX ${name} (${columns}) TYPE minmax GRANULARITY 4;`
    case 'doris':
      return `-- ${table}: 前缀索引固定为表前几列；如需倒排索引：\nCREATE INDEX ${name} ON ${table} (${columns}) USING INVERTED;`
    default:
      return `ALTER TABLE ${table} ADD INDEX ${name} (${columns}), ALGORITHM = INPLACE, LOCK = NONE;`
  }
}

function collectExecutionTips(dialect, tables, statement) {
  const hints = []
  const settings = []
  const checklist = []
  const hasBig = tables.some((table) => table.rows && table.rows > BIG_TABLE)
  if (dialect === 'mysql' || dialect === 'mariadb' || dialect === 'tidb') {
    hints.push({ text: 'EXPLAIN FORMAT=JSON <SQL>', note: 'hint.explainJson' })
    hints.push({ text: '/*+ BNL(t2) */ 或 /*+ NO_BNL() */', note: 'hint.mysqlHint' })
    settings.push({ text: 'SET SESSION optimizer_switch="batched_key_access=on,derived_merge=on";', note: 'setting.mysqlMerge' })
    if (hasBig) settings.push({ text: 'SET SESSION tmp_table_size=256M, sort_buffer_size=32M;', note: 'setting.mysqlBigSort' })
    checklist.push('plan.check.mysql')
  } else if (dialect === 'postgresql') {
    hints.push({ text: 'EXPLAIN (ANALYZE, BUFFERS) <SQL>', note: 'hint.explainPg' })
    hints.push({ text: 'SET LOCAL enable_seqscan = off; -- 仅用于验证索引可用性', note: 'hint.pgSeqscan' })
    if (hasBig) settings.push({ text: 'SET LOCAL work_mem = \'256MB\'; SET LOCAL enable_hashjoin = on;', note: 'setting.pgWorkMem' })
    checklist.push('plan.check.pg')
  } else if (dialect === 'oracle') {
    hints.push({ text: '/*+ INDEX(t idx_name) INDEX_FFS(t) */', note: 'hint.oracleIndex' })
    hints.push({ text: '/*+ LEADING(t1 t2) USE_NL(t2) */', note: 'hint.oracleJoin' })
    settings.push({ text: 'EXEC DBMS_STATS.GATHER_TABLE_STATS(USER, \'T\', CASCADE => TRUE);', note: 'setting.oracleStats' })
    checklist.push('plan.check.oracle')
  } else if (dialect === 'sqlserver') {
    hints.push({ text: 'SET SHOWPLAN_ALL ON; / 或在 SSMS 中查看实际执行计划', note: 'hint.sqlserverPlan' })
    hints.push({ text: 'OPTION (OPTIMIZE FOR UNKNOWN, RECOMPILE)', note: 'hint.sqlserverOption' })
    settings.push({ text: 'UPDATE STATISTICS t WITH FULLSCAN;', note: 'setting.sqlserverStats' })
    checklist.push('plan.check.sqlserver')
  } else if (COLUMNAR.has(dialect)) {
    hints.push({ text: 'EXPLAIN EXTENDED <SQL>', note: 'hint.columnar' })
    settings.push({ text: 'SET hive.exec.dynamic.partition.mode=nonstrict;', note: 'setting.hivePartition' })
    checklist.push('plan.check.columnar')
  } else {
    hints.push({ text: 'EXPLAIN <SQL>', note: 'hint.explain' })
    checklist.push('plan.check.generic')
  }
  if (statement && statement.kind === 'SELECT' && statement.orderBy.length > 0 && statement.limit !== null) {
    checklist.push('plan.check.topn')
  }
  return { hints, settings, checklist }
}

function rewriteSuggestions(dialect, statement, tablesByName, findings) {
  const rewrites = []
  for (const predicate of statement.predicates) {
    if (predicate.funcOnColumn && predicate.value && ['=', '>', '<', '>=', '<='].includes(predicate.op)) {
      const column = predicate.columns[0]
      if (!column) continue
      const func = predicate.funcOnColumn
      if (['date', 'trunc', 'to_char', 'year', 'month', 'day', 'strftime', 'substr'].includes(func) && predicate.value) {
        const value = predicate.value
        const next = nextDay(value)
        if (next) {
          const col = column.qualifier ? column.qualifier + '.' + column.column : column.column
          rewrites.push({
            code: 'rewrite.dateRange',
            before: predicate.raw,
            after: `${col} >= '${value}' AND ${col} < '${next}'`,
            note: 'rewrite.dateRange.note',
          })
        }
      }
    }
    if (predicate.op === 'not in' && predicate.right && predicate.raw.includes('SELECT')) {
      const target = predicate.columns[0]
      if (target) {
        const col = target.qualifier ? target.qualifier + '.' + target.column : target.column
        rewrites.push({
          code: 'rewrite.notExists',
          before: predicate.raw,
          after: `NOT EXISTS (SELECT 1 FROM ... WHERE ... AND ... = ${col})`,
          note: 'rewrite.notExists.note',
        })
      }
    }
  }
  if (statement.starSelect && statement.tables.length > 0) {
    const table = statement.tables[0].resolved
    if (table && table.columns.length > 0) {
      rewrites.push({
        code: 'rewrite.explicitColumns',
        before: 'SELECT *',
        after: 'SELECT ' + table.columns.slice(0, 12).map((column) => column.name).join(', ') + (table.columns.length > 12 ? ', ...' : ''),
        note: 'rewrite.explicitColumns.note',
      })
    }
  }
  if (statement.offset !== null && statement.offset > 10000 && statement.orderBy.length > 0) {
    const order = statement.orderBy
      .map((item) => (item.qualifier ? item.qualifier + '.' : '') + item.column + (item.direction === 'desc' ? ' DESC' : ''))
      .join(', ')
    const plain = statement.orderBy.map((item) => (item.qualifier ? item.qualifier + '.' : '') + item.column)
    const descending = statement.orderBy[0].direction === 'desc'
    const cursor = plain.length === 1
      ? `${plain[0]} ${descending ? '<' : '>'} :lastValue`
      : `(${plain.join(', ')}) ${descending ? '<' : '>'} (${plain.map((_, index) => ':v' + (index + 1)).join(', ')})`
    rewrites.push({
      code: 'rewrite.keyset',
      before: predicate_placeholder(statement),
      after: `WHERE ${cursor}   -- 用上一页最后一行的排序键续翻\nORDER BY ${order} LIMIT ${statement.limit === null ? 20 : statement.limit}`,
      note: 'rewrite.keyset.note',
    })
  }
  if (statement.unions.length > 0 && statement.unions.every((union) => union.kind === 'UNION')) {
    rewrites.push({
      code: 'rewrite.unionAll',
      before: 'UNION (去重排序)',
      after: 'UNION ALL（确无重复时）',
      note: 'rewrite.unionAll.note',
    })
  }
  if (dialect === 'mysql' || dialect === 'oracle' || dialect === 'postgresql') {
    const hasOr = statement.predicates.filter((predicate) => predicate.connector === 'or').length > 0
    if (hasOr) {
      rewrites.push({
        code: 'rewrite.orToUnion',
        before: 'WHERE a = 1 OR b = 2',
        after: 'SELECT ... WHERE a = 1 UNION ALL SELECT ... WHERE b = 2',
        note: 'rewrite.orToUnion.note',
      })
    }
  }
  return rewrites
}

function predicate_placeholder(statement) {
  const offset = statement.offset || 0
  const limit = statement.limit === null ? '' : String(statement.limit)
  return `... LIMIT ${limit} OFFSET ${offset}`
}

function nextDay(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value))
  if (!match) return ''
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
  if (Number.isNaN(date.getTime())) return ''
  date.setUTCDate(date.getUTCDate() + 1)
  const yyyy = date.getUTCFullYear()
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(date.getUTCDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function analyzeStatement(statement, options) {
  const findings = []
  const indexSuggestions = []
  const { dialect } = options
  const tables = statement.tables.map((entry) => entry.resolved).filter(Boolean)

  // 笛卡尔积：多表之间没有任何连接条件（`FROM a, b` 这种逗号连接同样算）
  const cartesianTables = new Set()
  if (statement.tables.length > 1) {
    const cartesianMap = aliasMapFor(statement)
    const connectedTables = new Set()
    for (const predicate of statement.predicates) {
      if (predicate.kind !== 'join') continue
      for (const ref of predicate.columns) {
        const resolved = resolveQualifier(ref, cartesianMap)
        if (resolved) connectedTables.add(resolved.name)
      }
    }
    for (let i = 1; i < statement.tables.length; i += 1) {
      const entry = statement.tables[i]
      if (!connectedTables.has(entry.name)) cartesianTables.add(entry.name)
    }
    if (cartesianTables.size > 0) {
      pushFinding(findings, {
        code: 'cartesian',
        severity: 'high',
        line: statement.startLine,
        params: {
          tables: [...cartesianTables].map((name) => {
            const entry = statement.tables.find((item) => item.name === name)
            return entry ? entry.rawName : name
          }),
        },
      })
    }
  }

  for (const entry of statement.tables) {
    const tableMeta = entry.resolved
    if (!tableMeta) {
      pushFinding(findings, {
        code: 'unknownTable',
        severity: 'info',
        table: entry.name,
        line: entry.line,
        params: { table: entry.rawName },
      })
      continue
    }
    const aliasMap = aliasMapFor(statement)
    const { equality, joinEquality, range, all } = columnSetFor(statement, tableMeta, entry.alias, true)
    const orderColumns = statement.orderBy
      .filter((item) => {
        if (item.qualifier) return normalizeName(item.qualifier) === entry.alias
        return tableMeta.columns.some((column) => column.name === item.column)
      })
      .map((item) => item.column)

    const allEquality = new Set([...equality, ...joinEquality])
    const best = matchIndex(tableMeta, equality, range, orderColumns)
      || matchIndex(tableMeta, allEquality, range, orderColumns)
    const rows = tableMeta.rows
    const bigTable = rows !== null && rows > BIG_TABLE
    const wanted = [...allEquality, ...range]
    // 索引列顺序：驱动表的连接键来自别的表、用不上，只放过滤条件；
    // 被驱动表（内层）则以连接键打头，再拼过滤条件——嵌套循环才走得到索引。
    const drivingAlias = statement.tables[0] ? statement.tables[0].alias : ''
    const isDriving = entry.alias === drivingAlias
    const suggestionEquality = isDriving
      ? (equality.size > 0 ? equality : joinEquality)
      : new Set([...joinEquality, ...equality])
    const suggestion = wanted.length > 0
      ? buildIndexSuggestion(tableMeta, suggestionEquality, range, orderColumns)
      : null

    if (!best) {
      if (suggestion) {
        indexSuggestions.push({ ...suggestion, reason: 'noUsableIndex', rows })
        pushFinding(findings, {
          code: 'noUsableIndex',
          severity: bigTable ? 'high' : 'warn',
          table: tableMeta.name,
          line: entry.line,
          columns: wanted,
          params: { table: tableMeta.name, columns: wanted, rows: formatRows(rows) },
        })
      } else if (bigTable && statement.kind === 'SELECT' && !cartesianTables.has(tableMeta.name)) {
        pushFinding(findings, {
          code: 'fullScan',
          severity: 'warn',
          table: tableMeta.name,
          line: entry.line,
          params: { table: tableMeta.name, rows },
        })
      }
    } else if (best.index) {
      const usedColumns = best.index.columns.map(normalizeName)
      const extra = [...equality].filter((column) => !usedColumns.includes(column))
      if (extra.length > 0 && suggestion) {
        indexSuggestions.push({ ...suggestion, reason: 'indexNotCoveringEquality', rows })
        pushFinding(findings, {
          code: 'indexPartial',
          severity: 'warn',
          table: tableMeta.name,
          line: entry.line,
          columns: extra,
          params: { table: tableMeta.name, index: best.index.name || best.index.columns.join(','), columns: extra },
        })
      }
      // 排序无法走索引 → 需要 filesort / sort 算子
      if (orderColumns.length > 0) {
        const orderServed = best.orderUsed >= orderColumns.length && !best.rangeUsed
        if (!orderServed && (bigTable || orderColumns.length > 0)) {
          pushFinding(findings, {
            code: 'sortWithoutIndex',
            severity: bigTable ? 'warn' : 'info',
            table: tableMeta.name,
            line: entry.line,
            columns: orderColumns,
            params: { table: tableMeta.name, index: best.index.name || best.index.columns.join(','), columns: orderColumns },
          })
          if (suggestion) indexSuggestions.push({ ...suggestion, reason: 'sortWithoutIndex', rows })
        }
      }
      // 最左前缀被范围列截断
      const rangePosition = usedColumns.findIndex((column) => range.has(column))
      const laterEquality = rangePosition >= 0
        ? usedColumns.slice(rangePosition + 1).filter((column) => equality.has(column))
        : []
      if (laterEquality.length > 0) {
        pushFinding(findings, {
          code: 'rangeBeforeEquality',
          severity: 'info',
          table: tableMeta.name,
          line: entry.line,
          params: { table: tableMeta.name, index: best.index.name || best.index.columns.join(','), columns: laterEquality },
        })
      }
      // 覆盖索引
      if (statement.kind === 'SELECT' && !statement.starSelect) {
        const indexColumns = new Set(usedColumns)
        for (const pk of tableMeta.primaryKey) indexColumns.add(pk)
        const needed = statement.predicates
          .flatMap((predicate) => predicate.columns)
          .filter((ref) => {
            const resolved = resolveQualifier(ref, aliasMap)
            return resolved && resolved.name === tableMeta.name
          })
          .map((ref) => normalizeName(ref.column))
        const selectColumns = statement.selectItems
          .filter((item) => !/\(/.test(item))
          .map((item) => normalizeName(item.split(/\s+/)[0].split('.').pop()))
        const missing = [...new Set([...needed, ...selectColumns])].filter((column) => column && !indexColumns.has(column))
        if (missing.length === 0 && selectColumns.length > 0) {
          pushFinding(findings, {
            code: 'coveringIndex',
            severity: 'info',
            table: tableMeta.name,
            line: entry.line,
            params: { table: tableMeta.name, index: best.index.name || best.index.columns.join(',') },
          })
        }
      }
    }

    // 分区裁剪
    if (tableMeta.partitionKeys.length > 0) {
      const partitionPredicates = statement.predicates.filter((predicate) =>
        predicate.columns.some((ref) => tableMeta.partitionKeys.includes(normalizeName(ref.column))),
      )
      if (partitionPredicates.length === 0) {
        pushFinding(findings, {
          code: 'noPartitionFilter',
          severity: bigTable || COLUMNAR.has(dialect) ? 'high' : 'warn',
          table: tableMeta.name,
          line: entry.line,
          params: { table: tableMeta.name, keys: tableMeta.partitionKeys },
        })
      } else {
        for (const predicate of partitionPredicates) {
          if (predicate.funcOnColumn) {
            pushFinding(findings, {
              code: 'partitionFunction',
              severity: 'high',
              table: tableMeta.name,
              line: predicate.line,
              params: { table: tableMeta.name, column: predicate.columns[0] ? predicate.columns[0].column : '', func: predicate.funcOnColumn },
            })
          }
        }
      }
    }

    // 外键列无索引
    for (const fk of tableMeta.foreignKeys) {
      if (fk.columns.length === 0) continue
      const head = fk.columns[0]
      const indexed = indexColumnsOf(tableMeta, head)
      const alreadyAdvised = findings.some((finding) =>
        finding.table === tableMeta.name && Array.isArray(finding.columns) && finding.columns.includes(head),
      )
      if (indexed.length === 0 && !alreadyAdvised) {
        pushFinding(findings, {
          code: 'fkNoIndex',
          severity: tableMeta.rows && tableMeta.rows > 100000 ? 'warn' : 'info',
          table: tableMeta.name,
          line: entry.line,
          params: { table: tableMeta.name, columns: fk.columns, refTable: fk.refTable },
        })
        indexSuggestions.push({
          table: tableMeta.name,
          columns: fk.columns.slice(0, 3),
          name: 'idx_' + tableMeta.name + '_' + fk.columns.join('_'),
          reason: 'fkNoIndex',
          rows,
        })
      }
    }

    // 大表全量扫描的具体原因
    if (bigTable && !best && all.size === 0 && statement.kind === 'SELECT' && !cartesianTables.has(tableMeta.name)) {
      pushFinding(findings, {
        code: 'unfilteredBigTable',
        severity: 'high',
        table: tableMeta.name,
        line: entry.line,
        params: { table: tableMeta.name, rows },
      })
    }
  }

  // 谓词级规则
  for (const predicate of statement.predicates) {
    if (predicate.funcOnColumn && predicate.kind !== 'join') {
      const supported = ['date', 'trunc', 'to_char', 'to_date', 'year', 'month', 'day', 'substr', 'substring', 'strftime', 'upper', 'lower', 'ifnull', 'coalesce', 'nvl', 'cast', 'convert']
      if (supported.includes(predicate.funcOnColumn)) {
        pushFinding(findings, {
          code: 'funcOnColumn',
          severity: 'high',
          line: predicate.line,
          params: { func: predicate.funcOnColumn, column: predicate.columns[0] ? predicate.columns[0].column : '', raw: predicate.raw },
        })
      }
    }
    if (predicate.kind === 'like' && /^%/.test(predicate.pattern || '')) {
      pushFinding(findings, {
        code: 'leadingWildcard',
        severity: 'warn',
        line: predicate.line,
        params: { raw: predicate.raw, pattern: predicate.pattern },
      })
    }
    if (predicate.op === 'not in') {
      pushFinding(findings, { code: 'notIn', severity: 'warn', line: predicate.line, params: { raw: predicate.raw } })
    }
    if (predicate.connector === 'or' || predicate.hasOr) {
      pushFinding(findings, { code: 'orPredicate', severity: 'info', line: predicate.line, params: { raw: predicate.raw } })
    }
    // 隐式类型转换
    const columnRef = predicate.columns.find((ref) => ref.parts.length >= 1)
    if (columnRef && predicate.sargable && predicate.right && predicate.right.literal) {
      const tableMeta = statement.tables.map((entry) => entry.resolved).find((table) =>
        table && table.columns.some((column) => column.name === normalizeName(columnRef.column)),
      )
      if (tableMeta) {
        const column = tableMeta.columns.find((item) => item.name === normalizeName(columnRef.column))
        if (column && detectTypeMismatch(column.type, predicate.right.literal)) {
          pushFinding(findings, {
            code: 'implicitCast',
            severity: 'warn',
            line: predicate.line,
            params: { column: columnRef.column, columnType: column.type, literal: predicate.right.literal, raw: predicate.raw },
          })
        }
      }
    }
    if (predicate.kind === 'expr' && predicate.columns.length === 1 && predicate.arithmetic) {
      pushFinding(findings, {
        code: 'exprOnColumn',
        severity: 'warn',
        line: predicate.line,
        params: { raw: predicate.raw },
      })
    }
  }

  for (const subquery of statement.subqueries) {
    if (subquery.inPredicate && !subquery.correlated) {
      pushFinding(findings, { code: 'inSubquery', severity: 'info', line: subquery.line, params: { raw: subquery.raw } })
    }
    if (subquery.correlated) {
      pushFinding(findings, { code: 'correlatedSubquery', severity: 'warn', line: subquery.line, params: { raw: subquery.raw } })
    }
  }

  // 语句级规则
  if (statement.starSelect) {
    pushFinding(findings, {
      code: 'selectStar',
      severity: 'info',
      line: statement.startLine,
      params: { tables: statement.tables.map((entry) => entry.rawName).join(', ') },
    })
  }
  if ((statement.kind === 'UPDATE' || statement.kind === 'DELETE') && statement.predicates.filter((predicate) => predicate.clause !== 'having').length === 0) {
    pushFinding(findings, { code: 'noWhere', severity: 'high', line: statement.startLine, params: { kind: statement.kind } })
  }
  if (statement.offset !== null && statement.offset > 10000) {
    pushFinding(findings, { code: 'deepOffset', severity: 'warn', line: statement.startLine, params: { offset: statement.offset, limit: statement.limit } })
  }
  if (statement.distinct && tables.some((table) => table.rows && table.rows > BIG_TABLE)) {
    pushFinding(findings, { code: 'distinctBig', severity: 'info', line: statement.startLine, params: {} })
  }
  if (statement.orderBy.length > 0 && statement.limit === null && tables.some((table) => table.rows && table.rows > BIG_TABLE) && statement.kind === 'SELECT') {
    pushFinding(findings, { code: 'orderWithoutLimit', severity: 'warn', line: statement.startLine, params: {} })
  }
  if (statement.having.length > 0) {
    const movable = statement.having.filter((predicate) => !predicate.columns.some((ref) =>
      statement.groupBy.some((group) => group.column === normalizeName(ref.column)),
    ))
    if (movable.length > 0) {
      pushFinding(findings, { code: 'havingToWhere', severity: 'info', line: movable[0].line, params: {} })
    }
  }
  // 外连接被 WHERE 条件退化成内连接（笛卡尔积已在上面单独判过，这里只看左连接）
  if (statement.joins.length > 0) {
    for (const predicate of statement.predicates) {
      if (predicate.kind === 'join' || predicate.clause === 'having') continue
      const ref = predicate.columns[0]
      if (!ref) continue
      const alias = normalizeName(ref.qualifier)
      const join = statement.joins.find((item) => item.kind === 'LEFT' && item.table === alias)
      if (join) {
        pushFinding(findings, {
          code: 'leftJoinFiltered',
          severity: 'warn',
          line: predicate.line,
          params: { table: alias, raw: predicate.raw },
        })
      }
    }
  }
  if (statement.unions.some((union) => union.kind === 'UNION')) {
    pushFinding(findings, { code: 'unionDistinct', severity: 'info', line: statement.startLine, params: {} })
  }
  if (statement.aggregates.includes('count') && tables.some((table) => table.rows && table.rows > 5 * BIG_TABLE) && statement.predicates.length === 0) {
    pushFinding(findings, { code: 'countStar', severity: 'info', line: statement.startLine, params: {} })
  }

  const rewrites = rewriteSuggestions(dialect, statement, options.tableByName, findings)
  return { findings, indexSuggestions, rewrites }
}

// ---------------------------------------------------------------- 解释

function buildExplanation(statement, options) {
  const steps = []
  const addStep = (code, params) => steps.push({ code, params: params || {} })
  const tables = statement.tables
  addStep('explain.statement', { kind: statement.kind })

  if (tables.length > 0) {
    addStep('explain.tables', {
      tables: tables.map((entry) => {
        const rows = entry.resolved && entry.resolved.rows
        return {
          name: entry.rawName,
          alias: entry.alias !== entry.name ? entry.alias : '',
          rows: formatRows(rows),
          columns: entry.resolved ? entry.resolved.columns.length : 0,
          partitionKeys: entry.resolved ? entry.resolved.partitionKeys : [],
          indexCount: entry.resolved ? entry.resolved.indexes.length : 0,
        }
      }),
    })
  }
  if (statement.joins.length > 0) {
    addStep('explain.joins', {
      joins: statement.joins.map((join) => ({ kind: join.kind, table: join.table })),
      order: tables.map((entry) => entry.alias),
    })
  }
  if (statement.selectItems.length > 0) {
    addStep('explain.select', {
      items: statement.selectItems.slice(0, 20),
      star: statement.starSelect,
      aggregates: statement.aggregates,
    })
  }
  const filters = statement.predicates.filter((predicate) => predicate.clause !== 'having' && predicate.kind !== 'join')
  if (filters.length > 0) {
    addStep('explain.filters', {
      items: filters.map((predicate) => ({
        raw: predicate.raw,
        kind: predicate.kind,
        sargable: predicate.sargable,
        connector: predicate.connector,
      })),
    })
  }
  const joins = statement.predicates.filter((predicate) => predicate.kind === 'join')
  if (joins.length > 0) {
    addStep('explain.joinKeys', { items: joins.map((predicate) => predicate.raw) })
  }
  if (statement.groupBy.length > 0) {
    addStep('explain.groupBy', { columns: statement.groupBy.map((item) => item.column), aggregates: statement.aggregates })
  } else if (statement.aggregates.length > 0) {
    addStep('explain.aggregateNoGroup', { aggregates: statement.aggregates })
  }
  if (statement.having.length > 0) addStep('explain.having', { items: statement.having.map((predicate) => predicate.raw) })
  if (statement.distinct) addStep('explain.distinct', {})
  if (statement.orderBy.length > 0) {
    addStep('explain.orderBy', { items: statement.orderBy.map((item) => ({ column: item.column, direction: item.direction })) })
  }
  if (statement.limit !== null || statement.offset !== null) {
    addStep('explain.limit', { limit: statement.limit, offset: statement.offset })
  }
  if (statement.windowFuncs.length > 0) addStep('explain.window', { funcs: statement.windowFuncs })
  if (statement.subqueries.length > 0) {
    addStep('explain.subquery', {
      count: statement.subqueries.length,
      correlated: statement.subqueries.filter((subquery) => subquery.correlated).length,
    })
  }
  if (statement.unions.length > 0) addStep('explain.union', { kinds: statement.unions.map((union) => union.kind) })
  if (statement.ctes.length > 0) addStep('explain.cte', { names: statement.ctes })

  const access = []
  for (const entry of tables) {
    const tableMeta = entry.resolved
    if (!tableMeta) continue
    const aliasMap = aliasMapFor(statement)
    const { equality, joinEquality, range } = columnSetFor(statement, tableMeta, entry.alias, true)
    const best = matchIndex(tableMeta, equality, range, [])
      || matchIndex(tableMeta, new Set([...equality, ...joinEquality]), range, [])
    const rows = tableMeta.rows
    let estimate = null
    if (rows !== null && rows !== undefined) {
      if (best && best.uniqueEquality) estimate = 1
      else if (best && best.equalityUsed > 0) estimate = Math.max(1, Math.floor(rows / 100))
      else if (best && best.rangeUsed) estimate = Math.max(1, Math.floor(rows / 10))
      else estimate = rows
    }
    access.push({
      table: tableMeta.name,
      rows,
      estimate,
      index: best && best.index ? (best.index.name || best.index.columns.join(',')) : '',
      access: best ? (best.equalityUsed > 0 ? 'indexEq' : 'indexRange') : rows !== null && rows > BIG_TABLE ? 'scanBig' : 'scan',
    })
  }

  return {
    steps,
    access,
    logicalOrder: ['FROM/JOIN', 'ON', 'WHERE', 'GROUP BY', 'HAVING', 'SELECT', 'DISTINCT', 'ORDER BY', 'LIMIT'],
  }
}

// ---------------------------------------------------------------- 入口

/**
 * @param {{dialect?: string, sql?: string, schemaText?: string, tables?: Array<object>, maxStatements?: number}} request
 */
export function analyze(request) {
  const input = request || {}
  const dialect = DIALECTS.includes(input.dialect) ? input.dialect : 'mysql'
  const sql = String(input.sql || '')
  const parsedTables = parseSchema(input.schemaText || '')
  const overrides = Array.isArray(input.tables) ? input.tables : []

  const tableByName = new Map()
  for (const table of parsedTables) tableByName.set(table.name, table)
  for (const override of overrides) {
    const name = normalizeName(override.name)
    if (name === '') continue
    const base = tableByName.get(name) || { ...newTable(name, override.rawName || name) }
    const merged = { ...base }
    if (override.rows !== undefined && override.rows !== null && override.rows !== '') {
      const rows = typeof override.rows === 'number' ? override.rows : parseSize(override.rows)
      merged.rows = rows !== null && Number.isFinite(rows) ? rows : null
    }
    if (Array.isArray(override.indexes) && override.indexes.length > 0) {
      merged.indexes = base.indexes.concat(override.indexes)
    }
    if (Array.isArray(override.partitionKeys) && override.partitionKeys.length > 0) {
      merged.partitionKeys = Array.from(new Set(base.partitionKeys.concat(override.partitionKeys.map(normalizeName))))
    }
    if (Array.isArray(override.columns) && override.columns.length > 0 && base.columns.length === 0) {
      merged.columns = override.columns.map((column) => ({
        name: normalizeName(column.name),
        type: String(column.type || ''),
        nullable: column.nullable !== false,
        comment: String(column.comment || ''),
      }))
    }
    tableByName.set(name, merged)
  }
  const tables = Array.from(tableByName.values())
  for (const table of tables) dedupeIndexes(table)

  const rawStatements = splitStatements(sql)
  const limited = rawStatements.slice(0, Math.max(1, Math.min(input.maxStatements || 8, 20)))
  const statements = []
  const findings = []
  const indexSuggestions = []
  const rewrites = []
  const explanations = []
  const execution = []

  let line = 1
  for (let i = 0; i < limited.length; i += 1) {
    const tokens = limited[i]
    const body = tokens.filter((token) => token.t !== 'comment')
    if (body.length === 0) continue
    const text = sql.slice(body[0].start, body[body.length - 1].end)
    const startLine = lineNumberAt(sql, body[0].start)
    const statement = parseStatement({ tokens, text, startLine }, { dialect, tableByName })
    const outcome = analyzeStatement(statement, { dialect, tableByName })
    const explanation = buildExplanation(statement, { dialect, tableByName })
    const tips = collectExecutionTips(dialect, statement.tables.map((entry) => entry.resolved).filter(Boolean), statement)
    statements.push({
      index: i,
      kind: statement.kind,
      line: startLine,
      text,
      tables: statement.tables.map((entry) => entry.rawName),
      findings: outcome.findings.length,
    })
    for (const finding of outcome.findings) pushFinding(findings, { ...finding, statement: i })
    for (const suggestion of outcome.indexSuggestions) {
      const key = suggestion.table + '|' + suggestion.columns.join(',')
      if (indexSuggestions.some((item) => item.key === key)) continue
      indexSuggestions.push({ ...suggestion, key, statement: i, ddl: indexDdlFor(dialect, suggestion) })
    }
    for (const rewrite of outcome.rewrites) rewrites.push({ ...rewrite, statement: i })
    explanations.push({ index: i, kind: statement.kind, line: startLine, ...explanation })
    execution.push({ index: i, kind: statement.kind, line: startLine, ...tips })
    line = startLine
  }
  void line

  const severityRank = { high: 0, warn: 1, info: 2 }
  findings.sort((a, b) => (severityRank[a.severity] ?? 3) - (severityRank[b.severity] ?? 3))

  const summary = {
    statements: statements.length,
    tables: tables.length,
    rowsKnown: tables.filter((table) => table.rows !== null).length,
    high: findings.filter((finding) => finding.severity === 'high').length,
    warn: findings.filter((finding) => finding.severity === 'warn').length,
    info: findings.filter((finding) => finding.severity === 'info').length,
    indexes: indexSuggestions.length,
  }

  return {
    ok: true,
    dialect,
    empty: statements.length === 0,
    statements,
    tables: tables.map((table) => ({
      name: table.name,
      rawName: table.rawName,
      rows: table.rows,
      columns: table.columns.length,
      primaryKey: table.primaryKey,
      foreignKeys: table.foreignKeys,
      partitionKeys: table.partitionKeys,
      indexes: table.indexes,
      comment: table.comment,
      engine: table.engine,
    })),
    explanations,
    findings,
    indexSuggestions,
    rewrites,
    execution,
    summary,
  }
}
