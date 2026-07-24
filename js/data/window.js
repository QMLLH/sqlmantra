/*
 * window.js — 窗口函数（16 条，cat='window'）
 * 字段规则：{id, cat, title, tags, level, syntax, example, note, pitfalls, dialects?}
 * - id：win-001 ~ win-016，全库唯一；win-003 为 URL 直达验收锚点；title ≤20 字；note ≤120 字；
 * - pitfalls 0-3 条、每条 ≤60 字；dialects 键为 db2/mysql/pg/mssql/oracle 子集，值 ≤80 字；
 * - syntax 参数用 <尖括号> 占位；example 自洽，统一用 EMP/DEPT 示例库；
 * - 纯 ES2019，禁止 import/export、fetch 与 http(s) 字符串。
 */
window.SQLMANTRA_DATA = window.SQLMANTRA_DATA || {};
window.SQLMANTRA_DATA['window'] = [
  {
    id: 'win-001', cat: 'window', title: 'OVER 窗口函数基础',
    tags: ['OVER', '窗口函数', 'PARTITION BY'],
    level: 2,
    syntax: '<窗口函数>(<列>) OVER (PARTITION BY <分组列> ORDER BY <排序列>);',
    example: "SELECT ename, deptno, sal,\n       AVG(sal) OVER (PARTITION BY deptno) AS dept_avg\nFROM EMP;",
    note: '窗口函数在保留每行的同时做分组计算，不像 GROUP BY 会折叠行。PARTITION BY 划组，ORDER BY 定序定帧。',
    pitfalls: ['窗口函数不能直接写在 WHERE 中，需套子查询过滤。']
  },
  {
    id: 'win-002', cat: 'window', title: 'ROW_NUMBER 组内编号',
    tags: ['ROW_NUMBER', '编号', '排名', 'TOP N'],
    level: 2,
    syntax: 'ROW_NUMBER() OVER (PARTITION BY <分组列> ORDER BY <排序列> [DESC]);',
    example: "SELECT ename, deptno, sal,\n       ROW_NUMBER() OVER (PARTITION BY deptno ORDER BY sal DESC) AS rn\nFROM EMP;",
    note: '组内从 1 开始连续编号，同值也给不同序号。去重留一、组内 TopN 的核心工具。',
    pitfalls: ['同值行编号顺序不确定，需加唯一列做决胜排序。']
  },
  {
    id: 'win-003', cat: 'window', title: 'LAG / LEAD 取前后行',
    tags: ['LAG', 'LEAD', '前一行', '环比', '偏移'],
    level: 2,
    syntax: 'LAG(<列>, <偏移量>, <默认值>) OVER (ORDER BY <排序列>);',
    example: "SELECT ename, sal,\n       LAG(sal) OVER (ORDER BY sal DESC) AS prev_sal,\n       LEAD(sal) OVER (ORDER BY sal DESC) AS next_sal\nFROM EMP;",
    note: '按窗口排序取当前行前 N 行（LAG）或后 N 行（LEAD）的值，算环比、差分、相邻间隔必用。',
    pitfalls: ['越界行返回 NULL 或指定默认值。', '偏移量省略时默认 1。']
  },
  {
    id: 'win-004', cat: 'window', title: 'RANK 与 DENSE_RANK',
    tags: ['RANK', 'DENSE_RANK', '排名', '并列'],
    level: 2,
    syntax: 'RANK() OVER (ORDER BY <排序列> DESC);',
    example: "SELECT ename, sal,\n       RANK() OVER (ORDER BY sal DESC) AS rnk,\n       DENSE_RANK() OVER (ORDER BY sal DESC) AS drnk\nFROM EMP;",
    note: '同值并列：RANK 跳名次（1,1,3），DENSE_RANK 不跳（1,1,2）。按业务口径选并列后的编号规则。',
    pitfalls: ['报表"前几名"若需含并列，用 DENSE_RANK 过滤更稳。']
  },
  {
    id: 'win-005', cat: 'window', title: 'SUM OVER 累计求和',
    tags: ['SUM OVER', '累计', 'RUNNING TOTAL'],
    level: 2,
    syntax: 'SUM(<列>) OVER (ORDER BY <排序列> ROWS UNBOUNDED PRECEDING);',
    example: "SELECT ename, hiredate, sal,\n       SUM(sal) OVER (ORDER BY hiredate\n                      ROWS UNBOUNDED PRECEDING) AS run_total\nFROM EMP;",
    note: '按序累计到当前行的合计。显式写 ROWS UNBOUNDED PRECEDING 避免默认 RANGE 帧把同值行合并累计。',
    pitfalls: ['只写 ORDER BY 时默认 RANGE 帧，同值行累计会一起跳。']
  },
  {
    id: 'win-006', cat: 'window', title: 'AVG OVER 移动平均',
    tags: ['AVG OVER', '移动平均', '滑动窗口'],
    level: 2,
    syntax: 'AVG(<列>) OVER (ORDER BY <排序列> ROWS BETWEEN <n> PRECEDING AND CURRENT ROW);',
    example: "SELECT ename, sal,\n       AVG(sal) OVER (ORDER BY empno\n                      ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) AS ma3\nFROM EMP;",
    note: '用固定行数的滑动窗口平滑波动，如近 3 期均值。窗口帧按 ROWS 数行，与值无关，语义稳定。',
    pitfalls: ['序列开头不足 n 行时按现有行平均。']
  },
  {
    id: 'win-007', cat: 'window', title: '组内占比计算',
    tags: ['占比', 'RATIO', 'SUM OVER'],
    level: 2,
    syntax: '<列> * 1.0 / SUM(<列>) OVER (PARTITION BY <分组列>)',
    example: "SELECT ename, deptno, sal,\n       ROUND(sal * 100.0 / SUM(sal) OVER (PARTITION BY deptno), 2) AS pct\nFROM EMP;",
    note: '窗口 SUM 算组内合计，再逐行求占比，无需先聚合再回连。乘 1.0 防整型除法截断。',
    pitfalls: ['整型相除在部分库会取整，先转小数。']
  },
  {
    id: 'win-008', cat: 'window', title: '取组内首行与末行值',
    tags: ['FIRST_VALUE', 'LAST_VALUE', '首行', '末行'],
    level: 3,
    syntax: 'FIRST_VALUE(<列>) OVER (PARTITION BY <分组列> ORDER BY <排序列>);',
    example: "SELECT ename, deptno, sal,\n       FIRST_VALUE(ename) OVER (PARTITION BY deptno ORDER BY sal DESC) AS top_emp\nFROM EMP;",
    note: '取组内排序后的首行/末行值并贴到每一行。LAST_VALUE 需显式帧 ROWS UNBOUNDED FOLLOWING 才真到最后。',
    pitfalls: ['LAST_VALUE 默认帧只到当前行，结果常等于当前行值。']
  },
  {
    id: 'win-009', cat: 'window', title: 'NTILE 均匀分桶',
    tags: ['NTILE', '分桶', '分位数'],
    level: 2,
    syntax: 'NTILE(<n>) OVER (ORDER BY <排序列>);',
    example: "SELECT ename, sal,\n       NTILE(4) OVER (ORDER BY sal DESC) AS quartile\nFROM EMP;",
    note: '把有序行尽量均匀地切成 n 桶，用于四分位、十分位分层或把大任务切成并行批次。',
    pitfalls: ['行数不能整除时，靠前的桶多一行。']
  },
  {
    id: 'win-010', cat: 'window', title: '窗口帧 ROWS 与 RANGE',
    tags: ['ROWS', 'RANGE', 'UNBOUNDED PRECEDING', '窗口帧'],
    level: 3,
    syntax: 'OVER (ORDER BY <列> ROWS|RANGE BETWEEN <起点> AND <终点>);',
    example: "SELECT ename, sal,\n       SUM(sal) OVER (ORDER BY sal\n                      ROWS BETWEEN 1 PRECEDING AND 1 FOLLOWING) AS near_sum\nFROM EMP;",
    note: 'ROWS 按物理行数取帧；RANGE 按值差取帧（同值行同进同出）。默认帧是 RANGE 起点到当前行。',
    pitfalls: ['RANGE 配数值差需排序列可加减，日期列各库支持不一。']
  },
  {
    id: 'win-011', cat: 'window', title: '组内取 Top N',
    tags: ['TOP N', 'ROW_NUMBER', '组内排名'],
    level: 2,
    syntax: 'SELECT * FROM (SELECT ..., ROW_NUMBER() OVER (...) AS rn FROM <表>) t WHERE rn <= <n>;',
    example: "SELECT ename, deptno, sal\nFROM (\n  SELECT ename, deptno, sal,\n         ROW_NUMBER() OVER (PARTITION BY deptno ORDER BY sal DESC) AS rn\n  FROM EMP\n) t\nWHERE rn <= 2;",
    note: '每个分组各取前 N 行的标准模板：窗口编号后外层过滤。比相关子查询逐组取快得多。',
    pitfalls: ['并列需全部保留时改用 RANK/DENSE_RANK 过滤。']
  },
  {
    id: 'win-012', cat: 'window', title: '同比与环比计算',
    tags: ['同比', '环比', 'LAG', '增长率'],
    level: 2,
    syntax: '(<本期> - LAG(<本期>) OVER (...)) / LAG(<本期>) OVER (...);',
    example: "WITH m AS (\n  SELECT deptno, COUNT(*) AS cnt\n  FROM EMP GROUP BY deptno\n)\nSELECT deptno, cnt,\n       cnt - LAG(cnt) OVER (ORDER BY deptno) AS diff_prev\nFROM m;",
    note: '先用 GROUP BY 得到期间汇总，再用 LAG 取上期值做差或除。窗口函数用在聚合结果之上。',
    pitfalls: ['上期为 0 或 NULL 时先 NULLIF/COALESCE 保护除法。']
  },
  {
    id: 'win-013', cat: 'window', title: '窗口最大最小值不折叠行',
    tags: ['MAX OVER', 'MIN OVER', '极值'],
    level: 2,
    syntax: 'MAX(<列>) OVER (PARTITION BY <分组列>);',
    example: "SELECT ename, deptno, sal,\n       MAX(sal) OVER (PARTITION BY deptno) AS dept_max,\n       sal - MAX(sal) OVER (PARTITION BY deptno) AS gap_to_max\nFROM EMP;",
    note: '想同时看到明细行和组内极值时用窗口 MAX/MIN，免去先聚合再回连的两次扫描。',
    pitfalls: []
  },
  {
    id: 'win-014', cat: 'window', title: '分布排名与百分位',
    tags: ['CUME_DIST', 'PERCENT_RANK', '百分位'],
    level: 3,
    syntax: 'CUME_DIST() OVER (ORDER BY <排序列>);',
    example: "SELECT ename, sal,\n       ROUND(CUME_DIST() OVER (ORDER BY sal), 3) AS cume,\n       ROUND(PERCENT_RANK() OVER (ORDER BY sal), 3) AS prank\nFROM EMP;",
    note: 'CUME_DIST：不大于当前值的行占比（含当前）；PERCENT_RANK：(rank-1)/(总行数-1)。做分位定位与评分。',
    pitfalls: ['两者对首行取值不同：CUME_DIST>0，PERCENT_RANK=0。']
  },
  {
    id: 'win-015', cat: 'window', title: '窗口函数与执行顺序',
    tags: ['执行顺序', 'QUALIFY', '窗口过滤'],
    level: 3,
    syntax: '窗口函数在 SELECT/ORDER BY 阶段求值，WHERE 之后；过滤窗口结果需子查询或 QUALIFY',
    example: "SELECT ename, deptno, sal\nFROM (\n  SELECT ename, deptno, sal,\n         RANK() OVER (PARTITION BY deptno ORDER BY sal DESC) AS rnk\n  FROM EMP\n) t\nWHERE rnk = 1;",
    note: 'WHERE 早于窗口求值，故不能直接引用窗口结果。标准做法是子查询包一层；部分库提供 QUALIFY 简写。',
    pitfalls: [],
    dialects: {
      pg: '不支持 QUALIFY，需子查询过滤。',
      mysql: '不支持 QUALIFY，需子查询过滤。',
      oracle: '不支持 QUALIFY，需子查询过滤。'
    }
  },
  {
    id: 'win-016', cat: 'window', title: '连续区间判定（岛屿问题）',
    tags: ['GAPS AND ISLANDS', '连续区间', 'ROW_NUMBER 差值'],
    level: 3,
    syntax: '键 - ROW_NUMBER() OVER (ORDER BY 键) 相同 => 同一段连续区间',
    example: "WITH t AS (\n  SELECT empno,\n         empno - ROW_NUMBER() OVER (ORDER BY empno) AS grp\n  FROM EMP\n)\nSELECT MIN(empno) AS start_no, MAX(empno) AS end_no, COUNT(*) AS len\nFROM t\nGROUP BY grp;",
    note: '有序键与行号之差在同一连续段内恒定，据此分组即可合并连续区间。断号检测、连续天数统计通用。',
    pitfalls: ['日期序列用日期减行号天数构造分组键。']
  }
];
