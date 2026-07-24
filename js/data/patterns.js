/*
 * patterns.js — 实战模板（14 条，cat='pattern'）
 * 字段规则：{id, cat, title, tags, level, syntax, example, note, pitfalls, dialects?}
 * - id：pat-001 ~ pat-014，全库唯一；title ≤20 字；note ≤120 字；
 * - pitfalls 0-3 条、每条 ≤60 字；dialects 键为 db2/mysql/pg/mssql/oracle 子集，值 ≤80 字；
 * - syntax 参数用 <尖括号> 占位；example 自洽，统一用 EMP/DEPT 示例库；
 * - 纯 ES2019，禁止 import/export、fetch 与 http(s) 字符串。
 */
window.SQLMANTRA_DATA = window.SQLMANTRA_DATA || {};
window.SQLMANTRA_DATA['patterns'] = [
  {
    id: 'pat-001', cat: 'pattern', title: '分组去重留一（ROW_NUMBER）',
    tags: ['ROW_NUMBER', '去重', 'DEDUP', '去重留一', '留一'],
    level: 2,
    syntax: 'SELECT ... FROM (SELECT ..., ROW_NUMBER() OVER (PARTITION BY <分组键> ORDER BY <优先级>) AS rn FROM <表>) t WHERE rn = 1;',
    example: "-- 分组去重留一：每个部门只保留工资最高的一行\nSELECT empno, ename, deptno, sal\nFROM (\n  SELECT empno, ename, deptno, sal,\n         ROW_NUMBER() OVER (PARTITION BY deptno ORDER BY sal DESC, empno) AS rn\n  FROM EMP\n) t\nWHERE rn = 1;",
    note: '每组按业务优先级排序后只留第一行，是数据清洗"去重留一"的标准模板。排序键要加唯一列决胜，保证结果稳定。',
    pitfalls: ['ORDER BY 不含唯一列时同值行留哪条不确定。', '勿用 GROUP BY+MAX 回连替代，多列取值易错位。']
  },
  {
    id: 'pat-002', cat: 'pattern', title: '行转列（条件聚合）',
    tags: ['PIVOT', '行转列', '条件聚合', 'CASE WHEN'],
    level: 2,
    syntax: "SELECT <分组列>, SUM(CASE WHEN <维度>=<值1> THEN <度量> END) AS <别名1>, ... FROM <表> GROUP BY <分组列>;",
    example: "SELECT deptno,\n       SUM(CASE WHEN job = 'MANAGER' THEN 1 ELSE 0 END) AS mgr_cnt,\n       SUM(CASE WHEN job = 'CLERK'   THEN 1 ELSE 0 END) AS clerk_cnt,\n       SUM(CASE WHEN job = 'ANALYST' THEN 1 ELSE 0 END) AS analyst_cnt\nFROM EMP\nGROUP BY deptno;",
    note: '把维度取值摊平成列的通用写法，五方言通吃，比专有 PIVOT 语法更灵活（可加任意过滤条件）。',
    pitfalls: ['CASE 内 ELSE 省略时未命中行为 NULL，SUM 会忽略，COUNT 不会。']
  },
  {
    id: 'pat-003', cat: 'pattern', title: '列转行（UNION ALL 展开）',
    tags: ['UNPIVOT', '列转行', '展开', '宽转长'],
    level: 2,
    syntax: "SELECT <键列>, '<列名1>' AS <维度列>, <列1> AS <值列> FROM <表> UNION ALL SELECT <键列>, '<列名2>', <列2> FROM <表>;",
    example: "SELECT empno, ename, 'SAL'  AS item, sal  AS amount FROM EMP\nUNION ALL\nSELECT empno, ename, 'COMM' AS item, comm AS amount FROM EMP;",
    note: '宽表转长表便于统一聚合与建模。UNION ALL 各分支扫描一次；部分库有 UNPIVOT 或 LATERAL 更省扫描。',
    pitfalls: ['NULL 值行是否保留要提前定口径。'],
    dialects: {
      mssql: '支持 UNPIVOT 语法。',
      oracle: '支持 UNPIVOT；11g 起可用。',
      pg: '可用 CROSS JOIN LATERAL (VALUES ...) 高效展开。'
    }
  },
  {
    id: 'pat-004', cat: 'pattern', title: '组内 Top N 报表',
    tags: ['TOP N', 'ROW_NUMBER', '组内排名', '排行榜'],
    level: 2,
    syntax: 'SELECT ... FROM (SELECT ..., ROW_NUMBER() OVER (PARTITION BY <组> ORDER BY <指标> DESC) AS rn FROM <表>) t WHERE rn <= <N>;',
    example: "SELECT deptno, ename, sal\nFROM (\n  SELECT deptno, ename, sal,\n         ROW_NUMBER() OVER (PARTITION BY deptno ORDER BY sal DESC) AS rn\n  FROM EMP\n) t\nWHERE rn <= 3\nORDER BY deptno, rn;",
    note: '各部门工资前三名这类需求的标准模板。要含并列用 RANK，并列不跳名次用 DENSE_RANK。',
    pitfalls: ['rn<=N 与 RANK<=N 语义不同：前者恒定 N 行，后者含并列。']
  },
  {
    id: 'pat-005', cat: 'pattern', title: '连续天数/连续区间统计',
    tags: ['连续', 'GAPS AND ISLANDS', '岛屿问题', '连续登录'],
    level: 3,
    syntax: '日期 - ROW_NUMBER() OVER (ORDER BY 日期) 天 => 分组键；按分组键聚合得区间',
    example: "WITH t AS (\n  SELECT empno,\n         empno - ROW_NUMBER() OVER (ORDER BY empno) AS grp\n  FROM EMP\n)\nSELECT MIN(empno) AS start_no, MAX(empno) AS end_no, COUNT(*) AS len\nFROM t\nGROUP BY grp\nORDER BY len DESC;",
    note: '有序序列减递增行号，同段连续区间内差值恒定，据此分组即得每段起止与长度。日期序列同理用日期减行号天。',
    pitfalls: ['序列有重复值需先 DISTINCT 再去算行号。']
  },
  {
    id: 'pat-006', cat: 'pattern', title: '递归 CTE 查树形层级',
    tags: ['递归', 'RECURSIVE', 'CONNECT BY', '层级查询', '树'],
    level: 3,
    syntax: 'WITH RECURSIVE cte AS (锚点 SELECT UNION ALL 递归 SELECT JOIN cte) SELECT ... FROM cte;',
    example: "WITH RECURSIVE org AS (\n  SELECT empno, ename, mgr, 1 AS lvl\n  FROM EMP WHERE mgr IS NULL\n  UNION ALL\n  SELECT e.empno, e.ename, e.mgr, o.lvl + 1\n  FROM EMP e JOIN org o ON e.mgr = o.empno\n)\nSELECT empno, ename, lvl FROM org;",
    note: '标准递归 CTE 沿 父→子 外键逐级展开机构树、BOM、上下级。锚点确定根，递归部分关联上一层结果。',
    pitfalls: ['数据有环会死循环，加深度上限或路径判重。'],
    dialects: {
      db2: 'WITH 递归需写 WITH cte(...) AS，RECURSIVE 关键字可省。',
      mysql: '8.0+ 支持 WITH RECURSIVE。',
      mssql: 'WITH cte AS，省略 RECURSIVE 关键字。',
      oracle: '支持 CONNECT BY PRIOR 子句，层级函数更丰富。'
    }
  },
  {
    id: 'pat-007', cat: 'pattern', title: '存在性打标（CASE+EXISTS）',
    tags: ['EXISTS', '打标', '标志位', 'CASE WHEN'],
    level: 2,
    syntax: "CASE WHEN EXISTS(SELECT 1 FROM <子表> WHERE <关联>) THEN 'Y' ELSE 'N' END AS <标志列>",
    example: "SELECT d.deptno, d.dname,\n       CASE WHEN EXISTS (\n         SELECT 1 FROM EMP e\n         WHERE e.deptno = d.deptno AND e.job = 'MANAGER'\n       ) THEN 'Y' ELSE 'N' END AS has_manager\nFROM DEPT d;",
    note: '给主表每行打"是否存在满足条件的子记录"标志，比先聚合再回连直观，且不会放大主表行数。',
    pitfalls: ['勿用 LEFT JOIN+COUNT 替代后忘去重，主表行数会被放大。']
  },
  {
    id: 'pat-008', cat: 'pattern', title: 'MERGE 增量同步（存在更新）',
    tags: ['MERGE', 'UPSERT', '增量同步', 'INSERT UPDATE'],
    level: 3,
    syntax: 'MERGE INTO <目标> t USING <源> s ON (<关联键>) WHEN MATCHED THEN UPDATE SET ... WHEN NOT MATCHED THEN INSERT ...;',
    example: "MERGE INTO DEPT t\nUSING (SELECT 50 AS deptno, 'NEWDEPT' AS dname, 'SHANGHAI' AS loc FROM DUAL) s\nON (t.deptno = s.deptno)\nWHEN MATCHED THEN UPDATE SET t.dname = s.dname, t.loc = s.loc\nWHEN NOT MATCHED THEN INSERT (deptno, dname, loc) VALUES (s.deptno, s.dname, s.loc);",
    note: '一条语句完成"有则更新、无则插入"，数仓增量同步标配。关联键必须有唯一约束，否则可能重复插入。',
    pitfalls: ['源侧关联键重复会导致同一目标行被更新多次或报错。'],
    dialects: {
      mysql: '无 MERGE，用 INSERT ... ON DUPLICATE KEY UPDATE。',
      pg: '15+ 支持 MERGE；此前用 INSERT ... ON CONFLICT DO UPDATE。',
      mssql: 'MERGE 语法齐全，注意并发下加 HOLDLOCK。'
    }
  },
  {
    id: 'pat-009', cat: 'pattern', title: '两表对账找差异',
    tags: ['对账', 'FULL OUTER JOIN', '差异', '核对'],
    level: 3,
    syntax: 'SELECT COALESCE(a.<键>, b.<键>) ... FROM <表A> a FULL OUTER JOIN <表B> b ON <键> WHERE a.<键> IS NULL OR b.<键> IS NULL OR <值> 不等;',
    example: "SELECT COALESCE(e.deptno, d.deptno) AS deptno,\n       CASE WHEN e.deptno IS NULL THEN '仅DEPT有'\n            WHEN d.deptno IS NULL THEN '仅EMP有'\n            ELSE '两边都有' END AS diff_type\nFROM (SELECT DISTINCT deptno FROM EMP) e\nFULL OUTER JOIN DEPT d ON e.deptno = d.deptno\nWHERE e.deptno IS NULL OR d.deptno IS NULL;",
    note: '全外连接后筛任一侧为 NULL 的行，即两边互不存在的差异；金额核对再加数值不等条件。',
    pitfalls: [],
    dialects: {
      mysql: '无 FULL OUTER JOIN，用 LEFT 差异 UNION ALL RIGHT 差异模拟。'
    }
  },
  {
    id: 'pat-010', cat: 'pattern', title: '生成连续日期序列',
    tags: ['日期序列', '递归 CTE', '日历维表', 'GENERATE_SERIES'],
    level: 3,
    syntax: 'WITH RECURSIVE d AS (SELECT <起日> AS dt UNION ALL SELECT dt + 1 天 FROM d WHERE dt < <止日>) SELECT dt FROM d;',
    example: "WITH RECURSIVE d AS (\n  SELECT DATE '1981-01-01' AS dt\n  UNION ALL\n  SELECT dt + INTERVAL 1 DAY FROM d WHERE dt < DATE '1981-01-10'\n)\nSELECT dt FROM d;",
    note: '报表需要"无数据日期也占位"时生成日历序列再 LEFT JOIN 事实表。各库还有专用生成函数。',
    pitfalls: ['递归跨度大时记得放宽递归深度限制。'],
    dialects: {
      pg: 'GENERATE_SERIES(起日, 止日, 间隔) 一行搞定。',
      mssql: 'WITH cte 递归（省略 RECURSIVE），注意 OPTION(MAXRECURSION)。',
      oracle: 'CONNECT BY LEVEL <= 天数 生成序列。'
    }
  },
  {
    id: 'pat-011', cat: 'pattern', title: '随机抽样 N 行',
    tags: ['抽样', 'RAND', 'TABLESAMPLE', '随机'],
    level: 2,
    syntax: 'SELECT ... FROM <表> ORDER BY <随机函数> FETCH FIRST <n> ROWS ONLY;',
    example: "SELECT empno, ename, sal\nFROM EMP\nORDER BY RAND()\nLIMIT 5;",
    note: '小表直接随机排序取前 N。大表先按主键 MOD/区间粗筛再抽，或用各库 TABLESAMPLE 按块采样。',
    pitfalls: ['ORDER BY RAND() 对大表是全表排序，禁用。'],
    dialects: {
      db2: 'ORDER BY RAND() FETCH FIRST n ROWS ONLY。',
      pg: 'TABLESAMPLE BERNOULLI(百分比) 或 SYSTEM。',
      mssql: 'TABLESAMPLE (n PERCENT) 或 ORDER BY NEWID()。',
      oracle: 'SAMPLE(百分比) 或 DBMS_RANDOM。'
    }
  },
  {
    id: 'pat-012', cat: 'pattern', title: '累计与占比双指标报表',
    tags: ['累计', '占比', 'SUM OVER', '报表'],
    level: 2,
    syntax: 'SUM(<度量>) OVER (ORDER BY <维度>) AS 累计；<度量>/SUM(<度量>) OVER () AS 占比',
    example: "SELECT deptno, cnt,\n       SUM(cnt) OVER (ORDER BY deptno) AS run_cnt,\n       ROUND(cnt * 100.0 / SUM(cnt) OVER (), 2) AS pct\nFROM (\n  SELECT deptno, COUNT(*) AS cnt FROM EMP GROUP BY deptno\n) s\nORDER BY deptno;",
    note: '先 GROUP BY 出维度汇总，再用窗口函数叠加累计行与占比列，一次查询出完整报表，免去多次自连。',
    pitfalls: ['整型除法先乘 100.0 转小数，否则占比恒为 0。']
  },
  {
    id: 'pat-013', cat: 'pattern', title: '最新一条记录（按时间留一）',
    tags: ['最新记录', '留一', 'ROW_NUMBER', '快照取数'],
    level: 2,
    syntax: 'ROW_NUMBER() OVER (PARTITION BY <主体键> ORDER BY <时间列> DESC) = 1',
    example: "SELECT empno, ename, sal, hiredate\nFROM (\n  SELECT empno, ename, sal, hiredate,\n         ROW_NUMBER() OVER (PARTITION BY deptno ORDER BY hiredate DESC, empno DESC) AS rn\n  FROM EMP\n) t\nWHERE rn = 1;",
    note: '快照表/流水表取每主体最新一条的固定套路，本质是"分组去重留一"以时间倒序为优先级。',
    pitfalls: ['时间列精度不足导致并列时，加唯一键二次排序。']
  },
  {
    id: 'pat-014', cat: 'pattern', title: '多条件可选过滤',
    tags: ['动态条件', '可选过滤', '参数化', '动态 SQL'],
    level: 2,
    syntax: 'WHERE (<参数> IS NULL OR <列> = <参数>);',
    example: "SELECT ename, job, deptno\nFROM EMP\nWHERE (:p_job IS NULL OR job = :p_job)\n  AND (:p_deptno IS NULL OR deptno = :p_deptno);",
    note: '报表多筛选项"不填即不过滤"的静态 SQL 写法。条件组合爆炸时应改动态拼接，只生成有效谓词。',
    pitfalls: ['OR 参数 IS NULL 会阻碍索引使用，高并发场景慎用。']
  }
];
