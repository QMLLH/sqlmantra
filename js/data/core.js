/*
 * core.js — 查询基础 / 聚合分组 / 条件逻辑 / NULL 专题（24 条，cat='core'）
 * 字段规则：{id, cat, title, tags, level, syntax, example, note, pitfalls, dialects?}
 * - id：core-001 ~ core-024，全库唯一；title ≤20 字；note ≤120 字；
 * - pitfalls 0-3 条、每条 ≤60 字；dialects 键为 db2/mysql/pg/mssql/oracle 子集，值 ≤80 字，无差异则省略；
 * - syntax 参数用 <尖括号> 占位；example 自洽，统一用 EMP/DEPT 示例库；
 * - 纯 ES2019，禁止 import/export、fetch 与 http(s) 字符串。
 */
window.SQLMANTRA_DATA = window.SQLMANTRA_DATA || {};
window.SQLMANTRA_DATA['core'] = [
  {
    id: 'core-001', cat: 'core', title: 'SELECT 基础查询',
    tags: ['SELECT', '基础查询', '列选择'],
    level: 1,
    syntax: 'SELECT <列1, 列2, ...> FROM <表名>;',
    example: "SELECT empno, ename, job, sal\nFROM EMP;",
    note: '从表中读取指定列，是一切查询的起点。生产环境按需取列，避免 SELECT * 拉宽结果集。',
    pitfalls: ['SELECT * 会多读无用列，放大 IO 与网络开销。']
  },
  {
    id: 'core-002', cat: 'core', title: 'WHERE 条件过滤',
    tags: ['WHERE', '过滤', '条件'],
    level: 1,
    syntax: 'SELECT <列> FROM <表名> WHERE <条件>;',
    example: "SELECT ename, sal\nFROM EMP\nWHERE deptno = 20 AND sal > 2000;",
    note: '行级过滤在查询最早期执行，条件越精确，后续处理的数据越少。多条件用 AND/OR 组合。',
    pitfalls: ['OR 优先级低于 AND，混合使用时务必加括号。']
  },
  {
    id: 'core-003', cat: 'core', title: 'ORDER BY 排序',
    tags: ['ORDER BY', '排序', 'ASC', 'DESC'],
    level: 1,
    syntax: 'SELECT <列> FROM <表名> ORDER BY <列> [ASC|DESC], <列2> ...;',
    example: "SELECT ename, hiredate, sal\nFROM EMP\nORDER BY deptno ASC, sal DESC;",
    note: '多列排序时先按前列、同值再按后列。无 ORDER BY 的结果顺序不保证，分页查询必须显式排序。',
    pitfalls: ['排序大结果集消耗内存/临时表，配合 LIMIT 或索引使用。']
  },
  {
    id: 'core-004', cat: 'core', title: 'DISTINCT 结果去重',
    tags: ['DISTINCT', '去重', '唯一值'],
    level: 1,
    syntax: 'SELECT DISTINCT <列1, 列2> FROM <表名>;',
    example: "SELECT DISTINCT job\nFROM EMP;",
    note: '对整行选定列的组合去重。只想看有哪些取值时用；需要"留一条完整行"请用 ROW_NUMBER 去重留一模板。',
    pitfalls: ['DISTINCT 多列是组合去重，不是只按第一列。', '大结果集 DISTINCT 会触发排序或哈希，成本不低。']
  },
  {
    id: 'core-005', cat: 'core', title: 'AND / OR / NOT 逻辑运算',
    tags: ['AND', 'OR', 'NOT', '逻辑运算', '优先级'],
    level: 1,
    syntax: 'WHERE <条件1> AND (<条件2> OR <条件3>);',
    example: "SELECT ename, job, sal\nFROM EMP\nWHERE deptno = 10\n  AND (job = 'MANAGER' OR sal > 3000);",
    note: '组合多个过滤条件。优先级 NOT > AND > OR，混合书写一律加括号，避免语义漂移。',
    pitfalls: ['NOT 遇上 NULL 结果仍为 UNKNOWN，不会命中该行。']
  },
  {
    id: 'core-006', cat: 'core', title: 'IN 与 NOT IN 列表匹配',
    tags: ['IN', 'NOT IN', '列表', '集合匹配'],
    level: 1,
    syntax: 'WHERE <列> IN (<值1, 值2, ...>);',
    example: "SELECT ename, deptno\nFROM EMP\nWHERE deptno IN (10, 20, 30);",
    note: '匹配离散取值列表，比一串 OR 简洁。子查询场景大表过滤优先考虑 EXISTS 改写，见性能分类。',
    pitfalls: ['NOT IN 列表含 NULL 会导致零命中，见性能分类专题。']
  },
  {
    id: 'core-007', cat: 'core', title: 'BETWEEN 范围过滤',
    tags: ['BETWEEN', '范围', '闭区间'],
    level: 1,
    syntax: 'WHERE <列> BETWEEN <下界> AND <上界>;',
    example: "SELECT ename, sal\nFROM EMP\nWHERE sal BETWEEN 1500 AND 3000;",
    note: '闭区间 [下界, 上界]，两端都包含。日期范围更推荐 >= 起点 AND < 次日 的半开写法，避免时分秒漏数。',
    pitfalls: ['BETWEEN 含边界，日期带时间分量时容易漏掉上界当天。']
  },
  {
    id: 'core-008', cat: 'core', title: 'LIKE 模糊匹配',
    tags: ['LIKE', '模糊查询', '通配符', 'ESCAPE'],
    level: 1,
    syntax: "WHERE <列> LIKE '<模式>';  -- % 任意串，_ 单字符",
    example: "SELECT ename, job\nFROM EMP\nWHERE ename LIKE 'S%';",
    note: '前缀匹配（如 S%）可走索引；前导通配（%S）必然全表扫描。匹配字面 % 或 _ 用 ESCAPE 声明转义符。',
    pitfalls: ["WHERE ename LIKE '%S' 无法使用普通 B-Tree 索引。"]
  },
  {
    id: 'core-009', cat: 'core', title: 'IS NULL 空值判断',
    tags: ['IS NULL', 'IS NOT NULL', '空值判断'],
    level: 1,
    syntax: 'WHERE <列> IS NULL;   -- 或 IS NOT NULL',
    example: "SELECT ename, comm\nFROM EMP\nWHERE comm IS NULL;",
    note: '判断空值只能用 IS NULL / IS NOT NULL。= NULL 永远得到 UNKNOWN，一行也查不出来。',
    pitfalls: ['= NULL 不报错但恒为假，是最常见的隐形 Bug。']
  },
  {
    id: 'core-010', cat: 'core', title: 'COUNT 计数的三种写法',
    tags: ['COUNT', '计数', '行数'],
    level: 2,
    syntax: 'SELECT COUNT(*) | COUNT(<列>) | COUNT(DISTINCT <列>) FROM <表名>;',
    example: "SELECT COUNT(*) AS total,\n       COUNT(comm) AS has_comm,\n       COUNT(DISTINCT job) AS job_kinds\nFROM EMP;",
    note: 'COUNT(*) 计全部行；COUNT(列) 跳过 NULL；COUNT(DISTINCT 列) 计去重取值。按需求选对语义。',
    pitfalls: ['把 COUNT(列) 当行数用，遇 NULL 会少数。']
  },
  {
    id: 'core-011', cat: 'core', title: 'SUM/AVG/MAX/MIN 聚合',
    tags: ['SUM', 'AVG', 'MAX', 'MIN', '聚合函数'],
    level: 1,
    syntax: 'SELECT SUM(<列>), AVG(<列>), MAX(<列>), MIN(<列>) FROM <表名>;',
    example: "SELECT SUM(sal) AS total_sal,\n       AVG(sal) AS avg_sal,\n       MAX(sal) AS max_sal,\n       MIN(sal) AS min_sal\nFROM EMP;",
    note: '聚合函数忽略 NULL。AVG 用非 NULL 行数做分母，含 NULL 的均值口径要特别注意。',
    pitfalls: ['整型列 AVG 在部分库返回整型，需要小数请转 DECIMAL。']
  },
  {
    id: 'core-012', cat: 'core', title: 'GROUP BY 分组聚合',
    tags: ['GROUP BY', '分组', '聚合'],
    level: 1,
    syntax: 'SELECT <分组列>, <聚合函数>(<列>) FROM <表名> GROUP BY <分组列>;',
    example: "SELECT deptno, COUNT(*) AS cnt, AVG(sal) AS avg_sal\nFROM EMP\nGROUP BY deptno;",
    note: '按分组列把行折叠成一行。SELECT 中出现的非聚合列必须出现在 GROUP BY 中。',
    pitfalls: ['SELECT 未分组也未聚合的列，MySQL 宽松模式能跑但结果随机。']
  },
  {
    id: 'core-013', cat: 'core', title: 'HAVING 分组后过滤',
    tags: ['HAVING', '分组过滤', '聚合条件'],
    level: 2,
    syntax: 'SELECT <分组列>, <聚合> FROM <表名> GROUP BY <分组列> HAVING <聚合条件>;',
    example: "SELECT deptno, AVG(sal) AS avg_sal\nFROM EMP\nGROUP BY deptno\nHAVING AVG(sal) > 2500;",
    note: 'WHERE 在分组前过滤行，HAVING 在分组后过滤组。能用 WHERE 的条件不要放进 HAVING，先缩小再聚合更快。',
    pitfalls: ['HAVING 不能引用 SELECT 中定义的列别名（部分库除外）。']
  },
  {
    id: 'core-014', cat: 'core', title: 'CASE WHEN 条件分支',
    tags: ['CASE', 'WHEN', '条件分支', '行转列'],
    level: 2,
    syntax: "CASE WHEN <条件1> THEN <值1> WHEN <条件2> THEN <值2> ELSE <默认值> END",
    example: "SELECT ename, sal,\n       CASE WHEN sal >= 3000 THEN '高'\n            WHEN sal >= 1500 THEN '中'\n            ELSE '低' END AS sal_level\nFROM EMP;",
    note: '行内条件逻辑，自上而下取第一个命中的 WHEN。可用于 SELECT、WHERE、ORDER BY 与聚合内部。',
    pitfalls: ['省略 ELSE 时未命中返回 NULL。', '各 THEN 返回值类型应一致，避免隐式转换。']
  },
  {
    id: 'core-015', cat: 'core', title: 'COALESCE 空值替换',
    tags: ['COALESCE', 'NVL', 'ISNULL', '空值替换'],
    level: 1,
    syntax: 'COALESCE(<表达式1>, <表达式2>, ..., <默认值>)',
    example: "SELECT ename, COALESCE(comm, 0) AS comm2\nFROM EMP;",
    note: '返回第一个非 NULL 参数，标准 SQL 五方言通用。空值兜底、计算前置零的首选写法。',
    pitfalls: [],
    dialects: {
      mysql: '也可用 IFNULL(列, 默认值)，仅两个参数。',
      mssql: 'ISNULL(列, 默认值) 两参数；COALESCE 更通用。',
      oracle: 'NVL(列, 默认值) 两参数；NVL2 可区分空/非空。'
    }
  },
  {
    id: 'core-016', cat: 'core', title: 'NULLIF 相等则置空',
    tags: ['NULLIF', '置空', '除零保护'],
    level: 2,
    syntax: 'NULLIF(<表达式1>, <表达式2>)',
    example: "SELECT ename,\n       sal / NULLIF(comm, 0) AS ratio\nFROM EMP;",
    note: '两表达式相等时返回 NULL，否则返回表达式1。常与 COALESCE 互逆使用，也是防除零的经典技巧。',
    pitfalls: []
  },
  {
    id: 'core-017', cat: 'core', title: 'NULL 参与运算的结果',
    tags: ['NULL', '运算', '传播'],
    level: 2,
    syntax: '<任意值> + NULL  =>  NULL；<任意值> || NULL  =>  NULL',
    example: "SELECT ename, sal + comm AS income\nFROM EMP;\n-- comm 为 NULL 的行 income 也是 NULL\n-- 改法：sal + COALESCE(comm, 0)",
    note: 'NULL 在算术、比较、拼接中都会"传染"结果为 NULL。涉及可空列的计算先 COALESCE 兜底。',
    pitfalls: ['sal + comm 这种写法会让无提成员工总收入变 NULL。']
  },
  {
    id: 'core-018', cat: 'core', title: 'NULL 与三值逻辑',
    tags: ['NULL', '三值逻辑', 'UNKNOWN'],
    level: 2,
    syntax: 'WHERE 条件结果 ∈ {TRUE, FALSE, UNKNOWN}，仅 TRUE 的行被保留',
    example: "SELECT ename\nFROM EMP\nWHERE NOT (comm > 400);\n-- comm 为 NULL 的行：comm > 400 是 UNKNOWN，NOT UNKNOWN 仍是 UNKNOWN，被过滤",
    note: 'SQL 逻辑有 TRUE/FALSE/UNKNOWN 三值，NULL 比较得 UNKNOWN，WHERE 只放行 TRUE。排查"少数据"先看 NULL。',
    pitfalls: ['NOT IN、NOT 等否定写法叠加 NULL 最容易出现结果偏少。']
  },
  {
    id: 'core-019', cat: 'core', title: '聚合函数与 NULL 的关系',
    tags: ['NULL', '聚合', 'COUNT', 'AVG'],
    level: 2,
    syntax: '聚合函数忽略 NULL；全为 NULL 时 SUM/AVG 返回 NULL，COUNT 返回 0',
    example: "SELECT COUNT(*) AS rows_all,\n       COUNT(comm) AS rows_comm,\n       AVG(COALESCE(comm, 0)) AS avg_comm_fill\nFROM EMP;",
    note: 'SUM/AVG/MAX/MIN 跳过 NULL；想按 0 参与计算需显式 COALESCE。空集上聚合返回 NULL 而非 0。',
    pitfalls: ['AVG(列) 与 SUM(列)/COUNT(*) 分母不同，口径要说清。']
  },
  {
    id: 'core-020', cat: 'core', title: '子查询（标量与 IN）',
    tags: ['子查询', 'SUBQUERY', '标量子查询'],
    level: 2,
    syntax: "WHERE <列> = (SELECT <单列> FROM <表> WHERE ...);",
    example: "SELECT ename, sal\nFROM EMP\nWHERE sal > (SELECT AVG(sal) FROM EMP);",
    note: '子查询嵌在 WHERE/SELECT 中。标量子查询必须只返回一行一列，否则报错；行数不确定时用 IN 或 JOIN。',
    pitfalls: ['标量子查询返回多行会直接报错，先确认唯一性。']
  },
  {
    id: 'core-021', cat: 'core', title: 'EXISTS 存在性判断',
    tags: ['EXISTS', '相关子查询', '半连接'],
    level: 2,
    syntax: 'WHERE EXISTS (SELECT 1 FROM <表2> WHERE <关联条件>);',
    example: "SELECT d.dname\nFROM DEPT d\nWHERE EXISTS (\n  SELECT 1 FROM EMP e\n  WHERE e.deptno = d.deptno\n);",
    note: '只判断"是否存在"，找到一行即停。大表关联过滤通常比 IN 更稳，也不会受 NULL 干扰。',
    pitfalls: ['EXISTS 子查询里 SELECT 什么不重要，写 SELECT 1 即可。']
  },
  {
    id: 'core-022', cat: 'core', title: 'WITH 公共表表达式',
    tags: ['WITH', 'CTE', '公共表表达式'],
    level: 2,
    syntax: 'WITH <名> AS (SELECT ...) SELECT ... FROM <名>;',
    example: "WITH dept_stat AS (\n  SELECT deptno, AVG(sal) AS avg_sal\n  FROM EMP GROUP BY deptno\n)\nSELECT e.ename, e.sal, s.avg_sal\nFROM EMP e\nJOIN dept_stat s ON e.deptno = s.deptno;",
    note: '把复杂查询拆成命名步骤，可读性与可维护性远胜多层嵌套子查询，也可被多处引用。',
    pitfalls: ['部分库 CTE 会被物化或内联，性能以执行计划为准。']
  },
  {
    id: 'core-023', cat: 'core', title: '列别名与派生列',
    tags: ['AS', '别名', '派生列'],
    level: 1,
    syntax: 'SELECT <表达式> AS <别名> FROM <表名>;',
    example: "SELECT ename,\n       sal * 12 AS year_sal\nFROM EMP\nORDER BY year_sal DESC;",
    note: '给计算列起可读名字，供前端与报表引用。ORDER BY 可用别名，WHERE 不行（逻辑执行顺序更早）。',
    pitfalls: ['WHERE 中引用 SELECT 别名在多数库报错，需重复表达式或用子查询。']
  },
  {
    id: 'core-024', cat: 'core', title: 'SELECT 逻辑执行顺序',
    tags: ['执行顺序', 'FROM', 'WHERE', 'SELECT'],
    level: 2,
    syntax: 'FROM → JOIN/ON → WHERE → GROUP BY → HAVING → SELECT → DISTINCT → ORDER BY → LIMIT',
    example: "SELECT deptno, COUNT(*) AS cnt\nFROM EMP\nWHERE sal > 1000\nGROUP BY deptno\nHAVING COUNT(*) >= 2\nORDER BY cnt DESC;",
    note: '理解逻辑顺序能解释：WHERE 不能用 SELECT 别名、HAVING 能看到聚合结果、ON 与 WHERE 对外连接的不同。',
    pitfalls: ['把过滤条件从 ON 挪到 WHERE，会把 LEFT JOIN 变成 INNER JOIN。']
  }
];
