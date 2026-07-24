/*
 * join.js — 连接与集合（12 条，cat='join'）
 * 字段规则：{id, cat, title, tags, level, syntax, example, note, pitfalls, dialects?}
 * - id：join-001 ~ join-012，全库唯一；title ≤20 字；note ≤120 字；
 * - pitfalls 0-3 条、每条 ≤60 字；dialects 键为 db2/mysql/pg/mssql/oracle 子集，值 ≤80 字；
 * - INNER/LEFT/RIGHT/FULL/CROSS 五条带 viz 字段：'inner'/'left'/'right'/'full'/'cross'，骨架据此渲染 SVG 示意图；
 * - syntax 参数用 <尖括号> 占位；example 自洽，统一用 EMP/DEPT 示例库；
 * - 纯 ES2019，禁止 import/export、fetch 与 http(s) 字符串。
 */
window.SQLMANTRA_DATA = window.SQLMANTRA_DATA || {};
window.SQLMANTRA_DATA['join'] = [
  {
    id: 'join-001', cat: 'join', title: 'INNER JOIN 内连接',
    tags: ['INNER JOIN', '内连接', '等值连接'],
    level: 1,
    viz: 'inner',
    syntax: 'SELECT ... FROM <表A> a INNER JOIN <表B> b ON a.<键> = b.<键>;',
    example: "SELECT e.ename, d.dname\nFROM EMP e\nINNER JOIN DEPT d ON e.deptno = d.deptno;",
    note: '只保留两表键值匹配的行，任一表无匹配即丢弃。维恩图：仅交集。最常用的连接方式。',
    pitfalls: ['关联键含 NULL 的行永远不会匹配。']
  },
  {
    id: 'join-002', cat: 'join', title: 'LEFT JOIN 左外连接',
    tags: ['LEFT JOIN', '左连接', '外连接'],
    level: 1,
    viz: 'left',
    syntax: 'SELECT ... FROM <表A> a LEFT JOIN <表B> b ON a.<键> = b.<键>;',
    example: "SELECT e.ename, d.dname\nFROM EMP e\nLEFT JOIN DEPT d ON e.deptno = d.deptno;",
    note: 'A 表全保留，B 表无匹配补 NULL。主表留全量、附表取补充信息时使用。维恩图：A 整圆 + 交集。',
    pitfalls: ['WHERE 中对右表列加等值条件会把 LEFT 退化成 INNER。', '右表一对多时会放大左表行数。']
  },
  {
    id: 'join-003', cat: 'join', title: 'RIGHT JOIN 右外连接',
    tags: ['RIGHT JOIN', '右连接', '外连接'],
    level: 1,
    viz: 'right',
    syntax: 'SELECT ... FROM <表A> a RIGHT JOIN <表B> b ON a.<键> = b.<键>;',
    example: "SELECT e.ename, d.dname\nFROM EMP e\nRIGHT JOIN DEPT d ON e.deptno = d.deptno;",
    note: 'B 表全保留，A 表无匹配补 NULL，与交换表序的 LEFT JOIN 等价。维恩图：B 整圆 + 交集。团队规范常统一用 LEFT。',
    pitfalls: ['与 LEFT 混用易读性差，建议统一方向。']
  },
  {
    id: 'join-004', cat: 'join', title: 'FULL OUTER JOIN 全外连接',
    tags: ['FULL OUTER JOIN', '全连接', '对账'],
    level: 2,
    viz: 'full',
    syntax: 'SELECT ... FROM <表A> a FULL OUTER JOIN <表B> b ON a.<键> = b.<键>;',
    example: "SELECT e.ename, d.dname\nFROM EMP e\nFULL OUTER JOIN DEPT d ON e.deptno = d.deptno;",
    note: '两表全保留，无匹配侧补 NULL，维恩图：两圆全部。两侧对账、找差异行的利器。',
    pitfalls: [],
    dialects: {
      mysql: '不支持 FULL OUTER JOIN，用 LEFT JOIN ... UNION ALL 右表反连接模拟。'
    }
  },
  {
    id: 'join-005', cat: 'join', title: 'CROSS JOIN 交叉连接',
    tags: ['CROSS JOIN', '笛卡尔积', '交叉连接'],
    level: 2,
    viz: 'cross',
    syntax: 'SELECT ... FROM <表A> CROSS JOIN <表B>;',
    example: "SELECT e.ename, d.dname\nFROM EMP e CROSS JOIN DEPT d\nWHERE d.deptno = 10;",
    note: '生成 m×n 的笛卡尔积，示意图用 3×3 点阵表示。常用于生成组合维度（日期×网点）或与单行维度表配对。',
    pitfalls: ['忘写 ON 条件的 JOIN 在老语法里会退化成笛卡尔积。', '大表交叉连接行数爆炸，务必确认规模。']
  },
  {
    id: 'join-006', cat: 'join', title: '自连接 SELF JOIN',
    tags: ['SELF JOIN', '自连接', '上下级'],
    level: 2,
    syntax: 'SELECT ... FROM <表> a JOIN <表> b ON a.<外键> = b.<主键>;',
    example: "SELECT e.ename AS emp, m.ename AS manager\nFROM EMP e\nLEFT JOIN EMP m ON e.mgr = m.empno;",
    note: '同一张表起两个别名互连，处理行与行之间的关系：员工-上级、前后记录、层级数据。',
    pitfalls: ['顶层节点 mgr 为 NULL，需 LEFT JOIN 保留。']
  },
  {
    id: 'join-007', cat: 'join', title: '多表连接顺序与括号',
    tags: ['多表连接', 'JOIN 顺序', '驱动表'],
    level: 2,
    syntax: 'FROM <表A> a JOIN <表B> b ON ... LEFT JOIN <表C> c ON ...;',
    example: "SELECT e.ename, d.dname, d.loc\nFROM EMP e\nJOIN DEPT d ON e.deptno = d.deptno\nLEFT JOIN EMP m ON e.mgr = m.empno;",
    note: '逻辑上按书写顺序逐表连接。外连接混用时用括号明确结合顺序；优化器会重排内连接，但外连接方向不能乱。',
    pitfalls: ['LEFT JOIN 后再 INNER JOIN 第三表可能把补的 NULL 又过滤掉。']
  },
  {
    id: 'join-008', cat: 'join', title: '非等值连接（区间匹配）',
    tags: ['非等值连接', 'BETWEEN', '区间匹配'],
    level: 2,
    syntax: 'FROM <表A> a JOIN <表B> b ON a.<列> BETWEEN b.<下界> AND b.<上界>;',
    example: "SELECT e.ename, e.sal,\n       CASE WHEN e.sal BETWEEN 0 AND 1500 THEN '低档'\n            WHEN e.sal BETWEEN 1501 AND 3000 THEN '中档'\n            ELSE '高档' END AS grade\nFROM EMP e;",
    note: '关联条件不是等值而是区间/不等式，适合按工资档、汇率区间、有效期匹配维度。注意区间重叠会放大行数。',
    pitfalls: ['区间边界重叠导致一行匹配多条，需先检查区间定义。']
  },
  {
    id: 'join-009', cat: 'join', title: 'UNION 与 UNION ALL',
    tags: ['UNION', 'UNION ALL', '并集', '行合并'],
    level: 1,
    syntax: 'SELECT <列> FROM <表1> UNION ALL SELECT <列> FROM <表2>;',
    example: "SELECT ename, deptno FROM EMP WHERE deptno = 10\nUNION ALL\nSELECT ename, deptno FROM EMP WHERE deptno = 20;",
    note: '纵向合并两个结果集。UNION 额外去重排序，UNION ALL 直接拼接。无重复诉求一律 UNION ALL，省去去重开销。',
    pitfalls: ['各分支列数与类型必须对齐。', 'ORDER BY 只能写在最后一个分支末尾。']
  },
  {
    id: 'join-010', cat: 'join', title: 'INTERSECT 交集',
    tags: ['INTERSECT', '交集', '集合运算'],
    level: 2,
    syntax: 'SELECT <列> FROM <表1> INTERSECT SELECT <列> FROM <表2>;',
    example: "SELECT deptno FROM EMP\nINTERSECT\nSELECT deptno FROM DEPT;",
    note: '返回两个查询都存在的去重行。找"既在 A 又在 B"的键集合，语义比 JOIN 更清晰。',
    pitfalls: [],
    dialects: {
      mysql: '8.0.31 起支持 INTERSECT；更早版本用 INNER JOIN 去重替代。'
    }
  },
  {
    id: 'join-011', cat: 'join', title: 'EXCEPT / MINUS 差集',
    tags: ['EXCEPT', 'MINUS', '差集', '集合运算'],
    level: 2,
    syntax: 'SELECT <列> FROM <表1> EXCEPT SELECT <列> FROM <表2>;',
    example: "SELECT deptno FROM DEPT\nEXCEPT\nSELECT deptno FROM EMP;",
    note: '返回只在第一个查询中出现的去重行，典型场景：找没有员工的部门、两期数据差异比对。',
    pitfalls: [],
    dialects: {
      mysql: '8.0.31 起支持 EXCEPT；更早版本用 NOT EXISTS 替代。',
      oracle: '关键字写作 MINUS，语义相同。'
    }
  },
  {
    id: 'join-012', cat: 'join', title: '反连接：NOT EXISTS 找缺失',
    tags: ['NOT EXISTS', '反连接', 'ANTI JOIN', '缺失'],
    level: 2,
    syntax: 'WHERE NOT EXISTS (SELECT 1 FROM <表2> WHERE <关联>);',
    example: "SELECT d.dname\nFROM DEPT d\nWHERE NOT EXISTS (\n  SELECT 1 FROM EMP e WHERE e.deptno = d.deptno\n);",
    note: '找"主表有、子表无"的行。比 LEFT JOIN ... IS NULL 更稳，比 NOT IN 安全（不受 NULL 干扰）。',
    pitfalls: ['NOT IN 遇子查询结果含 NULL 会零命中，反连接请用 NOT EXISTS。']
  }
];
