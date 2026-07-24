/*
 * dialects.js — 方言对照大表（8 条，cat='dialect'），每条覆盖一个对照主题
 * 字段规则：{id, cat, title, tags, level, syntax, example, note, pitfalls, dialects}
 * - id：dia-001 ~ dia-008，全库唯一；title ≤20 字；note ≤120 字；
 * - pitfalls 0-3 条、每条 ≤60 字；dialects 键尽量覆盖 db2/mysql/pg/mssql/oracle 全部五种，值 ≤80 字；
 * - syntax 参数用 <尖括号> 占位；example 自洽，统一用 EMP/DEPT 示例库；
 * - 纯 ES2019，禁止 import/export、fetch 与 http(s) 字符串。
 */
window.SQLMANTRA_DATA = window.SQLMANTRA_DATA || {};
window.SQLMANTRA_DATA['dialects'] = [
  {
    id: 'dia-001', cat: 'dialect', title: '方言对照：分页',
    tags: ['分页', 'LIMIT', 'OFFSET', 'FETCH FIRST', 'TOP', 'PAGE'],
    level: 2,
    syntax: 'SELECT <列> FROM <表> ORDER BY <排序键> <分页子句>;  -- 跳过 <m> 行取 <n> 行',
    example: "SELECT empno, ename, sal\nFROM EMP\nORDER BY empno\nOFFSET 5 ROWS FETCH NEXT 5 ROWS ONLY;",
    note: '标准 SQL 写法是 OFFSET ... FETCH NEXT，DB2/PG/MSSQL(2012+)/Oracle(12c+) 均支持；分页必须配稳定排序。',
    pitfalls: ['无唯一排序键的分页会漏行重行。'],
    dialects: {
      db2: 'OFFSET m ROWS FETCH FIRST n ROWS ONLY；旧版用 ROW_NUMBER 包两层。',
      mysql: 'LIMIT n OFFSET m，或 LIMIT m, n；不支持 FETCH FIRST。',
      pg: 'LIMIT n OFFSET m 或标准 FETCH FIRST n ROWS ONLY 均可。',
      mssql: '2012+ 用 OFFSET m ROWS FETCH NEXT n ROWS ONLY，必须跟 ORDER BY。',
      oracle: '12c+ 用 OFFSET/FETCH；11g 及以前 ROWNUM 双层嵌套分页。'
    }
  },
  {
    id: 'dia-002', cat: 'dialect', title: '方言对照：拼接字符串',
    tags: ['拼接', 'CONCAT', '||', '字符串连接', '+'],
    level: 1,
    syntax: "<列1> || <列2>  -- 标准；各库另有 CONCAT、+ 等写法",
    example: "SELECT ename || '(' || job || ')' AS emp_label\nFROM EMP;",
    note: '标准双竖线 || 在 DB2/PG/Oracle 通用；MySQL 与 MSSQL 需换函数或运算符。NULL 参与拼接的行为各库不同。',
    pitfalls: ['MySQL 默认把 || 当逻辑或，跨库脚本别直接搬。'],
    dialects: {
      db2: '|| 或 CONCAT 运算符；CONCAT() 函数仅两参数。',
      mysql: 'CONCAT(列1, 列2, ...) 多参数；CONCAT_WS 可带分隔符。',
      pg: '|| 或 CONCAT()；CONCAT 把 NULL 视为空串。',
      mssql: '+ 或 CONCAT()；+ 遇 NULL 得 NULL，CONCAT 视 NULL 为空串。',
      oracle: '|| 或 CONCAT(仅两参数)；NULL 在拼接中视同空串。'
    }
  },
  {
    id: 'dia-003', cat: 'dialect', title: '方言对照：当前时间',
    tags: ['当前时间', 'NOW', 'SYSDATE', 'GETDATE', 'CURRENT_TIMESTAMP'],
    level: 1,
    syntax: 'SELECT <当前日期时间函数>;  -- 各库惯用函数不同',
    example: "SELECT ename, hiredate\nFROM EMP\nWHERE hiredate < CURRENT_TIMESTAMP;",
    note: 'CURRENT_DATE / CURRENT_TIMESTAMP 是标准写法、五方言通用；各库惯用别名在跨库迁移时要统一替换。',
    pitfalls: ['NOW 系与 SYSDATE 系在长事务内取值时点可能不同。'],
    dialects: {
      db2: 'CURRENT DATE / CURRENT TIMESTAMP，标准写法。',
      mysql: 'NOW()、CURDATE()、CURRENT_TIMESTAMP；SYSDATE() 取实时。',
      pg: 'NOW()、CURRENT_TIMESTAMP；CLOCK_TIMESTAMP() 取实时。',
      mssql: 'GETDATE()、SYSDATETIME()；CURRENT_TIMESTAMP 同 GETDATE。',
      oracle: 'SYSDATE、SYSTIMESTAMP；也支持 CURRENT_DATE。'
    }
  },
  {
    id: 'dia-004', cat: 'dialect', title: '方言对照：空值处理',
    tags: ['空值', 'NULL', 'COALESCE', 'NVL', 'IFNULL', 'ISNULL'],
    level: 1,
    syntax: '<空值函数>(<可空列>, <兜底值>);',
    example: "SELECT ename, COALESCE(comm, 0) AS comm2\nFROM EMP;",
    note: 'COALESCE 是标准函数、五方言通用且支持多参数链式兜底，跨库脚本首选；各库双参数简写仅限本库使用。',
    pitfalls: ['Oracle 空串视同 NULL，拼接/比较语义与其他库不同。'],
    dialects: {
      db2: 'COALESCE 或 VALUE()；双参数简写 COALESCE 即可。',
      mysql: 'IFNULL(列, 值) 双参数；COALESCE 通用。',
      pg: 'COALESCE 通用；无 NVL/IFNULL。',
      mssql: 'ISNULL(列, 值) 双参数；COALESCE 通用且类型推断更稳。',
      oracle: 'NVL(列, 值)；NVL2(列, 非空值, 空值) 可双向取值。'
    }
  },
  {
    id: 'dia-005', cat: 'dialect', title: '方言对照：取前 N 行',
    tags: ['TOP', 'LIMIT', 'FETCH FIRST', 'ROWNUM', '取前几行', '前N行'],
    level: 2,
    syntax: 'SELECT <列> FROM <表> ORDER BY <排序键> <限行子句>;',
    example: "SELECT empno, ename, sal\nFROM EMP\nORDER BY sal DESC\nFETCH FIRST 3 ROWS ONLY;",
    note: 'FETCH FIRST n ROWS ONLY 是标准写法。仅想"先看几行样例"时各库都有限行语法；分页场景见分页对照条。',
    pitfalls: ['Oracle 11g ROWNUM 必须先排序再套子查询限行。'],
    dialects: {
      db2: 'FETCH FIRST n ROWS ONLY。',
      mysql: 'LIMIT n。',
      pg: 'LIMIT n 或 FETCH FIRST n ROWS ONLY。',
      mssql: 'SELECT TOP (n) 列 FROM ...；或 OFFSET FETCH。',
      oracle: '12c+ FETCH FIRST n ROWS ONLY；11g 用 WHERE ROWNUM <= n。'
    }
  },
  {
    id: 'dia-006', cat: 'dialect', title: '方言对照：日期加减',
    tags: ['日期', '加减', 'DATEADD', 'DATE_ADD', 'INTERVAL', '加天数'],
    level: 2,
    syntax: '<日期> <加减> <时间间隔>;  -- 五方言写法各不相同',
    example: "SELECT ename, hiredate,\n       hiredate + INTERVAL 90 DAY AS due_date\nFROM EMP;",
    note: '到期日、宽限期、统计窗口都要做日期加减。此主题方言差异最大，跨库 SQL 必须按目标库改写。',
    pitfalls: ['月末日期加月份后不可逆向减回原日。'],
    dialects: {
      db2: '日期 + 90 DAYS、+ 3 MONTHS、- 1 YEAR，或 ADD_MONTHS。',
      mysql: 'DATE_ADD(日期, INTERVAL 90 DAY)；DATE_SUB 做减。',
      pg: "日期 + INTERVAL '90 days'；DATE 型还可直接 + 整数天。",
      mssql: 'DATEADD(DAY, 90, 日期)；单位还有 MONTH/YEAR/HOUR 等。',
      oracle: '日期 + 90（按天）；ADD_MONTHS(日期, 3) 按月；NUMTODSINTERVAL。'
    }
  },
  {
    id: 'dia-007', cat: 'dialect', title: '方言对照：条件分支',
    tags: ['条件分支', 'CASE', 'IIF', 'IF', 'DECODE'],
    level: 2,
    syntax: "CASE WHEN <条件> THEN <值1> ELSE <值2> END  -- 标准，五方言通用",
    example: "SELECT ename,\n       CASE WHEN comm IS NULL THEN '无提成' ELSE '有提成' END AS comm_flag\nFROM EMP;",
    note: 'CASE WHEN 是标准且表达能力最强，跨库脚本一律用它；各库专有简写（IIF/IF/DECODE）只在单库项目使用。',
    pitfalls: ['DECODE/IIF 嵌套可读性差，超过两层就该换 CASE。'],
    dialects: {
      db2: 'CASE 标准写法；无 IIF。',
      mysql: 'IF(条件, 值1, 值2) 函数；CASE 通用。',
      pg: 'CASE 标准写法；无 IIF/IF 函数。',
      mssql: 'IIF(条件, 值1, 值2)，2012+；CASE 通用。',
      oracle: 'DECODE(列, 匹配1, 值1, ..., 默认)；CASE 通用。'
    }
  },
  {
    id: 'dia-008', cat: 'dialect', title: '方言对照：类型转换',
    tags: ['类型转换', 'CAST', 'CONVERT', 'TO_DATE', 'TO_NUMBER', 'TO_CHAR'],
    level: 2,
    syntax: 'CAST(<表达式> AS <目标类型>);  -- 标准；各库另有专有转换函数',
    example: "SELECT ename,\n       CAST(sal AS DECIMAL(10,2)) AS sal_dec,\n       CAST(empno AS VARCHAR(10)) AS empno_str\nFROM EMP;",
    note: 'CAST 是标准入口，五方言通用。日期/数字与字符串互转的格式模板函数各库不同，格式符不要想当然。',
    pitfalls: ['隐式转换不报错但改语义，显式 CAST 才是正解。'],
    dialects: {
      db2: 'CAST 完整；TO_CHAR/VARCHAR_FORMAT 做格式化输出。',
      mysql: "CAST(x AS SIGNED/CHAR/DECIMAL/DATE)；STR_TO_DATE 转日期。",
      pg: '表达式::类型 简写；TO_DATE/TO_NUMBER/TO_CHAR 带模板。',
      mssql: 'CONVERT(类型, 表达式, 样式码)；TRY_CAST 失败返回 NULL。',
      oracle: "TO_DATE/TO_NUMBER/TO_CHAR 全套；CAST 通用。"
    }
  }
];
