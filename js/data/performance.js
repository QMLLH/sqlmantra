/*
 * performance.js — 性能 / 索引 / 执行计划 / 大表（18 条，cat='perf'）
 * 字段规则：{id, cat, title, tags, level, syntax, example, note, pitfalls, dialects?}
 * - id：perf-001 ~ perf-018，全库唯一；title ≤20 字；note ≤120 字；
 * - pitfalls 0-3 条、每条 ≤60 字；dialects 键为 db2/mysql/pg/mssql/oracle 子集，值 ≤80 字；
 * - syntax 参数用 <尖括号> 占位；
 * - 教学示例用 EMP/DEPT；监管大表示例统一以「-- 例：监管明细表 T_KJ_DGCKFZMX，HXJYRQ 为核心交易日期」注释开头；
 * - 纯 ES2019，禁止 import/export、fetch 与 http(s) 字符串。
 */
window.SQLMANTRA_DATA = window.SQLMANTRA_DATA || {};
window.SQLMANTRA_DATA['performance'] = [
  {
    id: 'perf-001', cat: 'perf', title: '执行计划解读入门',
    tags: ['执行计划', 'EXPLAIN', 'EXPLAIN PLAN', '全表扫描'],
    level: 3,
    syntax: 'EXPLAIN <SQL>;  -- 关注扫描方式、连接顺序、基数估算、成本',
    example: "-- 例：监管明细表 T_KJ_DGCKFZMX，HXJYRQ 为核心交易日期\nEXPLAIN\nSELECT *\nFROM T_KJ_DGCKFZMX\nWHERE HXJYRQ BETWEEN DATE '2024-01-01' AND DATE '2024-01-31';",
    note: '慢 SQL 先看计划：是否全表扫描、索引是否命中、估算行数与实际偏差。估算偏差大先更新统计信息。',
    pitfalls: ['估算行数与实际差几个数量级，多半是统计信息过期。'],
    dialects: {
      db2: 'EXPLAIN PLAN FOR 后查 EXPLAIN 表，或用 db2exfmt。',
      mysql: 'EXPLAIN 看 type/key/rows/Extra；8.0 支持 EXPLAIN ANALYZE。',
      pg: 'EXPLAIN (ANALYZE, BUFFERS) 看实际耗时。',
      mssql: 'SET STATISTICS IO/TIME 或图形执行计划。',
      oracle: 'EXPLAIN PLAN + DBMS_XPLAN.DISPLAY_CURSOR。'
    }
  },
  {
    id: 'perf-002', cat: 'perf', title: 'B-Tree 索引创建与选型',
    tags: ['CREATE INDEX', '索引', 'B-TREE', '唯一索引'],
    level: 2,
    syntax: 'CREATE [UNIQUE] INDEX <索引名> ON <表>(<列1>, <列2>);',
    example: "CREATE INDEX idx_emp_deptno ON EMP(deptno);\nCREATE UNIQUE INDEX uk_emp_empno ON EMP(empno);",
    note: '为高频过滤与关联列建索引。唯一约束用唯一索引承载；索引不是越多越好，每个索引都拖慢写入。',
    pitfalls: ['低基数列（性别、标志位）单独建索引收益极小。']
  },
  {
    id: 'perf-003', cat: 'perf', title: '复合索引最左前缀原则',
    tags: ['复合索引', '最左前缀', '索引列顺序'],
    level: 3,
    syntax: 'CREATE INDEX <名> ON <表>(<等值列>, <范围列>);  -- 范围列放最后',
    example: "-- 例：监管明细表 T_KJ_DGCKFZMX，HXJYRQ 为核心交易日期\nCREATE INDEX idx_dgck_org_date ON T_KJ_DGCKFZMX(JGDM, HXJYRQ);\n-- WHERE JGDM=? AND HXJYRQ>=? 可命中；只查 HXJYRQ 则跳过该索引",
    note: '索引按列序使用，跳过前导列则索引失效（除索引跳跃扫描）。列顺序：等值在前、范围在后、高区分度优先。',
    pitfalls: ['范围条件之后的索引列无法继续精确定位。']
  },
  {
    id: 'perf-004', cat: 'perf', title: '隐式类型转换致索引失效',
    tags: ['隐式转换', '索引失效', '类型匹配', 'VARCHAR 数字'],
    level: 3,
    syntax: '字符列与数字常量比较 → 列被隐式转换 → 索引失效',
    example: "-- 例：监管明细表 T_KJ_DGCKFZMX，HXJYRQ 为核心交易日期\nSELECT COUNT(*)\nFROM T_KJ_DGCKFZMX\nWHERE JGDM = 110101;\n-- JGDM 为 VARCHAR：部分库会把列转数字，索引失效全表扫描\n-- 正确写法：WHERE JGDM = '110101'",
    note: '比较两侧类型必须一致。监管系统机构码、证件号都是字符串，漏写引号导致百亿表全扫描是经典事故。',
    pitfalls: ['参数绑定时应用层传错类型同样触发隐式转换。']
  },
  {
    id: 'perf-005', cat: 'perf', title: 'NOT IN 与 NULL 的陷阱',
    tags: ['NOT IN', 'NULL', 'NOT EXISTS', '反连接'],
    level: 3,
    syntax: 'WHERE <列> NOT IN (SELECT <列> FROM <表2>);  -- 子查询含 NULL 则零命中',
    example: "-- 例：监管明细表 T_KJ_DGCKFZMX，HXJYRQ 为核心交易日期\nSELECT COUNT(*)\nFROM T_KJ_DGCKFZMX t\nWHERE NOT EXISTS (\n  SELECT 1 FROM T_KJ_BLACKLIST b WHERE b.ZJHM = t.ZJHM\n);\n-- 忌用 WHERE t.ZJHM NOT IN (SELECT ZJHM FROM T_KJ_BLACKLIST)",
    note: '子查询结果含 NULL 时 NOT IN 整体判 UNKNOWN，一行不返；且 NOT IN 难做哈希反连接。一律改写 NOT EXISTS。',
    pitfalls: ['NOT IN 列表混入 NULL，结果为空且不报错。']
  },
  {
    id: 'perf-006', cat: 'perf', title: '批量更新分批提交',
    tags: ['批量更新', '分批提交', 'BATCH UPDATE', '事务日志'],
    level: 3,
    syntax: 'UPDATE <表> SET ... WHERE <主键范围>;  循环按主键分批，每批 COMMIT',
    example: "-- 例：监管明细表 T_KJ_DGCKFZMX，HXJYRQ 为核心交易日期\nUPDATE T_KJ_DGCKFZMX\nSET CLZT = 'Y'\nWHERE HXJYRQ = DATE '2024-01-31'\n  AND ZJLSH BETWEEN :lo AND :hi;\n-- 按主键 ZJLSH 分段循环，每批 5 万行 COMMIT 一次",
    note: '单次 UPDATE 千万行会撑爆事务日志、长锁表。按主键/日期分批，每批提交，控制锁粒度与日志量。',
    pitfalls: ['分批断点必须按唯一键推进，避免漏行或重复处理。']
  },
  {
    id: 'perf-007', cat: 'perf', title: '百亿明细表的分区裁剪',
    tags: ['分区', '分区裁剪', 'PARTITION PRUNING', '大表'],
    level: 3,
    syntax: 'WHERE <分区键> = <值>;  -- 条件直接命中分区键，优化器只扫目标分区',
    example: "-- 例：监管明细表 T_KJ_DGCKFZMX，HXJYRQ 为核心交易日期\nSELECT JGDM, SUM(JYJE)\nFROM T_KJ_DGCKFZMX\nWHERE HXJYRQ = DATE '2024-01-31'\nGROUP BY JGDM;\n-- 按 HXJYRQ 范围分区时仅扫当日分区，而非全表",
    note: '大表按交易日期分区，查询条件必须带上分区键等值/范围才能裁剪。函数包裹分区键会让裁剪失效。',
    pitfalls: ['WHERE TRUNC(分区键)= 常数会让分区裁剪失效。']
  },
  {
    id: 'perf-008', cat: 'perf', title: '索引下推与覆盖索引',
    tags: ['索引下推', 'ICP', '覆盖索引', '回表'],
    level: 3,
    syntax: '索引含全部查询列 → 仅扫索引；其余过滤条件下推到存储引擎层',
    example: "-- 例：监管明细表 T_KJ_DGCKFZMX，HXJYRQ 为核心交易日期\nSELECT HXJYRQ, JGDM, COUNT(*)\nFROM T_KJ_DGCKFZMX\nWHERE HXJYRQ BETWEEN DATE '2024-01-01' AND DATE '2024-01-31'\n  AND JGDM LIKE '1101%'\nGROUP BY HXJYRQ, JGDM;\n-- 若存在 (HXJYRQ, JGDM) 索引：条件下推 + 免回表",
    note: '索引下推（ICP）把能用在索引上的过滤提前，减少回表；覆盖索引让查询完全不回表，是大表点查利器。',
    pitfalls: ['SELECT * 使覆盖索引失效，宽行回表成本极高。']
  },
  {
    id: 'perf-009', cat: 'perf', title: '函数包裹列导致索引失效',
    tags: ['函数索引', '索引失效', 'SARGABLE'],
    level: 2,
    syntax: 'WHERE <函数>(<索引列>) = <值>  →  失效；改写为列在等号一侧',
    example: "SELECT ename, hiredate\nFROM EMP\nWHERE hiredate >= DATE '1981-01-01'\n  AND hiredate <  DATE '1982-01-01';\n-- 忌用 WHERE EXTRACT(YEAR FROM hiredate) = 1981",
    note: '谓词可搜索（SARGable）原则：让索引列"裸奔"。日期列查某年改半开区间，字符串前缀用 LIKE 前缀而非函数。',
    pitfalls: ['确需函数条件时，可建表达式/函数索引补救。']
  },
  {
    id: 'perf-010', cat: 'perf', title: 'LIKE 前导通配全表扫描',
    tags: ['LIKE', '前导通配', '全表扫描', '索引'],
    level: 2,
    syntax: "WHERE <列> LIKE '<前缀>%'  可用索引；LIKE '%<后缀>' 不可用",
    example: "SELECT ename\nFROM EMP\nWHERE ename LIKE 'SM%';\n-- 可走 ename 索引；LIKE '%TH' 则全表扫描",
    note: 'B-Tree 索引按前缀有序，只能加速前缀匹配。必须后缀/包含匹配时考虑全文索引或搜索引擎。',
    pitfalls: ['前导 % 的 LIKE 在百亿表上等同灾难，需求侧就要拦。']
  },
  {
    id: 'perf-011', cat: 'perf', title: 'EXISTS 与 IN 的取舍',
    tags: ['EXISTS', 'IN', '半连接', '子查询优化'],
    level: 2,
    syntax: '大子查询外表小用 EXISTS；小结果集列表用 IN',
    example: "SELECT d.dname\nFROM DEPT d\nWHERE EXISTS (\n  SELECT 1 FROM EMP e\n  WHERE e.deptno = d.deptno AND e.sal > 3000\n);",
    note: '现代优化器多能把 IN 改写成半连接，但 EXISTS 语义清晰、不受 NULL 影响，复杂条件下更可控。',
    pitfalls: ['IN 后接未加索引的大子查询，每行都全扫一次（未改写时）。']
  },
  {
    id: 'perf-012', cat: 'perf', title: '深分页优化（键集分页）',
    tags: ['深分页', '键集分页', 'KEYSET PAGINATION', 'OFFSET'],
    level: 3,
    syntax: 'WHERE (<排序键>) > (<上一页末值>) ORDER BY <排序键> FETCH FIRST <n> ROWS ONLY;',
    example: "-- 例：监管明细表 T_KJ_DGCKFZMX，HXJYRQ 为核心交易日期\nSELECT ZJLSH, HXJYRQ, JYJE\nFROM T_KJ_DGCKFZMX\nWHERE HXJYRQ = DATE '2024-01-31'\n  AND ZJLSH > :last_id\nORDER BY ZJLSH\nFETCH FIRST 50 ROWS ONLY;",
    note: 'OFFSET 十万再取 50 行，数据库要真实数出并丢弃十万行。记住上一页末键，从该键之后取，复杂度与页深无关。',
    pitfalls: ['排序键必须唯一稳定，否则翻页会漏/重。'],
    dialects: {
      mysql: 'LIMIT 50 替代 FETCH FIRST。',
      mssql: 'OFFSET 0 ROWS FETCH NEXT 50 ROWS ONLY 或 TOP。'
    }
  },
  {
    id: 'perf-013', cat: 'perf', title: 'UNION 改 UNION ALL',
    tags: ['UNION ALL', '去重', '排序开销'],
    level: 2,
    syntax: 'SELECT ... UNION ALL SELECT ...;  -- 无重复诉求时不加去重',
    example: "SELECT empno, ename FROM EMP WHERE deptno = 10\nUNION ALL\nSELECT empno, ename FROM EMP WHERE deptno = 20;",
    note: 'UNION 要去重排序，大结果集代价高。两分支天然不重叠（如不同日期分区）时直接 UNION ALL。',
    pitfalls: ['分支确有重叠又必须去重时，才用 UNION。']
  },
  {
    id: 'perf-014', cat: 'perf', title: '大表连接的驱动表选择',
    tags: ['驱动表', 'NESTED LOOP', 'HASH JOIN', '连接顺序'],
    level: 3,
    syntax: '小结果集驱动大表（嵌套循环+索引），两表都大用哈希连接',
    example: "-- 例：监管明细表 T_KJ_DGCKFZMX，HXJYRQ 为核心交易日期\nSELECT /*+ 示意：小结果集驱动 */\n  t.ZJLSH, d.JGMC\nFROM T_KJ_DGCKFZMX t\nJOIN T_KJ_JGXX d ON t.JGDM = d.JGDM\nWHERE t.HXJYRQ = DATE '2024-01-31';\n-- 日期先裁剪出小结果集，再回连机构维表",
    note: '先用 WHERE 把大表裁成小结果集再连接维表；执行计划中确认连接方式与基数估算是否符合预期。',
    pitfalls: ['维表过滤条件写在 WHERE 而非 ON，可能改变外连接语义。']
  },
  {
    id: 'perf-015', cat: 'perf', title: '统计信息过期与更新',
    tags: ['统计信息', 'ANALYZE', 'RUNSTATS', '优化器'],
    level: 3,
    syntax: '<更新统计信息命令> <表名>;  -- 大批量装载/清洗后必做',
    example: "-- 例：监管明细表 T_KJ_DGCKFZMX，HXJYRQ 为核心交易日期\nANALYZE TABLE T_KJ_DGCKFZMX;\n-- 每日批量装载后执行，防止优化器用过期行数估算选错计划",
    note: '优化器基于统计信息选计划。数据量剧变后统计过期，索引明明存在却不走，先更新统计再怀疑人生。',
    pitfalls: [],
    dialects: {
      db2: 'RUNSTATS ON TABLE <表> AND INDEXES ALL。',
      mysql: 'ANALYZE TABLE <表>。',
      pg: 'ANALYZE <表>；autovacuum 也会自动收集。',
      mssql: 'UPDATE STATISTICS <表>。',
      oracle: "DBMS_STATS.GATHER_TABLE_STATS('属主','表名')。"
    }
  },
  {
    id: 'perf-016', cat: 'perf', title: '只查需要的列与行',
    tags: ['SELECT *', '宽表', 'IO', '覆盖索引'],
    level: 1,
    syntax: 'SELECT <必要列> FROM <表> WHERE <过滤> FETCH FIRST <n> ROWS ONLY;',
    example: "SELECT empno, ename, sal\nFROM EMP\nWHERE deptno = 20;",
    note: 'SELECT * 多读的每一列都是 IO、内存与网络开销；宽表/大字段表尤其明显。先限量取样的习惯也能防误操作。',
    pitfalls: ['ORM 默认查全列，注意检查生成 SQL。']
  },
  {
    id: 'perf-017', cat: 'perf', title: '大批量插入优化',
    tags: ['批量插入', 'BATCH INSERT', 'LOAD', '装载'],
    level: 3,
    syntax: "INSERT INTO <表>(<列>) VALUES (...), (...), ...;  -- 多行 VALUES 或装载工具",
    example: "INSERT INTO EMP(empno, ename, job, sal, deptno) VALUES\n(9001, 'ZHANG', 'CLERK', 1100, 10),\n(9002, 'LI', 'ANALYST', 2400, 20),\n(9003, 'WANG', 'SALESMAN', 1600, 30);",
    note: '逐行 INSERT 每行一次事务/网络往返。合并多行 VALUES、批提交、或用 LOAD/COPY 装载工具，数量级提升。',
    pitfalls: ['装载期间索引与外键会拖慢速度，超大装载可先禁用后重建。'],
    dialects: {
      db2: 'LOAD FROM / IMPORT FROM 工具。',
      pg: 'COPY <表> FROM 文件 最快。',
      mssql: 'BULK INSERT / bcp。',
      oracle: 'SQL*Loader 或外部表。'
    }
  },
  {
    id: 'perf-018', cat: 'perf', title: '用临时表拆解复杂 SQL',
    tags: ['临时表', 'SQL 拆解', '中间结果', '物化'],
    level: 3,
    syntax: 'CREATE TEMPORARY TABLE <名> AS SELECT ...;  -- 分步沉淀中间结果',
    example: "-- 例：监管明细表 T_KJ_DGCKFZMX，HXJYRQ 为核心交易日期\nCREATE TEMPORARY TABLE tmp_day AS\nSELECT JGDM, COUNT(*) AS cnt, SUM(JYJE) AS amt\nFROM T_KJ_DGCKFZMX\nWHERE HXJYRQ = DATE '2024-01-31'\nGROUP BY JGDM;\n-- 后续多步加工基于 tmp_day，避免重复扫百亿大表",
    note: '多步骤加工反复引用同一过滤结果时，先物化成临时表并在其上建索引，比一条巨型 SQL 更稳更可调优。',
    pitfalls: ['临时表要及时清理；中间结果集本身也要控制规模。']
  }
];
