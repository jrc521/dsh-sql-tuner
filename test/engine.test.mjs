/**
 * 引擎自测：node/electron 均可运行，无外部依赖。
 *   ELECTRON_RUN_AS_NODE=1 node test/engine.test.mjs
 */

import { analyze, parseSchema, parseIndexLines, DIALECTS } from '../engine.js'

let failures = 0
let checks = 0

function check(label, condition, extra) {
  checks += 1
  if (!condition) {
    failures += 1
    console.error('FAIL  ' + label + (extra === undefined ? '' : '  ::  ' + JSON.stringify(extra)))
  }
}

function hasFinding(report, code) {
  return report.findings.some((finding) => finding.code === code)
}

const SCHEMA = `
-- rows: 1200万
CREATE TABLE t_order (
  id bigint NOT NULL AUTO_INCREMENT COMMENT '订单ID',
  user_id bigint NOT NULL COMMENT '用户ID',
  tenant_id int NOT NULL DEFAULT 0,
  status tinyint NOT NULL DEFAULT 0,
  amount decimal(12,2) NOT NULL,
  create_time datetime NOT NULL COMMENT '创建时间',
  remark varchar(255) DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_status (status),
  KEY idx_create_time (create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
PARTITION BY RANGE (create_time);

-- rows: 80万
CREATE TABLE t_order_item (
  id bigint NOT NULL,
  order_id bigint NOT NULL,
  sku_id bigint NOT NULL,
  qty int NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_item_order FOREIGN KEY (order_id) REFERENCES t_order (id)
);

-- rows: 300万
CREATE TABLE t_user (
  id bigint NOT NULL,
  nickname varchar(64) NOT NULL,
  phone varchar(20) NOT NULL,
  city varchar(32) NOT NULL,
  created_at datetime NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_phone (phone)
);

CREATE INDEX idx_user_city ON t_user (city, created_at);
`

const tables = parseSchema(SCHEMA)
check('解析出 3 张表', tables.length === 3, tables.map((t) => t.name))
const order = tables.find((t) => t.name === 't_order')
check('t_order 行数 1200 万', order.rows === 12000000, order.rows)
check('t_order 主键', order.primaryKey.join(',') === 'id', order.primaryKey)
check('t_order 分区键', order.partitionKeys.join(',') === 'create_time', order.partitionKeys)
check('t_order 索引 3 个（pk/status/create_time）', order.indexes.length === 3, order.indexes.map((i) => i.columns.join('+')))
check('t_order 列数 7', order.columns.length === 7, order.columns.map((c) => c.name))
check('t_order 列注释', order.columns[0].comment === '订单ID', order.columns[0])
const item = tables.find((t) => t.name === 't_order_item')
check('t_order_item 外键', item.foreignKeys.length === 1 && item.foreignKeys[0].refTable === 't_order', item.foreignKeys)
const user = tables.find((t) => t.name === 't_user')
check('t_user 有 idx_user_city', user.indexes.some((i) => i.columns.join(',') === 'city,created_at'), user.indexes)

check('手工索引行解析', parseIndexLines('idx_a(user_id, status)\nunique: phone').length === 2, parseIndexLines('idx_a(user_id, status)\nunique: phone'))

// 反引号 DDL（mysqldump 风格）
const DUMP = '/*!40101 SET NAMES utf8mb4 */;\nDROP TABLE IF EXISTS `t_user`;\nCREATE TABLE `t_user` (\n  `id` bigint NOT NULL,\n  `phone` varchar(20) NOT NULL,\n  `city` varchar(32) DEFAULT NULL,\n  `created_at` datetime NOT NULL,\n  PRIMARY KEY (`id`),\n  UNIQUE KEY `uk_phone` (`phone`),\n  KEY `idx_city` (`city`)\n) ENGINE=InnoDB COMMENT=\'用户表\';\n/*!40000 ALTER TABLE `t_user` ENABLE KEYS */;'
const dumped = parseSchema(DUMP)
check('反引号 DDL 解析出一张表', dumped.length === 1, dumped.map((t) => t.name))
check('反引号 DDL 列数 4', dumped[0] && dumped[0].columns.length === 4, dumped[0] && dumped[0].columns.map((c) => c.name))
check('反引号 DDL 主键', dumped[0] && dumped[0].primaryKey.join(',') === 'id', dumped[0] && dumped[0].primaryKey)
check('反引号 DDL 索引 3 个', dumped[0] && dumped[0].indexes.length === 3, dumped[0] && dumped[0].indexes.map((i) => i.columns.join('+')))
check('反引号 DDL 表注释', dumped[0] && dumped[0].comment === '用户表', dumped[0] && dumped[0].comment)
const dumpReport = analyze({ dialect: 'mysql', schemaText: DUMP, sql: "SELECT id FROM t_user WHERE city = 'x' AND created_at > '2024-01-01'" })
check('反引号表可被 SQL 解析命中', !hasFinding(dumpReport, 'unknownTable'), dumpReport.findings.map((f) => f.code))

function run(label, sql, dialect) {
  const report = analyze({ dialect: dialect || 'mysql', schemaText: SCHEMA, sql })
  return report
}

// 1) 函数包列 + 分区键缺失
const r1 = run('func', `SELECT * FROM t_order WHERE DATE(create_time) = '2024-05-01' AND status = 1`)
check('函数包列被发现', hasFinding(r1, 'funcOnColumn'), r1.findings.map((f) => f.code))
check('重写建议包含日期范围', r1.rewrites.some((r) => r.code === 'rewrite.dateRange'), r1.rewrites)
check('SELECT * 被发现', hasFinding(r1, 'selectStar'), r1.findings.map((f) => f.code))
check('解释步骤非空', r1.explanations[0].steps.length > 3, r1.explanations[0].steps.map((s) => s.code))

// 2) leading wildcard
const r2 = run('like', `SELECT id, amount FROM t_order WHERE remark LIKE '%abc%'`)
check('前导通配符被发现', hasFinding(r2, 'leadingWildcard'), r2.findings.map((f) => f.code))

// 3) 关联列无索引
const r3 = run('join', `SELECT o.id, i.qty FROM t_order o JOIN t_order_item i ON i.order_id = o.id WHERE o.status = 3`)
check('无可用索引 / 建议索引', r3.indexSuggestions.length > 0, r3.indexSuggestions)
check('解释包含 join', r3.explanations[0].steps.some((s) => s.code === 'explain.joins'), r3.explanations[0].steps.map((s) => s.code))

// 4) 深分页
const r4 = run('deep', `SELECT id FROM t_order ORDER BY create_time DESC LIMIT 20 OFFSET 200000`)
check('深分页被发现', hasFinding(r4, 'deepOffset'), r4.findings.map((f) => f.code))
check('keyset 重写建议', r4.rewrites.some((r) => r.code === 'rewrite.keyset'), r4.rewrites)

// 5) UPDATE 无 WHERE
const r5 = run('update', `UPDATE t_user SET city = 'x'`)
check('UPDATE 无 WHERE 被发现', hasFinding(r5, 'noWhere'), r5.findings.map((f) => f.code))
check('kind 为 UPDATE', r5.statements[0].kind === 'UPDATE', r5.statements)

// 6) NOT IN 子查询
const r6 = run('notin', `SELECT id FROM t_user WHERE id NOT IN (SELECT user_id FROM t_order WHERE status = 1)`)
check('NOT IN 被发现', hasFinding(r6, 'notIn'), r6.findings.map((f) => f.code))
check('子查询被发现', r6.explanations[0].steps.some((s) => s.code === 'explain.subquery'), r6.explanations[0].steps.map((s) => s.code))

// 7) 隐式类型转换
const r7 = run('cast', `SELECT id FROM t_user WHERE phone = 13800000000`)
check('隐式转换被发现', hasFinding(r7, 'implicitCast'), r7.findings.map((f) => f.code))

// 8) 左连接被 WHERE 退化
const r8 = run('leftjoin', `SELECT u.id FROM t_user u LEFT JOIN t_order o ON o.user_id = u.id WHERE o.status = 1`)
check('左连接退化被发现', hasFinding(r8, 'leftJoinFiltered'), r8.findings.map((f) => f.code))

// 9) INSERT ... SELECT
const r9 = run('insert', `INSERT INTO t_order_item (id, order_id, sku_id, qty) SELECT id, order_id, sku_id, qty FROM t_order WHERE status = 9`)
check('INSERT 语句类型', r9.statements[0].kind === 'INSERT', r9.statements)
check('INSERT 目标表被识别', r9.statements[0].tables.some((t) => t.toLowerCase().includes('t_order_item')), r9.statements[0].tables)

// 10) 空 SQL
const r10 = analyze({ schemaText: SCHEMA, sql: '   ' })
check('空 SQL 不炸', r10.ok === true && r10.empty === true, r10.empty)

// 11) 未提供表结构
const r11 = analyze({ sql: 'SELECT a, b FROM unknown_table WHERE a = 1' })
check('未知表给出提示', hasFinding(r11, 'unknownTable'), r11.findings.map((f) => f.code))

// 12) 分号与注释
const r12 = analyze({ schemaText: SCHEMA, sql: `-- 注释\nSELECT id FROM t_order WHERE id = 1;\n/* 块注释 */\nSELECT id FROM t_user WHERE phone = '1';` })
check('两条语句', r12.statements.length === 2, r12.statements.length)
check('第二句起始行', r12.statements[1].line === 4, r12.statements[1].line)

// 13) 每种方言都能跑出索引 DDL
const ddlReport = analyze({
  dialect: 'postgresql', schemaText: SCHEMA,
  sql: `SELECT id FROM t_user WHERE city = 'x' AND nickname = 'y'`,
})
check('PG 并发建索引 DDL', (ddlReport.indexSuggestions[0] || {}).ddl?.includes('CONCURRENTLY'), ddlReport.indexSuggestions)

for (const dialect of DIALECTS) {
  const report = analyze({ dialect, schemaText: SCHEMA, sql: `SELECT o.id FROM t_order o JOIN t_order_item i ON i.order_id = o.id WHERE o.create_time > '2024-01-01' AND o.status = 2` })
  check('方言 ' + dialect + ' 不炸', report.ok === true && report.explanations.length === 1, report.statements)
  check('方言 ' + dialect + ' 有执行建议', report.execution[0].hints.length > 0, report.execution[0])
}

// 14) 覆盖索引
const r14 = run('covering', `SELECT status FROM t_order WHERE status = 1`)
check('覆盖索引提示', hasFinding(r14, 'coveringIndex'), r14.findings.map((f) => f.code))

// 15) CTE
const r15 = run('cte', `WITH x AS (SELECT id FROM t_order WHERE status = 1) SELECT * FROM x JOIN t_user u ON u.id = x.id`)
check('CTE 被识别', r15.statements[0].kind === 'SELECT', r15.statements[0].kind)

console.log('')
console.log(`${checks - failures}/${checks} 项检查通过`)
if (failures > 0) {
  console.error(failures + ' 项失败')
  process.exit(1)
}
console.log('引擎自测通过')
