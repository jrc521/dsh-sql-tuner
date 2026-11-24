import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../src/client-src.js', import.meta.url), 'utf8')
const lines = source.split('\n')
const zhStart = lines.findIndex((line) => line.trim() === 'zh: {')
const enStart = lines.findIndex((line) => line.trim() === 'en: {')
const dictEnd = lines.findIndex((line, index) => index > enStart && line.trim() === '}')

function keysOf(from, to) {
  const keys = []
  const duplicates = []
  for (let i = from; i < to; i += 1) {
    const match = /^    '([^']+)':/.exec(lines[i]) || /^    "([^"]+)":/.exec(lines[i])
    if (!match) continue
    if (keys.includes(match[1])) duplicates.push(match[1])
    keys.push(match[1])
  }
  return { keys, duplicates }
}

const zh = keysOf(zhStart, enStart)
const en = keysOf(enStart, dictEnd)
console.log('zh keys: ' + zh.keys.length + '  en keys: ' + en.keys.length)
console.log('zh duplicates: ' + (zh.duplicates.join(', ') || 'none'))
console.log('en duplicates: ' + (en.duplicates.join(', ') || 'none'))
const missingInZh = en.keys.filter((key) => !zh.keys.includes(key))
const missingInEn = zh.keys.filter((key) => !en.keys.includes(key))
console.log('missing in zh: ' + (missingInZh.join(', ') || 'none'))
console.log('missing in en: ' + (missingInEn.join(', ') || 'none'))
console.log('zh block lines: ' + (enStart - zhStart) + '  en block lines: ' + (dictEnd - enStart))

// 检查代码里引用的 translator key 是否都存在
const referenced = new Set()
const patterns = [
  /t\('([a-zA-Z][\w.]*)'/g,
  /t\(rewrite\.code\)/g,
  /'f\.' \+ finding\.code/g,
]
for (const pattern of patterns) {
  let match = pattern.exec(source)
  while (match) {
    if (match[1]) referenced.add(match[1])
    match = pattern.exec(source)
  }
}
const unresolved = [...referenced].filter((key) => !zh.keys.includes(key) && !en.keys.includes(key))
console.log('unresolved t() keys: ' + (unresolved.join(', ') || 'none'))

const foreignKeys = [
  'explain.statement', 'explain.tables', 'explain.joins', 'explain.select', 'explain.filters',
  'explain.joinKeys', 'explain.groupBy', 'explain.aggregateNoGroup', 'explain.having', 'explain.distinct',
  'explain.orderBy', 'explain.limit', 'explain.window', 'explain.subquery', 'explain.union', 'explain.cte',
  'plan.check.mysql', 'plan.check.pg', 'plan.check.oracle', 'plan.check.sqlserver', 'plan.check.columnar',
  'plan.check.generic', 'plan.check.topn',
  'hint.explainJson', 'hint.mysqlHint', 'hint.explainPg', 'hint.pgSeqscan', 'hint.oracleIndex', 'hint.oracleJoin',
  'hint.sqlserverPlan', 'hint.sqlserverOption', 'hint.columnar', 'hint.explain',
  'setting.mysqlMerge', 'setting.mysqlBigSort', 'setting.pgWorkMem', 'setting.oracleStats',
  'setting.sqlserverStats', 'setting.hivePartition',
  'rewrite.dateRange', 'rewrite.dateRange.note', 'rewrite.notExists', 'rewrite.notExists.note',
  'rewrite.explicitColumns', 'rewrite.explicitColumns.note', 'rewrite.keyset', 'rewrite.keyset.note',
  'rewrite.unionAll', 'rewrite.unionAll.note', 'rewrite.orToUnion', 'rewrite.orToUnion.note',
]
const missingEngineKeys = foreignKeys.filter((key) => !zh.keys.includes(key) || !en.keys.includes(key))
console.log('engine keys missing from a locale: ' + (missingEngineKeys.join(', ') || 'none'))

const findingCodes = ['selectStar', 'noWhere', 'funcOnColumn', 'leadingWildcard', 'implicitCast', 'orPredicate',
  'notIn', 'noUsableIndex', 'indexPartial', 'fkNoIndex', 'noPartitionFilter', 'partitionFunction', 'deepOffset',
  'sortWithoutIndex', 'distinctBig', 'cartesian', 'countStar', 'orderWithoutLimit', 'havingToWhere',
  'correlatedSubquery', 'inSubquery', 'coveringIndex', 'rangeBeforeEquality', 'leftJoinFiltered',
  'unionDistinct', 'unknownTable', 'fullScan', 'unfilteredBigTable']
const missingFinding = []
for (const code of findingCodes) {
  for (const suffix of ['title', 'why', 'fix']) {
    const key = 'f.' + code + '.' + suffix
    if (!zh.keys.includes(key) || !en.keys.includes(key)) missingFinding.push(key)
  }
}
console.log('finding keys missing: ' + (missingFinding.join(', ') || 'none'))

const detailCodes = ['noUsableIndex', 'indexPartial', 'sortWithoutIndex', 'fkNoIndex', 'noPartitionFilter',
  'partitionFunction', 'funcOnColumn', 'implicitCast', 'deepOffset', 'unknownTable', 'cartesian',
  'leftJoinFiltered', 'coveringIndex', 'noWhere', 'rowsOnly']
const missingDetail = detailCodes.filter((code) => !zh.keys.includes('d.' + code) || !en.keys.includes('d.' + code))
console.log('detail keys missing: ' + (missingDetail.join(', ') || 'none'))
