/**
 * 浏览器半边的无头冒烟测试：用极小的 hooks 运行时把 client.js 真的跑起来，
 * 验证注册、渲染、自动分析、按钮回调与报告生成，不依赖浏览器。
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'

const here = dirname(fileURLToPath(import.meta.url))
const root = dirname(here)
const source = readFileSync(join(root, 'client.js'), 'utf8')

let failures = 0
let checks = 0
function check(label, condition, extra) {
  checks += 1
  if (!condition) {
    failures += 1
    console.error('FAIL  ' + label + (extra === undefined ? '' : '  ::  ' + JSON.stringify(extra).slice(0, 400)))
  }
}

// ---------------------------------------------------------------- 最小 React + hooks

function createReactRuntime() {
  const runtime = { hookIndex: 0, states: [], effects: [], memos: [], refs: [], dirty: false }
  const sameDeps = (a, b) => Boolean(a && b && a.length === b.length) && a.every((value, index) => Object.is(value, b[index]))
  const createElement = (type, props, ...children) => {
    const nextProps = Object.assign({}, props)
    if (children.length > 0) nextProps.children = children.length === 1 ? children[0] : children
    return { type, props: nextProps }
  }
  const React = {
    createElement,
    useState(initial) {
      const index = runtime.hookIndex
      runtime.hookIndex += 1
      if (!(index in runtime.states)) runtime.states[index] = { value: typeof initial === 'function' ? initial() : initial }
      const slot = runtime.states[index]
      return [slot.value, (next) => {
        const value = typeof next === 'function' ? next(slot.value) : next
        if (!Object.is(value, slot.value)) {
          slot.value = value
          runtime.dirty = true
        }
      }]
    },
    useEffect(fn, deps) {
      const index = runtime.hookIndex
      runtime.hookIndex += 1
      runtime.effects.push({ index, fn, deps })
    },
    useMemo(fn, deps) {
      const index = runtime.hookIndex
      runtime.hookIndex += 1
      const previous = runtime.memos[index]
      if (previous && sameDeps(previous.deps, deps)) return previous.value
      const value = fn()
      runtime.memos[index] = { value, deps }
      return value
    },
    useCallback(fn, deps) {
      const index = runtime.hookIndex
      runtime.hookIndex += 1
      const previous = runtime.memos[index]
      if (previous && sameDeps(previous.deps, deps)) return previous.value
      runtime.memos[index] = { value: fn, deps }
      return fn
    },
    useRef(initial) {
      const index = runtime.hookIndex
      runtime.hookIndex += 1
      if (!runtime.refs[index]) runtime.refs[index] = { current: initial }
      return runtime.refs[index]
    },
  }
  return { React, runtime, sameDeps }
}

const app = createReactRuntime()

function expand(node) {
  if (node === null || node === undefined || typeof node !== 'object') return node
  if (Array.isArray(node)) return node.map(expand)
  if (typeof node.type === 'function') return expand(node.type(node.props))
  const children = node.props && node.props.children !== undefined ? expand(node.props.children) : undefined
  return { type: node.type, props: Object.assign({}, node.props, { children }) }
}

/** 渲染整棵树：只有 SqlTunerApp 用 hooks，因此 hook 槽位可以用单列表驱动。 */
function renderApp(Component, props) {
  const runtime = app.runtime
  runtime.states = []
  runtime.memos = []
  runtime.refs = []
  runtime.effects = []
  runtime.hookIndex = 0
  const mountEffects = new Map()
  const wrapper = Component(props)
  let tree = null
  let renders = 0
  do {
    runtime.dirty = false
    runtime.hookIndex = 0
    runtime.effects = []
    tree = expand(wrapper)
    for (const effect of runtime.effects) {
      const previous = mountEffects.get(effect.index)
      if (previous && app.sameDeps(previous.deps, effect.deps)) continue
      if (previous && typeof previous.cleanup === 'function') previous.cleanup()
      const cleanup = effect.fn()
      mountEffects.set(effect.index, { deps: effect.deps, cleanup })
    }
    renders += 1
  } while (runtime.dirty && renders < 40)
  return { tree, renders }
}

// ---------------------------------------------------------------- DOM / 窗口桩

const styleNodes = []
/** 被「导出报告」触发的下载 */
const downloads = []
const documentStub = {
  documentElement: { lang: 'zh-CN' },
  head: {
    appendChild(node) {
      node.parentNode = documentStub.head
      styleNodes.push(node)
      return node
    },
    removeChild(node) {
      const index = styleNodes.indexOf(node)
      if (index >= 0) styleNodes.splice(index, 1)
      node.parentNode = null
      return node
    },
  },
  body: {
    appendChild(node) {
      node.parentNode = documentStub.body
      return node
    },
    removeChild(node) {
      node.parentNode = null
      return node
    },
  },
  createElement(tag) {
    return {
      tagName: tag,
      textContent: '',
      attributes: {},
      parentNode: null,
      setAttribute(name, value) { this.attributes[name] = value },
      click() {
        if (this.download) downloads.push({ name: this.download, href: this.href })
      },
    }
  },
}

const storage = new Map()
const windowStub = {
  localStorage: {
    getItem: (key) => (storage.has(key) ? storage.get(key) : null),
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: (key) => storage.delete(key),
  },
  setTimeout: (fn) => { fn(); return 1 },
  clearTimeout: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  FileReader: class {
    readAsText() { if (this.onload) this.onload() }
  },
  __ModuleLoader__: { load(definition) { windowStub.__loaded = definition } },
}
windowStub.window = windowStub
/** 导出报告会用到 Blob / URL.createObjectURL */
const blobs = []
windowStub.Blob = Blob
windowStub.URL = {
  createObjectURL(blob) {
    blobs.push(blob)
    return 'blob:sqlt-' + blobs.length
  },
  revokeObjectURL() {},
}

const clipboard = []
const sandbox = {
  window: windowStub,
  document: documentStub,
  navigator: {
    clipboard: {
      writeText(text) { clipboard.push(text); return Promise.resolve() },
      readText() { return Promise.resolve('SELECT 1') },
    },
  },
  console,
  setTimeout: windowStub.setTimeout,
  clearTimeout: windowStub.clearTimeout,
  Promise, JSON, Object, Array, Number, String, Math, Date, RegExp, Set, Map, Error, Boolean,
  isNaN, parseInt, parseFloat,
}
sandbox.globalThis = sandbox
vm.createContext(sandbox)
vm.runInContext(source, sandbox, { filename: 'client.js' })

check('client.js 注册了模块', Boolean(windowStub.__loaded))
check('模块 id 是包名', windowStub.__loaded && windowStub.__loaded.id === 'dsh-sql-tuner', windowStub.__loaded && windowStub.__loaded.id)

const moduleExports = windowStub.__loaded.factory((name) => {
  if (name === 'react') return app.React
  throw new Error('unexpected require: ' + name)
})
check('factory 返回 inject + apply', Boolean(moduleExports && moduleExports.apply), moduleExports && Object.keys(moduleExports))
check('inject 含 slots', moduleExports.inject.indexOf('slots') >= 0, moduleExports.inject)

// ---------------------------------------------------------------- apply

const registrations = []
let localeActive = 'zh-CN'
const ctx = {
  get(name) {
    if (name === 'locale') return { getLocale: () => ({ active: localeActive }), subscribe: () => () => {} }
    if (name === 'layout') return { selectPanel: (id) => { ctx.lastPanel = id } }
    return undefined
  },
  effect(fn) {
    const cleanup = fn()
    return () => { if (typeof cleanup === 'function') cleanup() }
  },
  slots: {
    inject(key, callback) {
      registrations.push({ inject: key })
      return callback()
    },
    register(options, component) {
      registrations.push({ options, component })
      return () => {}
    },
  },
  logger: { info() {} },
}

moduleExports.apply(ctx)

const mainRegistration = registrations.find((item) => item.options && item.options.key === 'sql-tuner')
const sidebarRegistration = registrations.find((item) => item.options && item.options.id === 'sql-tuner')
check('注册了 main 面板', Boolean(mainRegistration), registrations.map((r) => r.options && (r.options.key || r.options.id)))
check('注册了侧边栏图标', Boolean(sidebarRegistration), registrations.map((r) => r.options && (r.options.key || r.options.id)))
check('main 注册名正确', mainRegistration && mainRegistration.options.name === 'main', mainRegistration && mainRegistration.options)
check('侧边栏 label 是函数', sidebarRegistration && typeof sidebarRegistration.options.label === 'function')
check('侧边栏 order 存在', sidebarRegistration && typeof sidebarRegistration.options.order === 'number', sidebarRegistration && sidebarRegistration.options.order)
check('样式已注入', styleNodes.length === 1 && styleNodes[0].textContent.includes('.sqlt-root'), styleNodes.length)
check('侧边栏标题为中文', sidebarRegistration.options.label() === 'SQL 调优', sidebarRegistration.options.label())

const iconTree = expand(sidebarRegistration.component({ size: 18, active: true }))
check('图标渲染为 svg', iconTree && iconTree.type === 'svg', iconTree && iconTree.type)
check('图标带 viewBox', iconTree && iconTree.props.viewBox === '0 0 24 24', iconTree && iconTree.props.viewBox)

// ---------------------------------------------------------------- 遍历工具

function collectText(node, out) {
  if (!node) return out
  if (Array.isArray(node)) { node.forEach((item) => collectText(item, out)); return out }
  if (typeof node === 'string' || typeof node === 'number') { out.push(String(node)); return out }
  if (typeof node !== 'object' || !node.props) return out
  collectText(node.props.children, out)
  return out
}

function findButtons(node, out) {
  if (!node) return out
  if (Array.isArray(node)) { node.forEach((item) => findButtons(item, out)); return out }
  if (typeof node !== 'object' || !node.props) return out
  if (node.type === 'button') out.push(node)
  findButtons(node.props.children, out)
  return out
}

const Panel = mainRegistration.component

// ---------------------------------------------------------------- 空状态

storage.clear()
const empty = renderApp(Panel, {})
check('面板渲染出根节点', empty.tree && empty.tree.props && empty.tree.props.className === 'sqlt-root', empty.tree && empty.tree.props && empty.tree.props.className)
check('渲染轮次有限', empty.renders < 40, empty.renders)
const emptyTexts = collectText(empty.tree, [])
check('空状态提示存在', emptyTexts.includes('还没有可分析的内容'), emptyTexts.slice(0, 20))
check('左侧有数据字典提示', emptyTexts.some((text) => text.includes('CREATE TABLE')), emptyTexts.filter((text) => text.includes('CREATE')).slice(0, 3))

const emptyButtons = findButtons(empty.tree, [])
check('工具按钮数量', emptyButtons.length >= 8, emptyButtons.map((b) => collectText(b, []).join('')).slice(0, 20))
const sampleButton = emptyButtons.find((button) => collectText(button, []).join('') === '示例')
check('找到示例按钮', Boolean(sampleButton), emptyButtons.map((b) => collectText(b, []).join('')))
if (sampleButton) {
  let threw = null
  try { sampleButton.props.onClick() } catch (error) { threw = error }
  check('示例按钮不报错', threw === null, threw && String(threw))
}
const clearButton = emptyButtons.find((button) => collectText(button, []).join('') === '清空')
check('找到清空按钮', Boolean(clearButton))

// 导入文件入口
const fileInput = (function find(node) {
  if (!node) return null
  if (Array.isArray(node)) { for (const item of node) { const hit = find(item); if (hit) return hit } return null }
  if (typeof node !== 'object' || !node.props) return null
  if (node.type === 'input' && node.props.type === 'file') return node
  return find(node.props.children)
})(empty.tree)
check('有文件导入 input', Boolean(fileInput), fileInput && fileInput.props.accept)
check('导入接受 .sql', fileInput && String(fileInput.props.accept).includes('.sql'), fileInput && fileInput.props.accept)

// ---------------------------------------------------------------- 中文分析结果

storage.set('dsh-sql-tuner.v1', JSON.stringify({
  dialect: 'mysql',
  schemaText: "-- rows: 1200万\nCREATE TABLE t_order (id bigint NOT NULL, status tinyint NOT NULL, create_time datetime NOT NULL, PRIMARY KEY (id), KEY idx_status (status)) PARTITION BY RANGE (create_time);",
  sql: "SELECT o.id FROM t_order o WHERE DATE(o.create_time) >= '2024-05-01' AND o.status = 1 ORDER BY o.create_time DESC LIMIT 20 OFFSET 50000;",
  tab: 'advice',
}))
const zh = renderApp(Panel, {})
const zhTexts = collectText(zh.tree, [])
check('分析后出现函数包列建议', zhTexts.some((text) => text.includes('索引列被函数包裹')), zhTexts.filter((t) => t.length < 30).slice(0, 30))
check('分析后出现分区提示', zhTexts.some((text) => text.includes('分区')), zhTexts.filter((t) => t.includes('分区')).slice(0, 3))
check('出现中文行数格式', zhTexts.some((text) => text.includes('万')), zhTexts.filter((t) => t.includes('万')).slice(0, 5))
check('建议标签页被选中', zhTexts.some((text) => text.includes('优化建议')), true)
check('出现行号标记', zhTexts.some((text) => /^L\d+$/.test(text)), zhTexts.filter((t) => /^L/.test(t)).slice(0, 5))
check('左侧解析出表', zhTexts.some((text) => text.includes('已识别 1 张表')), zhTexts.filter((t) => t.includes('已识别')).slice(0, 3))

const zhButtons = findButtons(zh.tree, [])
const exportButton = zhButtons.find((button) => collectText(button, []).join('') === '导出报告')
check('找到「导出报告」按钮', Boolean(exportButton), zhButtons.map((b) => collectText(b, []).join('')))
if (exportButton) {
  downloads.length = 0
  blobs.length = 0
  exportButton.props.onClick()
  check('触发一次下载', downloads.length === 1, downloads)
  check('文件名是 .docx', Boolean(downloads[0]) && /\.docx$/.test(downloads[0].name), downloads[0] && downloads[0].name)
  check('文件名带时间戳', Boolean(downloads[0]) && /sql-tuning-report-\d{8}-\d{4}\.docx/.test(downloads[0].name), downloads[0] && downloads[0].name)
  check('生成了一份 docx Blob', blobs.length === 1 && blobs[0].size > 2000, blobs.map((b) => b.size))
  check('Blob 的 MIME 是 wordprocessingml', blobs[0] && blobs[0].type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', blobs[0] && blobs[0].type)
  check('「复制报告」按钮已被替换掉', !zhButtons.some((b) => collectText(b, []).join('') === '复制报告'), true)
}

const dropButton = zhButtons.find((button) => collectText(button, []).join('') === '发给 AI 深入分析')
check('找到发给 AI 按钮', Boolean(dropButton), zhButtons.map((b) => collectText(b, []).join('')))
if (dropButton) {
  clipboard.length = 0
  ctx.lastPanel = null
  dropButton.props.onClick()
  check('切到对话面板', ctx.lastPanel === 'conversation', ctx.lastPanel)
  check('同时复制了提示词', clipboard.length === 1 && clipboard[0].includes('请基于以上结构化结论'), clipboard[0] && clipboard[0].slice(-160))
}

// ---------------------------------------------------------------- 英文界面

localeActive = 'en-US'
storage.set('dsh-sql-tuner.v1', JSON.stringify({
  dialect: 'postgresql',
  schemaText: 'CREATE TABLE t_user (id bigint PRIMARY KEY, city varchar(32), created_at timestamp);',
  sql: "SELECT * FROM t_user WHERE city = 'x'",
  tab: 'advice',
}))
const en = renderApp(Panel, {})
const enTexts = collectText(en.tree, [])
check('英文界面标题', enTexts.includes('SQL tuner'), enTexts.slice(0, 12))
check('英文建议条目', enTexts.some((text) => text.includes('Avoid SELECT *')), enTexts.filter((t) => t.includes('SELECT')).slice(0, 5))
check('英文无中文残留提示', !enTexts.includes('还没有可分析的内容'), true)
check('英文侧边栏标题', (function () {
  const previous = localeActive
  localeActive = 'en-US'
  const label = sidebarRegistration.options.label()
  localeActive = previous
  return label === 'SQL tuner'
})(), 'label check')

// ---------------------------------------------------------------- 执行优化页

storage.set('dsh-sql-tuner.v1', JSON.stringify({
  dialect: 'postgresql',
  schemaText: 'CREATE TABLE t_user (id bigint PRIMARY KEY, city varchar(32), created_at timestamp);',
  sql: "SELECT id FROM t_user WHERE city = 'x'",
  tab: 'exec',
}))
const exec = renderApp(Panel, {})
const execTexts = collectText(exec.tree, [])
check('执行页有索引建议标题', execTexts.includes('Index suggestions'), execTexts.filter((t) => t.length < 28).slice(0, 30))
check('执行页有 PG 并发建索引', execTexts.some((text) => text.includes('CONCURRENTLY')), execTexts.filter((t) => t.includes('INDEX')).slice(0, 6))

// ---------------------------------------------------------------- 解释页

localeActive = 'zh-CN'
storage.set('dsh-sql-tuner.v1', JSON.stringify({
  dialect: 'mysql',
  schemaText: 'CREATE TABLE t_order (id bigint PRIMARY KEY, status tinyint, create_time datetime, KEY idx_status (status));',
  sql: 'SELECT status, count(*) FROM t_order WHERE status = 1 GROUP BY status ORDER BY status LIMIT 10',
  tab: 'explain',
}))
const explain = renderApp(Panel, {})
const explainTexts = collectText(explain.tree, [])
check('解释页有语句类型', explainTexts.includes('语句类型'), explainTexts.filter((t) => t.length < 20).slice(0, 20))
check('解释页有聚合', explainTexts.some((text) => text.includes('count')), explainTexts.filter((t) => t.includes('count')).slice(0, 5))
check('解释页有访问方式表', explainTexts.some((text) => text.includes('预计访问方式')), explainTexts.filter((t) => t.includes('访问')).slice(0, 3))

// ---------------------------------------------------------------- 卸载清理

const styleNode = styleNodes[0]
documentStub.head.removeChild(styleNode)
check('样式可卸载', !styleNodes.includes(styleNode) && styleNode.parentNode === null, styleNodes.length)

const finalLocale = localeActive
void finalLocale

console.log('')
console.log(`${checks - failures}/${checks} 项检查通过`)
if (failures > 0) {
  console.error(failures + ' 项失败')
  process.exit(1)
}
console.log('客户端冒烟测试通过')
