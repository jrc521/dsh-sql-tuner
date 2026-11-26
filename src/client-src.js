// ---------------------------------------------------------------- i18n
const DICT = {
  zh: {
    'panel.title': 'SQL 调优',
    'panel.subtitle': '表结构 + SQL → 解释 · 建议 · 执行优化',

    'dialect.label': '数据库类型',
    'meta.title': '表结构 / 数据字典',
    'meta.hint': '粘贴 CREATE TABLE / CREATE INDEX，或直接写数据字典。行数可写 -- rows: 1200万',
    'meta.placeholder': "-- rows: 1200万\nCREATE TABLE t_order (\n  id bigint NOT NULL,\n  user_id bigint NOT NULL,\n  status tinyint NOT NULL,\n  create_time datetime NOT NULL,\n  PRIMARY KEY (id),\n  KEY idx_status (status)\n) PARTITION BY RANGE (create_time);",
    'meta.tables': '已识别 {n} 张表',
    'meta.empty': '还没有解析到表。粘贴 DDL 后会自动识别主键、外键、分区键与索引。',
    'meta.rows': '行数',
    'meta.rowsPlaceholder': '如 1200万',
    'meta.columns': '列',
    'meta.pk': '主键',
    'meta.fk': '外键',
    'meta.partition': '分区键',
    'meta.index': '索引',
    'meta.extraIndex': '补充索引（一行一个，如 user_id 或 idx_a(a,b)）',
    'meta.moreColumns': '+{n} 列',
    'meta.showColumns': '查看列',
    'meta.hideColumns': '收起',
    'meta.noIndex': '无',

    'sql.title': 'SQL 脚本',
    'sql.placeholder': '在这里编辑、粘贴 SQL，或从文件导入（支持多语句，用分号分隔）',
    'sql.import': '导入文件',
    'sql.paste': '粘贴',
    'sql.clear': '清空',
    'sql.sample': '示例',
    'sql.analyze': '分析',
    'sql.copy': '复制',
    'sql.copied': '已复制',
    'sql.chars': '{n} 字符 · {l} 行',
    'sql.enterHint': 'Ctrl+Enter 分析',
    'sql.confirmSample': '加载示例会覆盖当前的表结构与 SQL，继续？',
    'sql.confirmClear': '清空当前 SQL？表结构会保留。',
    'sql.drop': '松开导入 .sql 文件',
    'sql.imported': '已导入 {name}',
    'sql.pasted': '已粘贴剪贴板内容',
    'sql.copyFailed': '复制失败，请手动选择文本',
    'sql.readError': '读取文件失败：{msg}',
    'sql.pasteDenied': '无法读取剪贴板，请用 Ctrl+V 粘贴',
    'sql.empty': '左侧填写表结构、这里写 SQL，结果会在下方实时刷新。',

    'tab.explain': '解释',
    'tab.advice': '优化建议',
    'tab.exec': '执行优化',
    'result.empty': '还没有可分析的内容',
    'result.none': '这条 SQL 没有命中规则，也没有明显风险。仍建议用 EXPLAIN 复核一次。',
    'result.summary': '高危 {high} · 建议 {warn} · 提示 {info} · 索引 {indexes}',
    'result.statement': '语句 {n}（第 {line} 行）',
    'result.logicalOrder': '逻辑执行顺序',
    'result.access': '预计访问方式',
    'result.analyzedAt': '已分析 {n} 条语句',
    'result.analyzedAtTime': '已分析 {n} 条语句 · {time}',
    'result.done': '已分析 {n} 条语句',
    'result.failed': 'SQL 解析失败',
    'result.failedHint': '请检查语法；如果语句本身合法，可能是方言写法超出了当前的解析范围。',
    'advice.empty': '把过滤条件写具体些，或补上表结构后再看一下。',
    'result.jump': '定位到这一行',

    'f.dropExport': '发给 AI 深入分析',
    'f.copyReport': '复制报告',
    'f.exportReport': '导出报告',
    'f.reportExported': '报告已导出为 Word 文档',
    'f.exportFailed': '导出失败，请重试',
    'f.reportCopied': '报告已复制',
    'f.sentToChat': '提示词已复制，已切到对话面板，粘贴回车即可让 AI 深入分析',
    'f.needSql': '先写一条 SQL 再分析',

    'sev.high': '高危',
    'sev.warn': '建议',
    'sev.info': '提示',

    'acc.indexEq': '索引等值查找',
    'acc.indexRange': '索引范围扫描',
    'acc.scan': '扫描表',
    'acc.scanBig': '全表扫描',
    'acc.rows': '{n} 行',
    'acc.est': '粗估扫描 ~{n} 行',
    'acc.index': '索引 {name}',
    'acc.noIndex': '无索引',
    'acc.table': '表',
    'acc.rowsHead': '行数',
    'acc.estHead': '粗估扫描',
    'acc.indexHead': '使用索引',

    'kind.SELECT': '查询',
    'kind.INSERT': '插入',
    'kind.UPDATE': '更新',
    'kind.DELETE': '删除',
    'kind.MERGE': '合并',
    'kind.UNKNOWN': '未知',

    'd.noUsableIndex': '{table}({columns}) 上没有可用索引，表约 {rows} 行',
    'd.indexPartial': '{table} 已有索引 {index}，但 {columns} 不在其中',
    'd.sortWithoutIndex': '{table} 的排序列 {columns} 用不上索引 {index}',
    'd.fkNoIndex': '{table} 的外键列 {columns} 没有索引（引用 {refTable}）',
    'd.noPartitionFilter': '{table} 是分区表，但条件里没有分区键 {keys}',
    'd.partitionFunction': '{table} 的分区键 {column} 被 {func}() 包裹',
    'd.funcOnColumn': '条件列 {column} 被 {func}() 包裹',
    'd.implicitCast': '列 {column}（{columnType}）与字面量类型不一致',
    'd.deepOffset': 'OFFSET {offset} 会先扫过并丢弃这些行（LIMIT {limit}）',
    'd.unknownTable': '没有 {table} 的列与索引信息',
    'd.cartesian': '{tables} 没有与其它表的连接条件',
    'd.leftJoinFiltered': 'WHERE 里对左连接右表 {table} 加了条件',
    'd.coveringIndex': '{table} 可用索引 {index} 覆盖，无需回表',
    'd.noWhere': '{kind} 语句没有任何过滤条件',
    'd.rowsOnly': '{table} 约 {rows} 行',

    'explain.statement': '语句类型',
    'explain.tables': '涉及的表',
    'explain.joins': '连接方式',
    'explain.select': '输出列',
    'explain.filters': '过滤条件',
    'explain.joinKeys': '连接条件',
    'explain.groupBy': '分组与聚合',
    'explain.aggregateNoGroup': '全局聚合',
    'explain.having': '分组后过滤',
    'explain.distinct': '去重',
    'explain.orderBy': '排序',
    'explain.limit': '分页',
    'explain.window': '窗口函数',
    'explain.subquery': '子查询',
    'explain.union': '集合运算',
    'explain.cte': '公共表达式 CTE',
    'explain.sargable': '可索引',
    'explain.notSargable': '不可索引',

    'exec.indexes': '索引建议',
    'exec.indexesEmpty': '当前条件已有可用索引，无需新建。',
    'exec.rewrites': 'SQL 改写',
    'exec.rewritesEmpty': '没有可以安全自动改写的部分。',
    'exec.checklist': '执行计划检查清单',
    'exec.settings': '会话 / 优化器参数',
    'exec.hints': '可用 Hint',
    'exec.copyDdl': '复制 DDL',
    'exec.copyRewrite': '复制改写',
    'exec.ddl': '建索引语句',
    'exec.replaceHint': '可替代现有索引 {name}',
    'exec.estRows': '表约 {rows} 行',

    'rewrite.dateRange': '函数包列 → 范围条件',
    'rewrite.dateRange.note': '把函数移到常量侧，列保持裸用，索引与分区裁剪才能生效。',
    'rewrite.notExists': 'NOT IN → NOT EXISTS',
    'rewrite.notExists.note': 'NOT EXISTS 不受 NULL 影响，且可做反连接。',
    'rewrite.explicitColumns': 'SELECT * → 显式列',
    'rewrite.explicitColumns.note': '减少无关列读取，避免回表。',
    'rewrite.keyset': '大偏移分页 → 游标分页',
    'rewrite.keyset.note': '按排序键续翻，跳过大偏移的行丢弃成本。',
    'rewrite.unionAll': 'UNION → UNION ALL',
    'rewrite.unionAll.note': '确认两段结果无重复后使用，省掉去重排序。',
    'rewrite.orToUnion': 'OR → UNION ALL',
    'rewrite.orToUnion.note': '跨列 OR 常退化为全表扫描，拆开可分别走索引（最终去重按业务需要）。',

    'plan.check.mysql': '看 type 是否 ALL / index（全扫），key 是否为空，rows 是否远超预期，Extra 里是否出现 Using filesort / Using temporary。',
    'plan.check.pg': '看 Seq Scan / Nested Loop 的行数与实际行数偏差，Sort 是否落盘（external merge），以及 Buffers 命中率。',
    'plan.check.oracle': '看 TABLE ACCESS FULL、是否走对了索引，注意 cardinality 与 cost 是否与预期一致。',
    'plan.check.sqlserver': '看 Table Scan / Index Scan / Key Lookup 的 Actual Rows 与 Estimated Rows 偏差，以及 Sort 运算符的临时库开销。',
    'plan.check.columnar': '看是否发生全表/全分区扫描，分区裁剪是否生效（PartitionFilters），以及是否产生大量小文件。',
    'plan.check.generic': '对比预计行数与实际行数，确认走的是索引扫描而不是全表扫描。',
    'plan.check.topn': '确认 Top-N 排序能否利用索引顺序，避免额外排序算子。',

    'hint.explainJson': '拿到实际执行计划与各步 rows。',
    'hint.mysqlHint': '确认是否发生 Block Nested Loop；必要时关掉。',
    'hint.explainPg': '实际执行 + 缓冲区命中一起看。',
    'hint.pgSeqscan': '关掉顺序扫描验证索引是否可用。',
    'hint.oracleIndex': '强制走索引验证索引收益。',
    'hint.oracleJoin': '指定连接顺序与连接方式。',
    'hint.sqlserverPlan': '先看预估计划，再跑实际计划对比。',
    'hint.sqlserverOption': '规避参数嗅探导致的计划劣化。',
    'hint.columnar': '看分区裁剪与数据倾斜。',
    'hint.explain': '先看预估执行计划。',
    'setting.mysqlMerge': '打开物化派生表合并与批量索引访问。',
    'setting.mysqlBigSort': '大结果集排序时避免落盘。',
    'setting.pgWorkMem': '大排序/哈希连接时需要更大的工作内存。',
    'setting.oracleStats': '统计信息过期会让优化器选错计划。',
    'setting.sqlserverStats': '更新统计信息后重新评估计划。',
    'setting.hivePartition': '动态分区写入时的必需设置。',

    'sample.schema': "-- rows: 1200万\nCREATE TABLE t_order (\n  id bigint NOT NULL AUTO_INCREMENT COMMENT '订单ID',\n  user_id bigint NOT NULL,\n  status tinyint NOT NULL DEFAULT 0,\n  amount decimal(12,2) NOT NULL,\n  create_time datetime NOT NULL,\n  remark varchar(255) DEFAULT NULL,\n  PRIMARY KEY (id),\n  KEY idx_status (status),\n  KEY idx_create_time (create_time)\n) ENGINE=InnoDB PARTITION BY RANGE (create_time);\n\n-- rows: 80万\nCREATE TABLE t_order_item (\n  id bigint NOT NULL,\n  order_id bigint NOT NULL,\n  sku_id bigint NOT NULL,\n  qty int NOT NULL,\n  PRIMARY KEY (id),\n  CONSTRAINT fk_item_order FOREIGN KEY (order_id) REFERENCES t_order (id)\n);\n",
    'sample.sql': "SELECT o.id, o.amount, i.qty\nFROM t_order o\nJOIN t_order_item i ON i.order_id = o.id\nWHERE DATE(o.create_time) >= '2024-05-01'\n  AND o.status = 1\n  AND i.sku_id IN (SELECT id FROM t_order_item WHERE qty > 3)\nORDER BY o.create_time DESC\nLIMIT 20 OFFSET 50000;",

    'f.selectStar.title': '不要用 SELECT *',
    'f.selectStar.why': '结果列不可控，多读无用列；列不全时还需要回表，覆盖索引失效。',
    'f.selectStar.fix': '只列出真正需要的列。',
    'f.noWhere.title': '缺少 WHERE 条件',
    'f.noWhere.why': '对全表逐行加锁修改，事务与锁等待被放大，也容易误伤整张表。',
    'f.noWhere.fix': '先用同样的条件 SELECT 确认行数，再执行；大批量操作分批提交。',
    'f.funcOnColumn.title': '索引列被函数包裹',
    'f.funcOnColumn.why': 'WHERE DATE(col) = ? 会让这一列失去可索引性，只能整列扫描，分区键上更是直接失去裁剪。',
    'f.funcOnColumn.fix': '把条件改写成列的原生范围比较，函数只作用在常量侧。',
    'f.leadingWildcard.title': '前导通配符 LIKE',
    'f.leadingWildcard.why': "LIKE '%x%' 无法走 B+ 树索引，只能全表或全索引扫描。",
    'f.leadingWildcard.fix': '改成前缀匹配 `x%`，或用倒排/全文索引，或把模糊检索放到搜索引擎。',
    'f.implicitCast.title': '隐式类型转换',
    'f.implicitCast.why': '字符串字面量与数字列比较时列会被转换成字符串，索引随之失效。',
    'f.implicitCast.fix': '让字面量类型与列类型一致，数字列不要加引号。',
    'f.orPredicate.title': 'OR 条件',
    'f.orPredicate.why': '同一张表上跨不同列的 OR 除 index merge 外通常只能全表扫描。',
    'f.orPredicate.fix': '拆成两条查询用 UNION ALL 合并。',
    'f.notIn.title': 'NOT IN 子查询',
    'f.notIn.why': '子查询里出现 NULL 时整体结果为 NULL；优化器也难以改写成反连接。',
    'f.notIn.fix': '改成 NOT EXISTS 或 LEFT JOIN ... IS NULL，并保证比较列 NOT NULL。',
    'f.noUsableIndex.title': '缺少可用索引',
    'f.noUsableIndex.why': '条件列上没有可用索引，执行时会退化成全表扫描。',
    'f.noUsableIndex.fix': '按下方 DDL 建复合索引，注意等值列在前、范围列在后。',
    'f.indexPartial.title': '索引没覆盖全部等值条件',
    'f.indexPartial.why': '现有索引只命中部分等值列，剩下的列要回表逐行过滤。',
    'f.indexPartial.fix': '把缺失的等值列并入复合索引前缀。',
    'f.fkNoIndex.title': '外键列没有索引',
    'f.fkNoIndex.why': '父表删改时子表要全表扫描校验，JOIN 也容易退化成全扫。',
    'f.fkNoIndex.fix': '给外键列建普通索引。',
    'f.noPartitionFilter.title': '没有分区裁剪',
    'f.noPartitionFilter.why': '分区表没带分区键条件，会把所有分区都扫一遍。',
    'f.noPartitionFilter.fix': '补上分区键的范围条件。',
    'f.partitionFunction.title': '分区键被函数包裹',
    'f.partitionFunction.why': '分区键上的函数会让裁剪失效，退化为全分区扫描。',
    'f.partitionFunction.fix': '用分区键原始值做范围比较。',
    'f.deepOffset.title': '大偏移分页',
    'f.deepOffset.why': 'LIMIT m, n 需要先扫过并丢弃前 m 行，越翻越慢。',
    'f.deepOffset.fix': '改用游标分页，或先按索引取出主键再回表。',
    'f.sortWithoutIndex.title': '排序用不上索引',
    'f.sortWithoutIndex.why': 'ORDER BY 列与索引顺序不一致，需要额外的排序算子，大结果集还会落盘。',
    'f.sortWithoutIndex.fix': '让索引顺序与 ORDER BY 对齐（等值列 → 排序列）。',
    'f.distinctBig.title': '大表 DISTINCT',
    'f.distinctBig.why': 'DISTINCT 依赖临时表或排序去重，大表代价很高。',
    'f.distinctBig.fix': '用 GROUP BY 明确分组，或改成 EXISTS 半连接。',
    'f.cartesian.title': '疑似笛卡尔积',
    'f.cartesian.why': '有表没有与其它表关联的条件，结果行数是乘积。',
    'f.cartesian.fix': '补齐连接条件；确实要全组合时用 CROSS JOIN 并限制行数。',
    'f.countStar.title': '大表 COUNT(*)',
    'f.countStar.why': '无过滤的计数要扫全表或全索引。',
    'f.countStar.fix': '用最小索引计数，或读统计信息估算。',
    'f.orderWithoutLimit.title': '排序却没有 LIMIT',
    'f.orderWithoutLimit.why': '需要把结果全部排完再返回，内存和网络开销都大。',
    'f.orderWithoutLimit.fix': '加 LIMIT，或用过滤条件缩小结果集。',
    'f.havingToWhere.title': 'HAVING 里放了过滤条件',
    'f.havingToWhere.why': 'HAVING 在分组之后执行，无法减少分组输入。',
    'f.havingToWhere.fix': '非聚合条件移到 WHERE。',
    'f.correlatedSubquery.title': '相关子查询',
    'f.correlatedSubquery.why': '外层每行都要执行一次内层查询，代价随行数线性增长。',
    'f.correlatedSubquery.fix': '改写成 JOIN 或 EXISTS。',
    'f.inSubquery.title': 'IN 子查询',
    'f.inSubquery.why': '优化器未必能改写成半连接，可能逐行探测。',
    'f.inSubquery.fix': '改成 JOIN / EXISTS，或把子查询结果物化。',
    'f.coveringIndex.title': '可以走覆盖索引',
    'f.coveringIndex.why': '查询涉及的列都在索引里，不需要回表。',
    'f.coveringIndex.fix': '保持索引不变，确认执行计划里出现 Using index。',
    'f.rangeBeforeEquality.title': '索引列顺序被范围条件截断',
    'f.rangeBeforeEquality.why': '范围列之后的索引列无法再参与过滤。',
    'f.rangeBeforeEquality.fix': '把等值列排在范围列前面。',
    'f.leftJoinFiltered.title': '外连接被 WHERE 退化成内连接',
    'f.leftJoinFiltered.why': '对右表列加 WHERE 条件会滤掉右表的 NULL 行，LEFT JOIN 语义丢失。',
    'f.leftJoinFiltered.fix': '把条件移到 ON，或明确改成 INNER JOIN。',
    'f.unionDistinct.title': 'UNION 去重',
    'f.unionDistinct.why': 'UNION 默认去重，需要排序或哈希去重。',
    'f.unionDistinct.fix': '确认无重复后用 UNION ALL。',
    'f.unknownTable.title': '缺少表结构',
    'f.unknownTable.why': '没拿到这张表的列与索引，无法判断访问方式。',
    'f.unknownTable.fix': '在左侧「表结构」里补上它。',
    'f.fullScan.title': '大表扫描',
    'f.fullScan.why': '没有可用过滤条件，大表会被整表扫描。',
    'f.fullScan.fix': '补上可索引的过滤条件，或加分区/时间范围约束。',
    'f.unfilteredBigTable.title': '无过滤条件的大表查询',
    'f.unfilteredBigTable.why': '大表没有任何过滤，等于把整张表读出来。',
    'f.unfilteredBigTable.fix': '加上过滤条件或分区键范围。',
  },
  en: {
    'panel.title': 'SQL tuner',
    'panel.subtitle': 'Schema + SQL 閳?explanation 璺?advice 璺?execution tuning',

    'dialect.label': 'Database',
    'meta.title': 'Schema / data dictionary',
    'meta.hint': 'Paste CREATE TABLE / CREATE INDEX, or a plain dictionary. Row counts: -- rows: 12m',
    'meta.placeholder': "-- rows: 12m\nCREATE TABLE t_order (\n  id bigint NOT NULL,\n  user_id bigint NOT NULL,\n  status tinyint NOT NULL,\n  create_time datetime NOT NULL,\n  PRIMARY KEY (id),\n  KEY idx_status (status)\n) PARTITION BY RANGE (create_time);",
    'meta.tables': '{n} tables parsed',
    'meta.empty': 'No table yet. Paste DDL and primary keys, foreign keys, partitions and indexes are detected automatically.',
    'meta.rows': 'Rows',
    'meta.rowsPlaceholder': 'e.g. 12m',
    'meta.columns': 'Columns',
    'meta.pk': 'PK',
    'meta.fk': 'FK',
    'meta.partition': 'Partition key',
    'meta.index': 'Indexes',
    'meta.extraIndex': 'Extra indexes (one per line, e.g. user_id or idx_a(a,b))',
    'meta.moreColumns': '+{n} more',
    'meta.showColumns': 'Columns',
    'meta.hideColumns': 'Hide',
    'meta.noIndex': 'none',

    'sql.title': 'SQL script',
    'sql.placeholder': 'Edit or paste SQL here, or import a file. Multiple statements separated by semicolons.',
    'sql.import': 'Import file',
    'sql.paste': 'Paste',
    'sql.clear': 'Clear',
    'sql.sample': 'Sample',
    'sql.analyze': 'Analyze',
    'sql.copy': 'Copy',
    'sql.copied': 'Copied',
    'sql.chars': '{n} chars 璺?{l} lines',
    'sql.enterHint': 'Ctrl+Enter to analyze',
    'sql.confirmSample': 'Loading the sample replaces the current schema and SQL. Continue?',
    'sql.confirmClear': 'Clear the current SQL? The schema is kept.',
    'sql.drop': 'Drop a .sql file to import',
    'sql.imported': 'Imported {name}',
    'sql.pasted': 'Pasted from clipboard',
    'sql.copyFailed': 'Copy failed 閳?select the text manually',
    'sql.readError': 'Could not read the file: {msg}',
    'sql.pasteDenied': 'Clipboard unavailable, use Ctrl+V',
    'sql.empty': 'Fill in the schema on the left, write SQL here, and results refresh below.',

    'tab.explain': 'Explanation',
    'tab.advice': 'Advice',
    'tab.exec': 'Execution',
    'result.empty': 'Nothing to analyze yet',
    'result.none': 'No rule matched and no obvious risk. Still worth confirming with EXPLAIN.',
    'result.summary': '{high} high 璺?{warn} advice 璺?{info} notes 璺?{indexes} indexes',
    'result.statement': 'Statement {n} (line {line})',
    'result.logicalOrder': 'Logical order',
    'result.access': 'Estimated access',
    'result.analyzedAt': '{n} statements analyzed',
    'result.analyzedAtTime': '{n} statements 璺?{time}',
    'result.done': '{n} statements analyzed',
    'result.failed': 'Could not analyze the SQL',
    'result.failedHint': 'Check the syntax; if the statement is valid, its dialect form may fall outside the supported subset.',
    'advice.empty': 'Add concrete predicates, or fill in the schema and take another look.',
    'result.jump': 'Jump to this line',

    'f.dropExport': 'Send to agent',
    'f.copyReport': 'Copy report',
    'f.exportReport': 'Export report',
    'f.reportExported': 'Report exported as a Word document',
    'f.exportFailed': 'Export failed, please retry',
    'f.reportCopied': 'Report copied',
    'f.sentToChat': 'Prompt copied and chat opened 閳?paste and send for a deeper review',
    'f.needSql': 'Write a SQL statement first',

    'sev.high': 'High',
    'sev.warn': 'Advice',
    'sev.info': 'Note',

    'acc.indexEq': 'Index equality lookup',
    'acc.indexRange': 'Index range scan',
    'acc.scan': 'Table scan',
    'acc.scanBig': 'Full table scan',
    'acc.rows': '{n} rows',
    'acc.est': '閳澖n} rows scanned',
    'acc.index': 'index {name}',
    'acc.noIndex': 'no index',
    'acc.table': 'Table',
    'acc.rowsHead': 'Rows',
    'acc.estHead': 'Est. scan',
    'acc.indexHead': 'Index used',

    'kind.SELECT': 'query',
    'kind.INSERT': 'insert',
    'kind.UPDATE': 'update',
    'kind.DELETE': 'delete',
    'kind.MERGE': 'merge',
    'kind.UNKNOWN': 'unknown',

    'd.noUsableIndex': '{table}({columns}) has no usable index; the table holds about {rows} rows',
    'd.indexPartial': '{table} has {index}, but {columns} is not part of it',
    'd.sortWithoutIndex': 'Sort columns {columns} of {table} cannot use index {index}',
    'd.fkNoIndex': 'Foreign key columns {columns} of {table} are not indexed (references {refTable})',
    'd.noPartitionFilter': '{table} is partitioned but the predicate has no partition key {keys}',
    'd.partitionFunction': 'Partition key {column} of {table} is wrapped in {func}()',
    'd.funcOnColumn': 'Predicate column {column} is wrapped in {func}()',
    'd.implicitCast': 'Column {column} ({columnType}) is compared with a mismatched literal type',
    'd.deepOffset': 'OFFSET {offset} scans and discards that many rows (LIMIT {limit})',
    'd.unknownTable': 'No columns or indexes are known for {table}',
    'd.cartesian': '{tables} has no join predicate with the other tables',
    'd.leftJoinFiltered': 'WHERE filters the right side {table} of a LEFT JOIN',
    'd.coveringIndex': '{table} is covered by index {index}, no row lookup needed',
    'd.noWhere': 'The {kind} statement has no filter at all',
    'd.rowsOnly': '{table} holds about {rows} rows',

    'explain.statement': 'Statement type',
    'explain.tables': 'Tables',
    'explain.joins': 'Joins',
    'explain.select': 'Projection',
    'explain.filters': 'Filters',
    'explain.joinKeys': 'Join keys',
    'explain.groupBy': 'Grouping and aggregates',
    'explain.aggregateNoGroup': 'Global aggregate',
    'explain.having': 'Post-aggregation filter',
    'explain.distinct': 'Distinct',
    'explain.orderBy': 'Ordering',
    'explain.limit': 'Paging',
    'explain.window': 'Window functions',
    'explain.subquery': 'Subqueries',
    'explain.union': 'Set operations',
    'explain.cte': 'Common table expressions',
    'explain.sargable': 'indexable',
    'explain.notSargable': 'not indexable',

    'exec.indexes': 'Index suggestions',
    'exec.indexesEmpty': 'Existing indexes already serve these predicates.',
    'exec.rewrites': 'SQL rewrites',
    'exec.rewritesEmpty': 'Nothing that can be safely rewritten automatically.',
    'exec.checklist': 'Execution plan checklist',
    'exec.settings': 'Session / optimizer settings',
    'exec.hints': 'Hints',
    'exec.copyDdl': 'Copy DDL',
    'exec.copyRewrite': 'Copy rewrite',
    'exec.ddl': 'Index DDL',
    'exec.replaceHint': 'Can replace {name}',
    'exec.estRows': '閳澖rows} rows',

    'rewrite.dateRange': 'Function on column 閳?range',
    'rewrite.dateRange.note': 'Move the function to the constant side so the column stays indexable and pruning works.',
    'rewrite.notExists': 'NOT IN 閳?NOT EXISTS',
    'rewrite.notExists.note': 'NOT EXISTS is NULL-safe and can be planned as an anti-join.',
    'rewrite.explicitColumns': 'SELECT * 閳?explicit columns',
    'rewrite.explicitColumns.note': 'Avoids reading unused columns and keeps covering indexes usable.',
    'rewrite.keyset': 'Deep offset 閳?keyset paging',
    'rewrite.keyset.note': 'Continue from the last sort key instead of discarding rows at a big offset.',
    'rewrite.unionAll': 'UNION 閳?UNION ALL',
    'rewrite.unionAll.note': 'Skips the deduplication sort once you know the legs cannot overlap.',
    'rewrite.orToUnion': 'OR 閳?UNION ALL',
    'rewrite.orToUnion.note': 'Cross-column OR often degrades to a scan; splitting lets each leg use an index.',

    'plan.check.mysql': 'Check type ALL/index (full scan), empty key, rows far above expectations, and Using filesort / Using temporary in Extra.',
    'plan.check.pg': 'Compare estimated and actual rows, look for Sort spilling to disk and low buffer hit rates.',
    'plan.check.oracle': 'Look for TABLE ACCESS FULL, and check cardinality and cost against your expectation.',
    'plan.check.sqlserver': 'Compare estimated vs actual rows for scans and key lookups, and watch sort spills in tempdb.',
    'plan.check.columnar': 'Check whether partition pruning happened (PartitionFilters) and whether the scan touches every partition.',
    'plan.check.generic': 'Compare estimated and actual rows and confirm an index scan rather than a table scan.',
    'plan.check.topn': 'Confirm the Top-N sort uses index order instead of an extra sort operator.',

    'hint.explainJson': 'Get the actual plan and per-step rows.',
    'hint.mysqlHint': 'Check for block nested loop and disable it when harmful.',
    'hint.explainPg': 'Read actual execution together with buffer usage.',
    'hint.pgSeqscan': 'Disable seq scan to prove the index is usable.',
    'hint.oracleIndex': 'Force the index to measure its benefit.',
    'hint.oracleJoin': 'Pin join order and join method.',
    'hint.sqlserverPlan': 'Start from the estimated plan, then compare with the actual one.',
    'hint.sqlserverOption': 'Avoid plan regressions from parameter sniffing.',
    'hint.columnar': 'Check partition pruning and data skew.',
    'hint.explain': 'Start with the estimated plan.',
    'setting.mysqlMerge': 'Enable derived-table merge and batched key access.',
    'setting.mysqlBigSort': 'Keep large sorts in memory.',
    'setting.pgWorkMem': 'Sorts and hash joins need more working memory on large sets.',
    'setting.oracleStats': 'Stale statistics make the optimizer choose the wrong plan.',
    'setting.sqlserverStats': 'Refresh statistics, then re-evaluate the plan.',
    'setting.hivePartition': 'Required for dynamic partition writes.',

    'sample.schema': "-- rows: 12m\nCREATE TABLE t_order (\n  id bigint NOT NULL AUTO_INCREMENT COMMENT 'order id',\n  user_id bigint NOT NULL,\n  status tinyint NOT NULL DEFAULT 0,\n  amount decimal(12,2) NOT NULL,\n  create_time datetime NOT NULL,\n  remark varchar(255) DEFAULT NULL,\n  PRIMARY KEY (id),\n  KEY idx_status (status),\n  KEY idx_create_time (create_time)\n) ENGINE=InnoDB PARTITION BY RANGE (create_time);\n\n-- rows: 800k\nCREATE TABLE t_order_item (\n  id bigint NOT NULL,\n  order_id bigint NOT NULL,\n  sku_id bigint NOT NULL,\n  qty int NOT NULL,\n  PRIMARY KEY (id),\n  CONSTRAINT fk_item_order FOREIGN KEY (order_id) REFERENCES t_order (id)\n);\n",
    'sample.sql': "SELECT o.id, o.amount, i.qty\nFROM t_order o\nJOIN t_order_item i ON i.order_id = o.id\nWHERE DATE(o.create_time) >= '2024-05-01'\n  AND o.status = 1\n  AND i.sku_id IN (SELECT id FROM t_order_item WHERE qty > 3)\nORDER BY o.create_time DESC\nLIMIT 20 OFFSET 50000;",

    'f.selectStar.title': 'Avoid SELECT *',
    'f.selectStar.why': 'The projection is uncontrolled, reads unused columns, and blocks covering indexes.',
    'f.selectStar.fix': 'List only the columns you need.',
    'f.noWhere.title': 'Missing WHERE',
    'f.noWhere.why': 'Locks and rewrites every row, amplifying transactions and lock waits, and easily hits the whole table.',
    'f.noWhere.fix': 'SELECT with the same predicate to count rows first, then run in batches.',
    'f.funcOnColumn.title': 'Indexed column wrapped in a function',
    'f.funcOnColumn.why': 'WHERE DATE(col) = ? makes the column unindexable and, on a partition key, disables pruning.',
    'f.funcOnColumn.fix': 'Rewrite as a native range comparison and keep functions on the constant side.',
    'f.leadingWildcard.title': 'Leading-wildcard LIKE',
    'f.leadingWildcard.why': "LIKE '%x%' cannot use a B-tree index and scans the table or the whole index.",
    'f.leadingWildcard.fix': 'Use a prefix match `x%`, a full-text/inverted index, or a search engine.',
    'f.implicitCast.title': 'Implicit type conversion',
    'f.implicitCast.why': 'Comparing a numeric column with a string literal converts the column and drops the index.',
    'f.implicitCast.fix': 'Match literal type to column type 閳?no quotes on numeric columns.',
    'f.orPredicate.title': 'OR predicate',
    'f.orPredicate.why': 'OR across different columns of one table usually means a full scan unless index merge applies.',
    'f.orPredicate.fix': 'Split into two queries and UNION ALL them.',
    'f.notIn.title': 'NOT IN subquery',
    'f.notIn.why': 'A NULL inside the subquery makes the whole predicate unknown, and anti-join rewrites are blocked.',
    'f.notIn.fix': 'Use NOT EXISTS or LEFT JOIN ... IS NULL with NOT NULL columns.',
    'f.noUsableIndex.title': 'No usable index',
    'f.noUsableIndex.why': 'No index serves these predicates, so the plan degrades to a full table scan.',
    'f.noUsableIndex.fix': 'Create the composite index below: equality columns first, range columns last.',
    'f.indexPartial.title': 'Index misses some equality columns',
    'f.indexPartial.why': 'The index only covers part of the equality predicates, so the rest is filtered after a row lookup.',
    'f.indexPartial.fix': 'Extend the composite index prefix with the missing equality columns.',
    'f.fkNoIndex.title': 'Foreign key column is not indexed',
    'f.fkNoIndex.why': 'Parent deletes and updates scan the child table, and joins degrade to scans.',
    'f.fkNoIndex.fix': 'Add a plain index on the foreign key columns.',
    'f.noPartitionFilter.title': 'No partition pruning',
    'f.noPartitionFilter.why': 'The partitioned table is queried without a partition key predicate, so every partition is scanned.',
    'f.noPartitionFilter.fix': 'Add a range predicate on the partition key.',
    'f.partitionFunction.title': 'Partition key wrapped in a function',
    'f.partitionFunction.why': 'A function on the partition key disables pruning and scans all partitions.',
    'f.partitionFunction.fix': 'Compare the raw partition key with a range.',
    'f.deepOffset.title': 'Large offset paging',
    'f.deepOffset.why': 'LIMIT m, n scans and discards the first m rows, so later pages get slower.',
    'f.deepOffset.fix': 'Switch to keyset paging, or fetch primary keys by index first.',
    'f.sortWithoutIndex.title': 'Sort cannot use an index',
    'f.sortWithoutIndex.why': 'The ORDER BY order does not match any index, so an extra sort operator runs and spills on large sets.',
    'f.sortWithoutIndex.fix': 'Align the index order with ORDER BY (equality columns, then sort columns).',
    'f.distinctBig.title': 'DISTINCT on a large table',
    'f.distinctBig.why': 'DISTINCT needs a temp table or a sort to deduplicate, which is expensive at scale.',
    'f.distinctBig.fix': 'Use GROUP BY with explicit keys, or rewrite as an EXISTS semi-join.',
    'f.cartesian.title': 'Possible cartesian product',
    'f.cartesian.why': 'A table has no join predicate linking it to the others, so the row count is a product.',
    'f.cartesian.fix': 'Add the join predicate, or use an explicit CROSS JOIN with a row limit.',
    'f.countStar.title': 'COUNT(*) on a large table',
    'f.countStar.why': 'An unfiltered count scans the table or its smallest index.',
    'f.countStar.fix': 'Count through the smallest index, or read an estimate from statistics.',
    'f.orderWithoutLimit.title': 'ORDER BY without LIMIT',
    'f.orderWithoutLimit.why': 'The full result must be sorted before returning it, costing memory and bandwidth.',
    'f.orderWithoutLimit.fix': 'Add LIMIT, or narrow the result with filters.',
    'f.havingToWhere.title': 'Filter inside HAVING',
    'f.havingToWhere.why': 'HAVING runs after grouping, so it cannot reduce the grouped input.',
    'f.havingToWhere.fix': 'Move non-aggregate predicates to WHERE.',
    'f.correlatedSubquery.title': 'Correlated subquery',
    'f.correlatedSubquery.why': 'The inner query runs once per outer row, so cost grows linearly.',
    'f.correlatedSubquery.fix': 'Rewrite as a JOIN or EXISTS.',
    'f.inSubquery.title': 'IN subquery',
    'f.inSubquery.why': 'The optimizer may not turn it into a semi-join and probe row by row.',
    'f.inSubquery.fix': 'Use JOIN / EXISTS, or materialize the subquery result.',
    'f.coveringIndex.title': 'Covering index available',
    'f.coveringIndex.why': 'Every referenced column is in the index, so no row lookup is needed.',
    'f.coveringIndex.fix': 'Keep the index and confirm Using index in the plan.',
    'f.rangeBeforeEquality.title': 'Range predicate truncates the index prefix',
    'f.rangeBeforeEquality.why': 'Index columns after a range column can no longer filter.',
    'f.rangeBeforeEquality.fix': 'Put equality columns before range columns.',
    'f.leftJoinFiltered.title': 'Outer join degraded by WHERE',
    'f.leftJoinFiltered.why': 'A WHERE predicate on the right table removes its NULL rows, so LEFT JOIN behaves like INNER.',
    'f.leftJoinFiltered.fix': 'Move the predicate into ON, or make the join INNER explicitly.',
    'f.unionDistinct.title': 'UNION deduplicates',
    'f.unionDistinct.why': 'UNION deduplicates by default, which needs a sort or hash.',
    'f.unionDistinct.fix': 'Use UNION ALL when the legs cannot overlap.',
    'f.unknownTable.title': 'Schema missing',
    'f.unknownTable.why': 'No columns or indexes are known for this table, so access method cannot be judged.',
    'f.unknownTable.fix': 'Add it to the schema pane.',
    'f.fullScan.title': 'Large table scan',
    'f.fullScan.why': 'There is no usable filter predicate, so the large table is scanned.',
    'f.fullScan.fix': 'Add an indexable predicate, or constrain by partition or time range.',
    'f.unfilteredBigTable.title': 'Large table with no filter',
    'f.unfilteredBigTable.why': 'The query reads an entire large table.',
    'f.unfilteredBigTable.fix': 'Add filters or a partition key range.',
  },
}

function detectLanguage(ctx) {
  try {
    const locale = ctx.get('locale')
    const snapshot = locale && typeof locale.getLocale === 'function' ? locale.getLocale() : null
    const active = snapshot && snapshot.active
    if (typeof active === 'string' && active !== '') return active.toLowerCase().indexOf('en') === 0 ? 'en' : 'zh'
  } catch (error) {
    void error
  }
  const docLang = typeof document !== 'undefined' ? document.documentElement.lang : ''
  return /^en/i.test(docLang || '') ? 'en' : 'zh'
}

function makeT(ctx) {
  return function translate(key, params) {
    const language = detectLanguage(ctx)
    const table = DICT[language] || DICT.zh
    let text = table[key]
    if (text === undefined) text = DICT.zh[key]
    if (text === undefined) return key
    if (params) {
      for (const name of Object.keys(params)) text = text.split('{' + name + '}').join(String(params[name]))
    }
    return text
  }
}

// ---------------------------------------------------------------- helpers
const STORAGE_KEY = 'dsh-sql-tuner.v1'
const MONO = 'var(--dsw-font-mono, ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace)'
const ON_COLOR = 'var(--dsw-alias-label-on-color, #ffffff)'

function loadState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch (error) {
    void error
    return {}
  }
}

function saveState(patch) {
  try {
    const next = Object.assign(loadState(), patch)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch (error) {
    void error
  }
}

function stampNow() {
  try {
    const now = new Date()
    const pad = (value) => String(value).padStart(2, '0')
    return pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds())
  } catch (error) {
    void error
    return ''
  }
}

function formatRows(value, language) {
  if (value === null || value === undefined || value === '' || Number.isNaN(Number(value))) return '—'
  const rows = Number(value)
  if (language === 'en') {
    if (rows >= 1e9) return (rows / 1e9).toFixed(rows % 1e9 === 0 ? 0 : 1) + 'B'
    if (rows >= 1e6) return (rows / 1e6).toFixed(rows % 1e6 === 0 ? 0 : 1) + 'M'
    if (rows >= 1e3) return (rows / 1e3).toFixed(rows % 1e3 === 0 ? 0 : 1) + 'K'
    return String(rows)
  }
  if (rows >= 1e8) return (rows / 1e8).toFixed(rows % 1e8 === 0 ? 0 : 2).replace(/\.00$/, '') + '亿'
  if (rows >= 1e4) return (rows / 1e4).toFixed(rows % 1e4 === 0 ? 0 : 1).replace(/\.0$/, '') + '万'
  return String(rows)
}

function findingDetail(t, language, finding) {
  const params = finding.params || {}
  switch (finding.code) {
    case 'noUsableIndex':
      return t('d.noUsableIndex', { table: params.table, columns: (params.columns || []).join(', '), rows: formatRows(params.rows, language) })
    case 'indexPartial':
      return t('d.indexPartial', { table: params.table, index: params.index, columns: (params.columns || []).join(', ') })
    case 'sortWithoutIndex':
      return t('d.sortWithoutIndex', { table: params.table, columns: (params.columns || []).join(', '), index: params.index })
    case 'fkNoIndex':
      return t('d.fkNoIndex', { table: params.table, columns: (params.columns || []).join(', '), refTable: params.refTable })
    case 'noPartitionFilter':
      return t('d.noPartitionFilter', { table: params.table, keys: (params.keys || []).join(', ') })
    case 'partitionFunction':
      return t('d.partitionFunction', { table: params.table, column: params.column, func: params.func })
    case 'funcOnColumn':
      return t('d.funcOnColumn', { func: params.func, column: params.column })
    case 'implicitCast':
      return t('d.implicitCast', { column: params.column, columnType: params.columnType })
    case 'deepOffset':
      return t('d.deepOffset', { offset: params.offset, limit: params.limit })
    case 'unknownTable':
      return t('d.unknownTable', { table: params.table })
    case 'cartesian':
      return t('d.cartesian', { tables: (params.tables || []).join(', ') })
    case 'leftJoinFiltered':
      return t('d.leftJoinFiltered', { table: params.table })
    case 'coveringIndex':
      return t('d.coveringIndex', { table: params.table, index: params.index })
    case 'noWhere':
      return t('d.noWhere', { kind: params.kind })
    case 'fullScan':
    case 'unfilteredBigTable':
      return t('d.rowsOnly', { table: params.table, rows: formatRows(params.rows, language) })
    default:
      return params.raw || ''
  }
}

// ---------------------------------------------------------------- styles
const CSS = `
.sqlt-root { display:flex; flex-direction:column; height:100%; min-height:0; overflow:hidden;
  background:var(--dsw-alias-bg-base); color:var(--dsw-alias-label-primary);
  font-size:13px; line-height:1.5; }
.sqlt-head { flex:0 0 auto; display:flex; align-items:center; gap:10px; flex-wrap:wrap;
  padding:10px 16px; border-bottom:1px solid var(--dsw-alias-border-l1); }
.sqlt-head-main { display:flex; flex-direction:column; min-width:0; margin-right:4px; }
.sqlt-title { font-size:14px; font-weight:600; letter-spacing:.2px; }
.sqlt-sub { font-size:11.5px; color:var(--dsw-alias-label-secondary); }
.sqlt-spacer { flex:1 1 auto; }
.sqlt-seg { display:flex; align-items:center; gap:6px; font-size:12px; color:var(--dsw-alias-label-secondary); }
.sqlt-body { flex:1 1 auto; min-height:0; display:grid; gap:12px; padding:12px 16px 16px;
  grid-template-columns: minmax(260px, 330px) minmax(0, 1fr); }
.sqlt-col { display:flex; flex-direction:column; gap:12px; min-height:0; }
.sqlt-card { display:flex; flex-direction:column; min-height:0; overflow:hidden;
  background:var(--dsw-alias-bg-layer-1); border:1px solid var(--dsw-alias-border-l1); border-radius:10px; }
.sqlt-card-h { flex:0 0 auto; display:flex; align-items:center; gap:8px; padding:8px 10px;
  border-bottom:1px solid var(--dsw-alias-border-l1); font-size:12px; color:var(--dsw-alias-label-secondary); }
.sqlt-card-h .sqlt-name { color:var(--dsw-alias-label-primary); font-weight:600; font-size:12.5px; }
.sqlt-card-b { display:flex; flex-direction:column; min-height:0; flex:1 1 auto; }
.sqlt-hint { padding:0 10px 8px; font-size:11.5px; color:var(--dsw-alias-label-secondary); }
.sqlt-ta { flex:1 1 auto; min-height:0; width:100%; box-sizing:border-box; border:0; outline:0; resize:none;
  background:transparent; color:inherit; font-family:${MONO}; font-size:12.5px; line-height:1.65;
  padding:8px 10px; tab-size:2; white-space:pre; overflow:auto; }
.sqlt-ta-schema { resize:vertical; }
.sqlt-ta::placeholder { color:var(--dsw-alias-state-idle-primary); }
.sqlt-foot { flex:0 0 auto; display:flex; align-items:center; gap:8px; padding:6px 10px;
  border-top:1px solid var(--dsw-alias-border-l1); font-size:11.5px; color:var(--dsw-alias-label-secondary); }
.sqlt-btn { flex:0 0 auto; display:inline-flex; align-items:center; gap:5px; height:26px; padding:0 9px;
  border-radius:7px; border:1px solid var(--dsw-alias-border-l1); background:var(--dsw-alias-bg-layer-1);
  color:var(--dsw-alias-label-primary); font-size:12px; cursor:pointer; white-space:nowrap; }
.sqlt-btn:hover { background:var(--dsw-alias-bg-layer-2); }
.sqlt-btn:active { transform:translateY(.5px); }
.sqlt-btn-primary { background:var(--dsw-alias-brand-primary); border-color:transparent; color:${ON_COLOR}; font-weight:600; }
.sqlt-btn-primary:hover { filter:brightness(1.06); background:var(--dsw-alias-brand-primary); }
.sqlt-btn-ghost { background:transparent; border-color:transparent; color:var(--dsw-alias-label-secondary); }
.sqlt-btn-ghost:hover { color:var(--dsw-alias-label-primary); background:var(--dsw-alias-bg-layer-2); }
.sqlt-select { height:26px; border-radius:7px; border:1px solid var(--dsw-alias-border-l1);
  background:var(--dsw-alias-bg-layer-1); color:var(--dsw-alias-label-primary); font-size:12px; padding:0 6px; }
.sqlt-list { overflow:auto; min-height:0; padding:8px; display:flex; flex-direction:column; gap:8px; align-items:stretch; }
.sqlt-table { flex:0 0 auto; border:1px solid var(--dsw-alias-border-l1); border-radius:8px; background:var(--dsw-alias-bg-layer-2); }
.sqlt-table-h { display:flex; align-items:center; gap:6px; padding:6px 8px; }
.sqlt-table-n { font-family:${MONO}; font-size:12px; font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.sqlt-rows { display:flex; align-items:center; gap:4px; margin-left:auto; font-size:11px; color:var(--dsw-alias-label-secondary); }
.sqlt-rows input { width:64px; height:22px; box-sizing:border-box; border-radius:6px; font-size:11.5px;
  border:1px solid var(--dsw-alias-border-l1); background:var(--dsw-alias-bg-layer-1); color:inherit; padding:0 5px; }
.sqlt-meta-row { display:flex; gap:6px; padding:0 8px 6px; flex-wrap:wrap; font-size:11px; align-items:center; }
.sqlt-chip { display:inline-flex; align-items:center; gap:3px; padding:1px 6px; border-radius:999px;
  background:var(--dsw-alias-bg-layer-1); border:1px solid var(--dsw-alias-border-l1);
  color:var(--dsw-alias-label-secondary); font-family:${MONO}; font-size:10.5px; }
.sqlt-chip b { color:var(--dsw-alias-label-primary); font-weight:600; }
.sqlt-chip-warn { border-color:var(--dsw-alias-state-warn-primary); color:var(--dsw-alias-state-warn-primary); }
.sqlt-cols { padding:0 8px 8px; display:flex; flex-wrap:wrap; gap:4px; }
.sqlt-colchip { font-family:${MONO}; font-size:10.5px; padding:1px 5px; border-radius:5px;
  background:var(--dsw-alias-bg-layer-1); border:1px solid var(--dsw-alias-border-l1); color:var(--dsw-alias-label-secondary); }
.sqlt-colchip i { font-style:normal; color:var(--dsw-alias-label-primary); }
.sqlt-extra { width:100%; box-sizing:border-box; min-height:26px; resize:vertical; border-radius:6px;
  border:1px solid var(--dsw-alias-border-l1); background:var(--dsw-alias-bg-layer-1); color:inherit;
  font-family:${MONO}; font-size:11px; padding:4px 6px; }
.sqlt-tabs { flex:0 0 auto; display:flex; align-items:center; gap:2px; padding:6px 8px 0;
  border-bottom:1px solid var(--dsw-alias-border-l1); }
.sqlt-tab { display:inline-flex; align-items:center; gap:5px; height:28px; padding:0 10px; border:0;
  background:transparent; color:var(--dsw-alias-label-secondary); font-size:12.5px; cursor:pointer;
  border-bottom:2px solid transparent; border-radius:6px 6px 0 0; }
.sqlt-tab:hover { color:var(--dsw-alias-label-primary); background:var(--dsw-alias-bg-layer-2); }
.sqlt-tab-on { color:var(--dsw-alias-label-primary); font-weight:600; border-bottom-color:var(--dsw-alias-brand-primary); }
.sqlt-count { min-width:16px; height:16px; padding:0 4px; border-radius:999px; font-size:10.5px;
  display:inline-flex; align-items:center; justify-content:center;
  background:var(--dsw-alias-bg-layer-2); border:1px solid var(--dsw-alias-border-l1); }
.sqlt-count-high { background:var(--dsw-alias-state-error-primary); border-color:transparent; color:${ON_COLOR}; }
.sqlt-count-warn { background:var(--dsw-alias-state-warn-primary); border-color:transparent; color:${ON_COLOR}; }
.sqlt-res { flex:1 1 auto; min-height:0; overflow:auto; padding:10px 12px 16px; display:flex; flex-direction:column; gap:10px; }
.sqlt-summary { display:flex; align-items:center; gap:8px; flex-wrap:wrap; font-size:11.5px;
  color:var(--dsw-alias-label-secondary); }
.sqlt-empty { margin:auto; max-width:420px; text-align:center; color:var(--dsw-alias-label-secondary); font-size:12.5px; padding:24px; }
.sqlt-empty b { display:block; color:var(--dsw-alias-label-primary); font-size:13px; margin-bottom:6px; }
.sqlt-sec { flex:0 0 auto; border:1px solid var(--dsw-alias-border-l1); border-radius:9px; background:var(--dsw-alias-bg-layer-2); overflow:hidden; }
.sqlt-sec-h { display:flex; align-items:center; gap:8px; padding:7px 10px; font-size:12px; font-weight:600;
  border-bottom:1px solid var(--dsw-alias-border-l1); }
.sqlt-sec-b { padding:8px 10px; display:flex; flex-direction:column; gap:8px; }
.sqlt-step { display:grid; grid-template-columns:132px minmax(0,1fr); gap:10px; font-size:12px; align-items:start; }
.sqlt-step-k { color:var(--dsw-alias-label-secondary); }
.sqlt-step-v { font-family:${MONO}; font-size:11.5px; word-break:break-word; }
.sqlt-step-v em { font-style:normal; color:var(--dsw-alias-label-secondary); font-family:inherit; }
.sqlt-flag { display:inline-block; margin-left:6px; padding:0 5px; border-radius:4px; font-size:10px;
  border:1px solid var(--dsw-alias-border-l1); color:var(--dsw-alias-label-secondary); }
.sqlt-flag-ok { color:var(--dsw-alias-state-success-primary); border-color:var(--dsw-alias-state-success-primary); }
.sqlt-flag-bad { color:var(--dsw-alias-state-warn-primary); border-color:var(--dsw-alias-state-warn-primary); }
.sqlt-finding { flex:0 0 auto; border:1px solid var(--dsw-alias-border-l1); border-radius:9px; overflow:hidden;
  background:var(--dsw-alias-bg-layer-2); }
.sqlt-finding-h { display:flex; align-items:center; gap:7px; padding:7px 10px; font-size:12.5px; font-weight:600; }
.sqlt-dot { width:7px; height:7px; border-radius:50%; flex:0 0 auto; }
.sqlt-dot-high { background:var(--dsw-alias-state-error-primary); }
.sqlt-dot-warn { background:var(--dsw-alias-state-warn-primary); }
.sqlt-dot-info { background:var(--dsw-alias-label-secondary); }
.sqlt-badge { margin-left:auto; font-size:10.5px; font-weight:500; padding:0 6px; border-radius:999px;
  border:1px solid var(--dsw-alias-border-l1); color:var(--dsw-alias-label-secondary); }
.sqlt-badge-btn { cursor:pointer; background:transparent; font-family:inherit; line-height:16px; }
.sqlt-badge-btn:hover { color:var(--dsw-alias-brand-primary); border-color:var(--dsw-alias-brand-primary); }
.sqlt-kbd { font-family:${MONO}; font-size:10.5px; color:var(--dsw-alias-state-idle-primary); }
.sqlt-finding-b { padding:0 10px 9px; display:flex; flex-direction:column; gap:5px; font-size:12px;
  color:var(--dsw-alias-label-secondary); }
.sqlt-detail { font-family:${MONO}; font-size:11.5px; color:var(--dsw-alias-label-primary); word-break:break-word; }
.sqlt-why { line-height:1.55; }
.sqlt-fix { color:var(--dsw-alias-label-primary); }
.sqlt-fix::before { content:'→ '; color:var(--dsw-alias-state-success-primary); }
.sqlt-code { flex:0 0 auto; position:relative; border-radius:8px; background:var(--dsw-alias-bg-base);
  border:1px solid var(--dsw-alias-border-l1); }
.sqlt-code pre { margin:0; padding:8px 10px; font-family:${MONO}; font-size:11.5px; line-height:1.6;
  white-space:pre-wrap; word-break:break-word; overflow:auto; max-height:220px; }
.sqlt-code-h { display:flex; align-items:center; gap:8px; padding:5px 8px 0; font-size:11px;
  color:var(--dsw-alias-label-secondary); }
.sqlt-kv { display:flex; align-items:baseline; gap:8px; font-size:11.5px; }
.sqlt-kv b { font-weight:600; color:var(--dsw-alias-label-primary); font-family:${MONO}; }
.sqlt-kv span { color:var(--dsw-alias-label-secondary); }
.sqlt-kv .sqlt-btn { margin-left:auto; }
.sqlt-acc-row { display:grid; grid-template-columns:minmax(90px,1.2fr) repeat(3,minmax(0,1fr)); gap:6px;
  font-size:11.5px; padding:4px 0; border-bottom:1px dashed var(--dsw-alias-border-l1); align-items:baseline; }
.sqlt-acc-row:last-child { border-bottom:0; }
.sqlt-acc-h { color:var(--dsw-alias-label-secondary); font-size:10.5px; text-transform:uppercase; letter-spacing:.4px; }
.sqlt-acc-t { font-family:${MONO}; font-size:11.5px; overflow:hidden; text-overflow:ellipsis; }
.sqlt-toast { position:fixed; left:50%; bottom:44px; transform:translateX(-50%); z-index:40;
  padding:7px 14px; border-radius:999px; font-size:12px; color:${ON_COLOR}; background:rgba(24,26,30,.92);
  box-shadow:0 6px 18px rgba(0,0,0,.28); pointer-events:none; }
.sqlt-drop { position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
  background:color-mix(in srgb, var(--dsw-alias-brand-primary) 12%, transparent);
  border:2px dashed var(--dsw-alias-brand-primary); border-radius:10px; font-size:12.5px;
  color:var(--dsw-alias-brand-primary); pointer-events:none; }
.sqlt-rel { position:relative; display:flex; flex-direction:column; min-height:0; flex:1 1 auto; }
.sqlt-btn:focus-visible, .sqlt-tab:focus-visible, .sqlt-select:focus-visible,
.sqlt-badge-btn:focus-visible, .sqlt-rows input:focus-visible, .sqlt-extra:focus-visible {
  outline:none; box-shadow:0 0 0 2px var(--dsw-focus-ring-color, var(--dsw-alias-brand-primary)); }
.sqlt-ta:focus-visible { outline:none; box-shadow:inset 0 0 0 2px var(--dsw-focus-ring-color, var(--dsw-alias-brand-primary)); }
.sqlt-colchip-more { border-style:dashed; cursor:help; }
@media (max-width: 900px) {
  .sqlt-body { grid-template-columns: minmax(0, 1fr); overflow:auto; }
  .sqlt-step { grid-template-columns:minmax(0,1fr); gap:2px; }
  .sqlt-card { min-height:220px; }
  .sqlt-ta { min-height:140px; }
}
`

// ---------------------------------------------------------------- components
function SqlTunerApp(props) {
  const { ctx, t } = props
  const h = React.createElement
  const initial = React.useMemo(() => loadState(), [])
  const [dialect, setDialect] = React.useState(initial.dialect || 'mysql')
  const [schemaText, setSchemaText] = React.useState(typeof initial.schemaText === 'string' ? initial.schemaText : '')
  const [sql, setSql] = React.useState(typeof initial.sql === 'string' ? initial.sql : '')
  const [rowsMap, setRowsMap] = React.useState(initial.rowsMap && typeof initial.rowsMap === 'object' ? initial.rowsMap : {})
  const [indexMap, setIndexMap] = React.useState(initial.indexMap && typeof initial.indexMap === 'object' ? initial.indexMap : {})
  const [report, setReport] = React.useState(null)
  const [tab, setTab] = React.useState(initial.tab || 'explain')
  const [lastRun, setLastRun] = React.useState('')
  const [toast, setToast] = React.useState('')
  const [dragging, setDragging] = React.useState(false)
  const [language, setLanguage] = React.useState(detectLanguage(ctx))
  const fileRef = React.useRef(null)
  const editorRef = React.useRef(null)
  const toastTimer = React.useRef(0)

  React.useEffect(() => {
    let dispose = null
    try {
      const locale = ctx.get('locale')
      if (locale && typeof locale.subscribe === 'function') {
        dispose = locale.subscribe(() => setLanguage(detectLanguage(ctx)))
      }
    } catch (error) {
      void error
    }
    return () => {
      if (typeof dispose === 'function') dispose()
    }
  }, [ctx])

  const flash = React.useCallback((message) => {
    setToast(message)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(''), 2200)
  }, [])

  React.useEffect(() => () => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
  }, [])

  const parsedTables = React.useMemo(() => {
    try {
      return parseSchema(schemaText)
    } catch (error) {
      void error
      return []
    }
  }, [schemaText])

  const tableInputs = React.useMemo(() => parsedTables.map((table) => ({
    name: table.name,
    rows: rowsMap[table.name] !== undefined && rowsMap[table.name] !== '' ? rowsMap[table.name] : table.rows,
    indexes: indexMap[table.name] ? parseIndexLines(indexMap[table.name]) : [],
  })), [parsedTables, rowsMap, indexMap])

  React.useEffect(() => {
    if (sql.trim() === '') {
      setReport(null)
      return undefined
    }
    const timer = window.setTimeout(() => {
      try {
        const next = analyze({ dialect, sql, schemaText, tables: tableInputs })
        setReport(next)
        setLastRun(stampNow())
      } catch (error) {
        setReport({ ok: false, error: error instanceof Error ? error.message : String(error), findings: [], statements: [], explanations: [], execution: [], indexSuggestions: [], rewrites: [], summary: {} })
      }
    }, 260)
    return () => window.clearTimeout(timer)
  }, [dialect, sql, schemaText, tableInputs])

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      saveState({ dialect, schemaText, sql, rowsMap, indexMap, tab })
    }, 400)
    return () => window.clearTimeout(timer)
  }, [dialect, schemaText, sql, rowsMap, indexMap, tab])

  const runNow = () => {
    if (sql.trim() === '') {
      flash(t('f.needSql'))
      return
    }
    try {
      const next = analyze({ dialect, sql, schemaText, tables: tableInputs })
      setReport(next)
      setLastRun(stampNow())
      const count = next && next.statements ? next.statements.length : 0
      flash(t('result.done', { n: count }))
    } catch (error) {
      flash(error instanceof Error ? error.message : String(error))
    }
  }

  const readFile = (file) => {
    if (!file) return
    const reader = new window.FileReader()
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : ''
      setSql(text)
      flash(t('sql.imported', { name: file.name }))
    }
    reader.onerror = () => {
      const message = reader.error && reader.error.message ? reader.error.message : file.name
      flash(t('sql.readError', { msg: message }))
    }
    reader.readAsText(file, 'utf-8')
  }

  const confirmDiscard = (message) => {
    if (sql.trim() === '' && schemaText.trim() === '') return true
    if (typeof window.confirm !== 'function') return true
    try {
      return window.confirm(message)
    } catch (error) {
      void error
      return true
    }
  }

  const copyText = (text, message) => {
    const done = () => flash(message)
    const fails = () => {
      if (copyBySelection(text)) {
        done()
        return
      }
      flash(t('sql.copyFailed'))
    }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, fails)
        return
      }
    } catch (error) {
      void error
    }
    fails()
  }

/** 剪贴板 API 不可用时的兜底：临时 textarea + execCommand。 */
  const copyBySelection = (text) => {
    try {
      if (typeof document.execCommand !== 'function') return false
      const node = document.createElement('textarea')
      node.value = text
      node.setAttribute('readonly', '')
      node.style.position = 'fixed'
      node.style.left = '-9999px'
      document.body.appendChild(node)
      node.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(node)
      return ok
    } catch (error) {
      void error
      return false
    }
  }

  const pasteFromClipboard = () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        navigator.clipboard.readText().then((text) => {
          if (text) {
            setSql(text)
            flash(t('sql.pasted'))
          }
        }, () => flash(t('sql.pasteDenied')))
        return
      }
    } catch (error) {
      void error
    }
    flash(t('sql.pasteDenied'))
  }

  const loadSample = () => {
    if (!confirmDiscard(t('sql.confirmSample'))) return
    setSchemaText(t('sample.schema'))
    setSql(t('sample.sql'))
    setRowsMap({})
    setIndexMap({})
  }

  const clearAll = () => {
    if (!confirmDiscard(t('sql.confirmClear'))) return
    setSql('')
    setReport(null)
  }

  const focusLine = (line) => {
    const node = editorRef.current
    if (!node || !line) return
    const lines = sql.split(/\r?\n/)
    let start = 0
    for (let i = 0; i < line - 1 && i < lines.length; i += 1) start += lines[i].length + 1
    const end = start + (lines[line - 1] || '').length
    try {
      node.focus()
      node.setSelectionRange(start, end)
    } catch (error) {
      void error
    }
  }

  const reportMarkdown = () => buildMarkdown(t, language, { dialect, sql, schemaText, report })

  const exportReport = () => {
    if (!report || !report.statements || report.statements.length === 0) {
      flash(t('f.needSql'))
      return
    }
    try {
      const blocks = buildReportBlocks(t, language, { dialect, sql, schemaText, report })
      const bytes = buildDocx(blocks)
      const blob = new window.Blob([bytes], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'sql-tuning-report-' + stampFileName() + '.docx'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.setTimeout(() => window.URL.revokeObjectURL(url), 4000)
      flash(t('f.reportExported'))
    } catch (error) {
      void error
      flash(t('f.exportFailed'))
    }
  }

  const summary = (report && report.summary) || {}
  const findings = (report && report.findings) || []

  const head = h('div', { className: 'sqlt-head' },
    h('div', { className: 'sqlt-head-main' },
      h('div', { className: 'sqlt-title' }, t('panel.title')),
      h('div', { className: 'sqlt-sub' }, t('panel.subtitle')),
    ),
    h('div', { className: 'sqlt-seg' },
      h('select', {
        className: 'sqlt-select',
        value: dialect,
        onChange: (event) => setDialect(event.target.value),
        'aria-label': t('dialect.label'),
      }, DIALECTS.map((id) => h('option', { key: id, value: id }, DIALECT_LABELS[id] || id))),
    ),
    h('div', { className: 'sqlt-spacer' }),
    report && findings.length > 0
      ? h('div', { className: 'sqlt-summary' }, t('result.summary', {
        high: summary.high || 0, warn: summary.warn || 0, info: summary.info || 0, indexes: summary.indexes || 0,
      }))
      : null,
    h('button', { className: 'sqlt-btn sqlt-btn-primary', onClick: runNow, type: 'button' }, t('sql.analyze')),
  )

  const metaPane = h('div', { className: 'sqlt-col' },
    h('div', { className: 'sqlt-card sqlt-rel' },
      h('div', { className: 'sqlt-card-h' },
        h('span', { className: 'sqlt-name' }, t('meta.title')),
        h('span', { className: 'sqlt-count' }, parsedTables.length),
      ),
      h('div', { className: 'sqlt-hint' }, t('meta.hint')),
      h('textarea', {
        className: 'sqlt-ta sqlt-ta-schema',
        style: { minHeight: '110px', flex: '0 0 auto', height: '190px' },
        spellCheck: false,
        'aria-label': t('meta.title'),
        value: schemaText,
        placeholder: t('meta.placeholder'),
        onChange: (event) => setSchemaText(event.target.value),
      }),
    ),
    h('div', { className: 'sqlt-card', style: { flex: '1 1 auto' } },
      h('div', { className: 'sqlt-card-h' },
        h('span', { className: 'sqlt-name' }, t('meta.tables', { n: parsedTables.length })),
      ),
      parsedTables.length === 0
        ? h('div', { className: 'sqlt-empty' }, t('meta.empty'))
        : h('div', { className: 'sqlt-list' }, parsedTables.map((table) => renderTableCard(h, t, language, table, rowsMap, setRowsMap, indexMap, setIndexMap))),
    ),
  )

  const editorPane = h('div', { className: 'sqlt-card', style: { flex: '1 1 45%' } },
    h('div', { className: 'sqlt-card-h' },
      h('span', { className: 'sqlt-name' }, t('sql.title')),
      h('div', { className: 'sqlt-spacer' }),
      h('input', {
        ref: fileRef,
        type: 'file',
        accept: '.sql,.txt,.ddl,text/plain',
        style: { display: 'none' },
        onChange: (event) => {
          readFile(event.target.files && event.target.files[0])
          event.target.value = ''
        },
      }),
      h('button', { className: 'sqlt-btn sqlt-btn-ghost', type: 'button', onClick: () => fileRef.current && fileRef.current.click() }, t('sql.import')),
      h('button', { className: 'sqlt-btn sqlt-btn-ghost', type: 'button', onClick: pasteFromClipboard }, t('sql.paste')),
      h('button', { className: 'sqlt-btn sqlt-btn-ghost', type: 'button', onClick: () => copyText(sql, t('sql.copied')) }, t('sql.copy')),
      h('button', { className: 'sqlt-btn sqlt-btn-ghost', type: 'button', onClick: loadSample }, t('sql.sample')),
      h('button', { className: 'sqlt-btn sqlt-btn-ghost', type: 'button', onClick: clearAll }, t('sql.clear')),
    ),
    h('div', { className: 'sqlt-card-b' },
      h('div', { className: 'sqlt-rel', style: { flex: '1 1 auto' } },
        h('textarea', {
          ref: editorRef,
          className: 'sqlt-ta',
          spellCheck: false,
          'aria-label': t('sql.title'),
          value: sql,
          placeholder: t('sql.placeholder'),
          onChange: (event) => setSql(event.target.value),
          onKeyDown: (event) => {
            if (event.key === 'Tab' && !event.shiftKey) {
              event.preventDefault()
              const target = event.currentTarget
              const start = target.selectionStart
              const end = target.selectionEnd
              const next = sql.slice(0, start) + '  ' + sql.slice(end)
              setSql(next)
              window.setTimeout(() => {
                target.selectionStart = start + 2
                target.selectionEnd = start + 2
              }, 0)
            }
            if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
              event.preventDefault()
              runNow()
            }
          },
          onDragOver: (event) => {
            event.preventDefault()
            setDragging(true)
          },
          onDragLeave: () => setDragging(false),
          onDrop: (event) => {
            event.preventDefault()
            setDragging(false)
            readFile(event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0])
          },
        }),
        dragging ? h('div', { className: 'sqlt-drop' }, t('sql.drop')) : null,
      ),
      h('div', { className: 'sqlt-foot' },
        h('span', null, t('sql.chars', { n: sql.length, l: sql.split(/\r?\n/).length })),
        h('span', { className: 'sqlt-kbd' }, t('sql.enterHint')),
        h('div', { className: 'sqlt-spacer' }),
        report && report.statements ? h('span', null, lastRun ? t('result.analyzedAtTime', { n: report.statements.length, time: lastRun }) : t('result.analyzedAt', { n: report.statements.length })) : null,
        h('button', {
          className: 'sqlt-btn', type: 'button',
          onClick: exportReport,
        }, t('f.exportReport')),
        h('button', {
          className: 'sqlt-btn', type: 'button',
          onClick: () => {
            copyText(reportMarkdown(), t('f.sentToChat'))
            try {
              const layout = ctx.get('layout')
              if (layout && typeof layout.selectPanel === 'function') layout.selectPanel('conversation')
            } catch (error) {
              void error
            }
          },
        }, t('f.dropExport')),
      ),
    ),
  )

  const resultPane = h('div', { className: 'sqlt-card', style: { flex: '1 1 55%' } },
    h('div', { className: 'sqlt-tabs', role: 'tablist' },
      renderTab(h, t, 'explain', tab, setTab, 0),
      renderTab(h, t, 'advice', tab, setTab, findings.length),
      renderTab(h, t, 'exec', tab, setTab, report && report.indexSuggestions ? report.indexSuggestions.length : 0),
    ),
    h('div', { className: 'sqlt-res' }, renderResult(h, t, language, { report, tab, copyText, dialect, onJump: focusLine })),
  )

  return h('div', { className: 'sqlt-root' },
    head,
    h('div', { className: 'sqlt-body' },
      metaPane,
      h('div', { className: 'sqlt-col' }, editorPane, resultPane),
    ),
    toast ? h('div', { className: 'sqlt-toast', role: 'status', 'aria-live': 'polite' }, toast) : null,
  )
}

function renderTab(h, t, id, active, setTab, count) {
  return h('button', {
    key: id,
    type: 'button',
    role: 'tab',
    'aria-selected': active === id ? 'true' : 'false',
    className: 'sqlt-tab' + (active === id ? ' sqlt-tab-on' : ''),
    onClick: () => setTab(id),
  },
    t('tab.' + id),
    count ? h('span', { className: 'sqlt-count' }, String(count)) : null,
  )
}

function renderTableCard(h, t, language, table, rowsMap, setRowsMap, indexMap, setIndexMap) {
  const rowValue = rowsMap[table.name] !== undefined && rowsMap[table.name] !== '' ? String(rowsMap[table.name]) : (table.rows === null ? '' : String(table.rows))
  const indexText = indexMap[table.name] || ''
  return h('div', { key: table.name, className: 'sqlt-table' },
    h('div', { className: 'sqlt-table-h' },
      h('span', { className: 'sqlt-table-n', title: table.rawName }, table.rawName),
      h('span', { className: 'sqlt-rows' },
        h('span', null, t('meta.rows')),
        h('input', {
          value: rowValue,
          placeholder: t('meta.rowsPlaceholder'),
          onChange: (event) => {
            const value = event.target.value
            setRowsMap((current) => {
              const next = Object.assign({}, current)
              if (value === '') delete next[table.name]
              else next[table.name] = value
              return next
            })
          },
        }),
      ),
    ),
    h('div', { className: 'sqlt-meta-row' },
      table.primaryKey.length > 0
        ? h('span', { className: 'sqlt-chip' }, h('b', null, t('meta.pk')), ' ', table.primaryKey.join(','))
        : null,
      table.partitionKeys.length > 0
        ? h('span', { className: 'sqlt-chip' }, h('b', null, t('meta.partition')), ' ', table.partitionKeys.join(','))
        : null,
      table.foreignKeys.length > 0
        ? h('span', { className: 'sqlt-chip' }, h('b', null, t('meta.fk')), ' ', table.foreignKeys.map((fk) => fk.columns.join(',') + '→' + fk.refTable).join(' '))
        : null,
      table.indexes.length > 0
        ? h('span', { className: 'sqlt-chip' }, h('b', null, t('meta.index')), ' ', String(table.indexes.length))
        : h('span', { className: 'sqlt-chip sqlt-chip-warn' }, t('meta.noIndex')),
    ),
    table.columns.length > 0
      ? h('div', { className: 'sqlt-cols' },
        table.columns.slice(0, 40).map((column) => h('span', { key: column.name, className: 'sqlt-colchip', title: column.type },
          h('i', null, column.name), column.type ? ' ' + column.type.split(/\s+/)[0] : '',
        )),
        table.columns.length > 40
          ? h('span', {
            className: 'sqlt-colchip sqlt-colchip-more',
            title: table.columns.slice(40).map((column) => column.name).join(', '),
          }, t('meta.moreColumns', { n: table.columns.length - 40 }))
          : null,
      )
      : null,
    h('div', { className: 'sqlt-meta-row', style: { paddingBottom: '8px' } },
      h('textarea', {
        className: 'sqlt-extra',
        value: indexText,
        placeholder: t('meta.extraIndex'),
        'aria-label': t('meta.extraIndex') + ' · ' + table.rawName,
        rows: 1,
        onChange: (event) => {
          const value = event.target.value
          setIndexMap((current) => {
            const next = Object.assign({}, current)
            if (value === '') delete next[table.name]
            else next[table.name] = value
            return next
          })
        },
      }),
    ),
  )
}

function renderResult(h, t, language, props) {
  const { report, tab, copyText, dialect, onJump } = props
  if (!report) {
    return h('div', { className: 'sqlt-empty' },
      h('b', null, t('result.empty')),
      h('div', null, t('sql.empty')),
    )
  }
  if (report.ok === false) {
    return h('div', { className: 'sqlt-empty' },
      h('b', null, t('result.failed')),
      h('div', null, t('result.failedHint')),
      h('div', { className: 'sqlt-detail', style: { marginTop: '8px' } }, String(report.error || '')),
    )
  }
  if (!report.statements || report.statements.length === 0) {
    return h('div', { className: 'sqlt-empty' }, h('b', null, t('result.empty')), h('div', null, t('sql.empty')))
  }
  if (tab === 'advice') return renderAdvice(h, t, language, report, onJump)
  if (tab === 'exec') return renderExecution(h, t, language, report, copyText, dialect)
  return renderExplain(h, t, language, report)
}

function renderExplain(h, t, language, report) {
  const blocks = []
  report.explanations.forEach((explanation) => {
    const access = explanation.access || []
    blocks.push(h('div', { key: 'stmt' + explanation.index, className: 'sqlt-sec' },
      h('div', { className: 'sqlt-sec-h' },
        h('span', null, t('result.statement', { n: explanation.index + 1, line: explanation.line })),
        h('span', { className: 'sqlt-count' }, t('kind.' + explanation.kind)),
      ),
      h('div', { className: 'sqlt-sec-b' },
        h('div', { className: 'sqlt-step' },
          h('div', { className: 'sqlt-step-k' }, t('result.logicalOrder')),
            h('div', { className: 'sqlt-step-v' }, explanation.logicalOrder.join(' → ')),
        ),
        ...explanation.steps.map((step, index) => {
          const rendered = renderStep(t, language, step)
          if (!rendered) return null
          return h('div', { key: 'step' + index, className: 'sqlt-step' },
            h('div', { className: 'sqlt-step-k' }, rendered.label),
            h('div', { className: 'sqlt-step-v' }, rendered.value),
          )
        }),
        access.length > 0
          ? h('div', { className: 'sqlt-step' },
            h('div', { className: 'sqlt-step-k' }, t('result.access')),
            h('div', null,
              h('div', { className: 'sqlt-acc-row' },
                h('div', { className: 'sqlt-acc-h' }, t('acc.table')),
                h('div', { className: 'sqlt-acc-h' }, t('acc.rowsHead')),
                h('div', { className: 'sqlt-acc-h' }, t('acc.estHead')),
                h('div', { className: 'sqlt-acc-h' }, t('acc.indexHead')),
              ),
              access.map((item) => h('div', { key: item.table, className: 'sqlt-acc-row' },
                h('div', { className: 'sqlt-acc-t' }, item.table),
                h('div', null, formatRows(item.rows, language)),
                h('div', null, item.estimate === null ? '—' : t('acc.est', { n: formatRows(item.estimate, language) })),
                h('div', { className: 'sqlt-acc-t' }, item.index || t('acc.noIndex')),
              )),
            ),
          )
          : null,
      ),
    ))
  })
  return blocks
}

function renderStep(t, language, step) {
  const params = step.params || {}
  switch (step.code) {
    case 'explain.statement':
      return { label: t('explain.statement'), value: t('kind.' + (params.kind || 'UNKNOWN')) }
    case 'explain.tables':
      return {
        label: t('explain.tables'),
        value: (params.tables || []).map((table) => {
          const bits = [table.alias ? table.name + ' ' + table.alias : table.name]
          if (table.rows !== null && table.rows !== undefined) bits.push(formatRows(table.rows, language) + ' rows')
          if (table.partitionKeys && table.partitionKeys.length > 0) bits.push('partition ' + table.partitionKeys.join(','))
          return bits.join(' · ')
        }).join('   |   '),
      }
    case 'explain.joins':
      return { label: t('explain.joins'), value: (params.joins || []).map((join) => join.kind + ' JOIN ' + join.table).join('   |   ') }
    case 'explain.select':
      return { label: t('explain.select'), value: params.star ? '*' : (params.items || []).join(', ') }
    case 'explain.filters':
      return {
        label: t('explain.filters'),
        value: h('div', null, (params.items || []).map((item, index) => h('div', { key: index },
          (item.connector ? item.connector.toUpperCase() + ' ' : '') + item.raw,
          h('span', { className: 'sqlt-flag ' + (item.sargable ? 'sqlt-flag-ok' : 'sqlt-flag-bad') },
            item.sargable ? t('explain.sargable') : t('explain.notSargable')),
        ))),
      }
    case 'explain.joinKeys':
      return { label: t('explain.joinKeys'), value: (params.items || []).join('   |   ') }
    case 'explain.groupBy':
      return {
        label: t('explain.groupBy'),
        value: 'GROUP BY ' + (params.columns || []).join(', ') + ((params.aggregates || []).length > 0 ? '  ·  ' + (params.aggregates || []).join(', ') : ''),
      }
    case 'explain.aggregateNoGroup':
      return { label: t('explain.aggregateNoGroup'), value: (params.aggregates || []).join(', ') }
    case 'explain.having':
      return { label: t('explain.having'), value: (params.items || []).join('   |   ') }
    case 'explain.distinct':
      return { label: t('explain.distinct'), value: 'DISTINCT' }
    case 'explain.orderBy':
      return {
        label: t('explain.orderBy'),
        value: (params.items || []).map((item) => item.column + ' ' + String(item.direction || 'asc').toUpperCase()).join(', '),
      }
    case 'explain.limit':
      return {
        label: t('explain.limit'),
        value: (params.limit === null || params.limit === undefined ? '' : 'LIMIT ' + params.limit) +
          (params.offset ? ' OFFSET ' + params.offset : ''),
      }
    case 'explain.window':
      return { label: t('explain.window'), value: (params.funcs || []).join(', ') }
    case 'explain.subquery':
      return { label: t('explain.subquery'), value: params.count + ' · correlated ' + params.correlated }
    case 'explain.union':
      return { label: t('explain.union'), value: (params.kinds || []).join(' , ') }
    case 'explain.cte':
      return { label: t('explain.cte'), value: (params.names || []).join(', ') }
    default:
      return null
  }
}

function renderAdvice(h, t, language, report, onJump) {
  const findings = report.findings || []
  if (findings.length === 0) {
    return h('div', { className: 'sqlt-empty' }, h('b', null, t('result.none')), h('div', null, t('advice.empty')))
  }
  return findings.map((finding, index) => {
    const meta = {
      title: t('f.' + finding.code + '.title'),
      why: t('f.' + finding.code + '.why'),
      fix: t('f.' + finding.code + '.fix'),
    }
    const title = meta.title === 'f.' + finding.code + '.title' ? finding.code : meta.title
    const detail = findingDetail(t, language, finding)
    return h('div', { key: finding.key || index, className: 'sqlt-finding' },
      h('div', { className: 'sqlt-finding-h' },
        h('span', { className: 'sqlt-dot sqlt-dot-' + finding.severity }),
        h('span', null, title),
        finding.line
          ? h('button', {
            type: 'button',
            className: 'sqlt-badge sqlt-badge-btn',
            title: t('result.jump'),
            onClick: () => { if (typeof onJump === 'function') onJump(finding.line) },
          }, 'L' + finding.line)
          : null,
        h('span', { className: 'sqlt-badge' }, t('sev.' + finding.severity)),
      ),
      h('div', { className: 'sqlt-finding-b' },
        detail ? h('div', { className: 'sqlt-detail' }, detail) : null,
        meta.why && !/\.why$/.test(meta.why) ? h('div', { className: 'sqlt-why' }, meta.why) : null,
        meta.fix && !/\.fix$/.test(meta.fix) ? h('div', { className: 'sqlt-fix' }, meta.fix) : null,
      ),
    )
  })
}

function renderExecution(h, t, language, report, copyText, dialect) {
  const sections = []
  const suggestions = report.indexSuggestions || []
  sections.push(h('div', { key: 'idx', className: 'sqlt-sec' },
    h('div', { className: 'sqlt-sec-h' }, h('span', null, t('exec.indexes')), h('span', { className: 'sqlt-count' }, String(suggestions.length))),
    h('div', { className: 'sqlt-sec-b' },
      suggestions.length === 0
        ? h('div', { className: 'sqlt-why' }, t('exec.indexesEmpty'))
        : suggestions.map((suggestion) => h('div', { key: suggestion.key || suggestion.name },
          h('div', { className: 'sqlt-kv' },
            h('b', null, suggestion.table),
            h('span', null, '(' + suggestion.columns.join(', ') + ')'),
            suggestion.rows ? h('span', null, t('exec.estRows', { rows: formatRows(suggestion.rows, language) })) : null,
          ),
          suggestion.replaces ? h('div', { className: 'sqlt-why' }, t('exec.replaceHint', { name: suggestion.replaces })) : null,
          h('div', { className: 'sqlt-code' },
            h('div', { className: 'sqlt-code-h' },
              h('span', null, t('exec.ddl')),
              h('div', { className: 'sqlt-spacer' }),
              h('button', {
                className: 'sqlt-btn sqlt-btn-ghost', type: 'button',
                onClick: () => copyText(suggestion.ddl, t('sql.copied')),
              }, t('exec.copyDdl')),
            ),
            h('pre', null, suggestion.ddl),
          ),
        )),
    ),
  ))

  const rewrites = report.rewrites || []
  sections.push(h('div', { key: 'rw', className: 'sqlt-sec' },
    h('div', { className: 'sqlt-sec-h' }, h('span', null, t('exec.rewrites')), h('span', { className: 'sqlt-count' }, String(rewrites.length))),
    h('div', { className: 'sqlt-sec-b' },
      rewrites.length === 0
        ? h('div', { className: 'sqlt-why' }, t('exec.rewritesEmpty'))
        : rewrites.map((rewrite, index) => h('div', { key: index },
          h('div', { className: 'sqlt-kv' },
            h('b', null, t(rewrite.code) === rewrite.code ? rewrite.code : t(rewrite.code)),
            h('button', {
              className: 'sqlt-btn sqlt-btn-ghost',
              type: 'button',
              onClick: () => copyText(rewrite.after, t('sql.copied')),
            }, t('exec.copyRewrite')),
          ),
          h('div', { className: 'sqlt-why' }, t(rewrite.note)),
          h('div', { className: 'sqlt-code' }, h('pre', null, '-- before\n' + rewrite.before + '\n\n-- after\n' + rewrite.after)),
        )),
    ),
  ))

  const execution = report.execution || []
  const checklist = execution.reduce((all, item) => all.concat(item.checklist || []), [])
  const settings = execution.reduce((all, item) => all.concat(item.settings || []), [])
  const hints = execution.reduce((all, item) => all.concat(item.hints || []), [])
  if (checklist.length > 0) {
    sections.push(h('div', { key: 'ck', className: 'sqlt-sec' },
      h('div', { className: 'sqlt-sec-h' }, h('span', null, t('exec.checklist'))),
      h('div', { className: 'sqlt-sec-b' }, checklist.map((item, index) => h('div', { key: index, className: 'sqlt-why' }, '· ' + t(item)))),
    ))
  }
  if (settings.length > 0) {
    sections.push(h('div', { key: 'st', className: 'sqlt-sec' },
      h('div', { className: 'sqlt-sec-h' }, h('span', null, t('exec.settings'))),
      h('div', { className: 'sqlt-sec-b' }, settings.map((item, index) => h('div', { key: index },
        h('div', { className: 'sqlt-code' }, h('pre', null, item.text)),
        h('div', { className: 'sqlt-why' }, t(item.note)),
      ))),
    ))
  }
  if (hints.length > 0) {
    sections.push(h('div', { key: 'ht', className: 'sqlt-sec' },
      h('div', { className: 'sqlt-sec-h' }, h('span', null, t('exec.hints'))),
      h('div', { className: 'sqlt-sec-b' }, hints.map((item, index) => h('div', { key: index },
        h('div', { className: 'sqlt-code' }, h('pre', null, item.text)),
        h('div', { className: 'sqlt-why' }, t(item.note)),
      ))),
    ))
  }
  void dialect
  return sections
}

function buildMarkdown(t, language, ctxData) {
  const { dialect, sql, schemaText, report } = ctxData
  const L = (zh, en) => (language === 'en' ? en : zh)
  const lines = []
  lines.push(L('# SQL 分析与调优报告', '# SQL analysis and tuning report'))
  lines.push('')
  lines.push('- ' + L('数据库类型', 'Database') + ': ' + dialect)
  lines.push('- ' + L('表结构 / 数据字典', 'Schema / data dictionary') + ':')
  lines.push('```sql')
  lines.push(schemaText.trim() === '' ? L('(未提供)', '(not provided)') : schemaText.trim())
  lines.push('```')
  lines.push('- ' + L('待分析 SQL', 'SQL under review') + ':')
  lines.push('```sql')
  lines.push(sql.trim())
  lines.push('```')
  if (!report || !report.statements || report.statements.length === 0) {
    lines.push('')
    lines.push(L('（未分析出语句）', '(no statement parsed)'))
    return lines.join('\n')
  }
  lines.push('')
  lines.push(L('## 一、SQL 解释', '## 1. SQL explanation'))
  for (const explanation of report.explanations || []) {
    lines.push('')
    lines.push('### ' + L('语句', 'Statement') + ' ' + (explanation.index + 1) + ' (' + explanation.kind + ', ' + L('第 ' + explanation.line + ' 行', 'line ' + explanation.line) + ')')
    lines.push('- ' + L('逻辑执行顺序', 'Logical order') + ': ' + (explanation.logicalOrder || []).join(' -> '))
    for (const step of explanation.steps || []) {
      const rendered = renderStep(t, language, step)
      if (!rendered) continue
      const value = typeof rendered.value === 'string' ? rendered.value : flattenNode(rendered.value)
      lines.push('- ' + rendered.label + ': ' + value)
    }
    if ((explanation.access || []).length > 0) {
      lines.push('- ' + L('预计访问方式', 'Estimated access') + ':')
      for (const item of explanation.access) {
        lines.push('  - ' + item.table + ': rows=' + formatRows(item.rows, language) +
          ', estimate=' + (item.estimate === null ? '-' : formatRows(item.estimate, language)) +
          ', index=' + (item.index || 'none'))
      }
    }
  }
  lines.push('')
  lines.push(L('## 二、优化建议', '## 2. Optimization advice'))
  const findings = report.findings || []
  if (findings.length === 0) lines.push('- ' + L('未命中规则', 'No rule matched'))
  for (const finding of findings) {
    lines.push('')
    lines.push('- [' + t('sev.' + finding.severity) + '] ' + t('f.' + finding.code + '.title') +
      (finding.line ? ' (' + L('第 ' + finding.line + ' 行', 'line ' + finding.line) + ')' : ''))
    const detail = findingDetail(t, language, finding)
    if (detail) lines.push('  - ' + L('现象', 'Symptom') + ': ' + detail)
    const why = t('f.' + finding.code + '.why')
    if (!/\.why$/.test(why)) lines.push('  - ' + L('原因', 'Cause') + ': ' + why)
    const fix = t('f.' + finding.code + '.fix')
    if (!/\.fix$/.test(fix)) lines.push('  - ' + L('建议', 'Fix') + ': ' + fix)
  }
  lines.push('')
  lines.push(L('## 三、执行优化', '## 3. Execution tuning'))
  lines.push('')
  lines.push('### ' + L('索引', 'Indexes'))
  const suggestions = report.indexSuggestions || []
  if (suggestions.length === 0) lines.push(L('现有索引已够用。', 'Existing indexes are enough.'))
  for (const suggestion of suggestions) {
    lines.push('```sql')
    lines.push(suggestion.ddl)
    lines.push('```')
  }
  lines.push('')
  lines.push('### ' + L('SQL 改写', 'SQL rewrites'))
  const rewrites = report.rewrites || []
  if (rewrites.length === 0) lines.push(L('无可自动改写项。', 'Nothing to rewrite automatically.'))
  for (const rewrite of rewrites) {
    lines.push('- ' + t(rewrite.code) + ': ' + t(rewrite.note))
    lines.push('  - ' + L('改写前', 'Before') + ': `' + rewrite.before + '`')
    lines.push('  - ' + L('改写后', 'After') + ': `' + rewrite.after + '`')
  }
  const execution = report.execution || []
  const checklist = execution.reduce((all, item) => all.concat(item.checklist || []), [])
  if (checklist.length > 0) {
    lines.push('')
    lines.push('### ' + L('执行计划检查清单', 'Execution plan checklist'))
    for (const item of checklist) lines.push('- ' + t(item))
  }
  lines.push('')
  lines.push('---')
  lines.push(L(
    '请基于以上结构化结论做进一步深入分析：确认根因、补充可能漏掉的改写方案，并给出可执行的优化步骤（含预期收益与风险）。上下文：数据库类型 ' + dialect + '。',
    'Use the structured findings above as evidence: confirm the root cause, add any rewrite you would apply that is missing here, and give an actionable tuning plan with expected gain and risk. Dialect: ' + dialect + '.',
  ))
  return lines.join('\n')
}
function stampFileName() {
  try {
    const now = new Date()
    const pad = (value) => String(value).padStart(2, '0')
    return now.getFullYear() + pad(now.getMonth() + 1) + pad(now.getDate()) + '-' + pad(now.getHours()) + pad(now.getMinutes())
  } catch (error) {
    void error
    return 'report'
  }
}

/** Word 导出用的结构化内容（与 buildMarkdown 同源，但按文档层级组织）。 */
function buildReportBlocks(t, language, ctxData) {
  const { dialect, sql, schemaText, report } = ctxData
  const L = (zh, en) => (language === 'en' ? en : zh)
  const blocks = []
  blocks.push({ kind: 'title', text: L('SQL 分析与调优报告', 'SQL analysis and tuning report') })
  if (!report || !report.statements || report.statements.length === 0) {
    blocks.push({ kind: 'p', text: L('（没有可分析的语句）', '(no statement parsed)') })
    return blocks
  }
  blocks.push({ kind: 'p', text: L('数据库类型：', 'Database: ') + dialect })
  blocks.push({ kind: 'p', text: L('生成时间：', 'Generated: ') + new Date().toLocaleString() })
  const summary = report.summary || {}
  blocks.push({
    kind: 'p',
    text: L(
      `共分析 ${summary.statements} 条语句，发现 ${summary.high} 项高危、${summary.warn} 项建议、${summary.info} 项提示，给出 ${summary.indexes} 条索引建议。`,
      `Analyzed ${summary.statements} statements: ${summary.high} high, ${summary.warn} advice, ${summary.info} notes, and ${summary.indexes} index suggestions.`,
    ),
  })

  blocks.push({ kind: 'h1', text: L('一、SQL 解释', '1. Explanation') })
  for (const explanation of report.explanations || []) {
    blocks.push({
      kind: 'h2',
      text: L(
        `语句 ${explanation.index + 1}（${t('kind.' + explanation.kind)}，第 ${explanation.line} 行）`,
        `Statement ${explanation.index + 1} (${t('kind.' + explanation.kind)}, line ${explanation.line})`,
      ),
    })
    blocks.push({ kind: 'p', text: L('逻辑执行顺序：', 'Logical order: ') + (explanation.logicalOrder || []).join(' → ') })
    for (const step of explanation.steps || []) {
      const rendered = renderStep(t, language, step)
      if (!rendered) continue
      const value = typeof rendered.value === 'string' ? rendered.value : flattenNode(rendered.value)
      if (value === '') continue
      blocks.push({ kind: 'bullet', text: rendered.label + '：' + value })
    }
    const access = explanation.access || []
    if (access.length > 0) {
      blocks.push({ kind: 'p', text: L('预计访问方式：', 'Estimated access:') })
      for (const item of access) {
        blocks.push({
          kind: 'bullet',
          text: item.table
            + ' — ' + L('行数 ', 'rows ') + formatRows(item.rows, language)
            + L('，粗估扫描 ', ', est. scan ') + (item.estimate === null ? '-' : formatRows(item.estimate, language))
            + L('，索引 ', ', index ') + (item.index || L('无', 'none')),
        })
      }
    }
  }

  blocks.push({ kind: 'h1', text: L('二、优化建议', '2. Advice') })
  const findings = report.findings || []
  if (findings.length === 0) {
    blocks.push({ kind: 'p', text: L('这条 SQL 没有命中规则，也没有明显风险。仍建议用 EXPLAIN 复核一次。', 'No rule matched and no obvious risk. Still worth confirming with EXPLAIN.') })
  }
  for (const finding of findings) {
    blocks.push({
      kind: 'h2',
      text: `【${t('sev.' + finding.severity)}】${t('f.' + finding.code + '.title')}`
        + (finding.line ? L('（第 ' + finding.line + ' 行）', ' (line ' + finding.line + ')') : ''),
    })
    const detail = findingDetail(t, language, finding)
    if (detail) blocks.push({ kind: 'p', text: L('现象：', 'Symptom: ') + detail })
    const why = t('f.' + finding.code + '.why')
    if (!/\.why$/.test(why)) blocks.push({ kind: 'p', text: L('原因：', 'Cause: ') + why })
    const fix = t('f.' + finding.code + '.fix')
    if (!/\.fix$/.test(fix)) blocks.push({ kind: 'p', text: L('建议：', 'Fix: ') + fix })
  }

  blocks.push({ kind: 'h1', text: L('三、执行优化', '3. Execution tuning') })
  const suggestions = report.indexSuggestions || []
  blocks.push({ kind: 'h2', text: L('索引建议', 'Index suggestions') })
  if (suggestions.length === 0) blocks.push({ kind: 'p', text: L('现有索引已够用。', 'Existing indexes are enough.') })
  for (const suggestion of suggestions) {
    blocks.push({
      kind: 'p',
      text: suggestion.table + ' (' + suggestion.columns.join(', ') + ')'
        + (suggestion.replaces ? L('，可替代现有索引 ', ', replaces ') + suggestion.replaces : ''),
    })
    blocks.push({ kind: 'code', text: suggestion.ddl })
  }
  blocks.push({ kind: 'h2', text: L('SQL 改写', 'SQL rewrites') })
  const rewrites = report.rewrites || []
  if (rewrites.length === 0) blocks.push({ kind: 'p', text: L('没有可以安全自动改写的部分。', 'Nothing to rewrite automatically.') })
  for (const rewrite of rewrites) {
    blocks.push({ kind: 'p', text: t(rewrite.code) + '：' + t(rewrite.note) })
    blocks.push({ kind: 'code', text: '-- before\n' + rewrite.before + '\n-- after\n' + rewrite.after })
  }
  const execution = report.execution || []
  const checklist = execution.reduce((all, item) => all.concat(item.checklist || []), [])
  if (checklist.length > 0) {
    blocks.push({ kind: 'h2', text: L('执行计划检查清单', 'Execution plan checklist') })
    for (const item of checklist) blocks.push({ kind: 'bullet', text: t(item) })
  }
  const settings = execution.reduce((all, item) => all.concat(item.settings || []), [])
  if (settings.length > 0) {
    blocks.push({ kind: 'h2', text: L('会话 / 优化器参数', 'Session / optimizer settings') })
    for (const item of settings) blocks.push({ kind: 'code', text: item.text })
  }
  const hints = execution.reduce((all, item) => all.concat(item.hints || []), [])
  if (hints.length > 0) {
    blocks.push({ kind: 'h2', text: L('可用 Hint', 'Hints') })
    for (const item of hints) blocks.push({ kind: 'code', text: item.text })
  }

  blocks.push({ kind: 'h1', text: L('附录：表结构 / 数据字典', 'Appendix: schema / data dictionary') })
  blocks.push({ kind: 'code', text: schemaText.trim() === '' ? L('（未提供）', '(not provided)') : schemaText.trim() })
  blocks.push({ kind: 'h1', text: L('附录：原始 SQL', 'Appendix: original SQL') })
  blocks.push({ kind: 'code', text: sql.trim() })
  return blocks
}

function flattenNode(node) {
  if (node === null || node === undefined) return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(flattenNode).filter((part) => part !== '').join(' ')
  if (typeof node === 'object' && node.props && node.props.children !== undefined) return flattenNode(node.props.children)
  return ''
}

// ---------------------------------------------------------------- icon
const DIALECT_LABELS = {
  mysql: 'MySQL', mariadb: 'MariaDB', tidb: 'TiDB', postgresql: 'PostgreSQL', oracle: 'Oracle',
  sqlserver: 'SQL Server', sqlite: 'SQLite', hive: 'Hive', spark: 'Spark SQL', clickhouse: 'ClickHouse',
  doris: 'Doris', db2: 'DB2', dm: '达梦 DM', other: 'Other',
}

function PanelIcon(props) {
  const size = (props && props.size) || 18
  const active = Boolean(props && props.active)
  const color = active ? 'var(--dsw-alias-brand-primary)' : 'currentColor'
  return React.createElement('svg', {
    width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
    'aria-hidden': true, style: { display: 'block', color },
  },
    React.createElement('ellipse', { cx: 10, cy: 5.6, rx: 6.4, ry: 2.6, stroke: color, strokeWidth: 1.6 }),
    React.createElement('path', {
      d: 'M3.6 5.6v10.2c0 1.44 2.87 2.6 6.4 2.6 1.02 0 1.98-.09 2.82-.24',
      stroke: color, strokeWidth: 1.6, strokeLinecap: 'round',
    }),
    React.createElement('path', {
      d: 'M16.4 5.6v4.2M3.6 10.7c0 1.44 2.87 2.6 6.4 2.6 .5 0 .99-.02 1.46-.06',
      stroke: color, strokeWidth: 1.6, strokeLinecap: 'round',
    }),
    React.createElement('circle', { cx: 16.2, cy: 15.4, r: 3.4, stroke: color, strokeWidth: 1.6 }),
    React.createElement('path', { d: 'M18.8 18l2.2 2.2', stroke: color, strokeWidth: 1.6, strokeLinecap: 'round' }),
  )
}

// ---------------------------------------------------------------- registration
function apply(ctx) {
  const t = makeT(ctx)
  const App = function SqlTunerPanel() {
    return React.createElement(SqlTunerApp, { ctx, t })
  }
  const Icon = function SqlTunerIcon(props) {
    return React.createElement(PanelIcon, props)
  }

  ctx.effect(() => {
    const style = document.createElement('style')
    style.setAttribute('data-dsh-sql-tuner', '')
    style.textContent = CSS
    document.head.appendChild(style)
    return () => {
      if (style.parentNode) style.parentNode.removeChild(style)
    }
  }, 'dsh-sql-tuner.styles')

  ctx.slots.inject('main', () => ctx.slots.register({ name: 'main', key: 'sql-tuner' }, App))
  ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
    name: 'sidebar.panellist',
    id: 'sql-tuner',
    order: 35,
    label: () => t('panel.title'),
  }, Icon))
}

return { inject: ['slots'], apply }
