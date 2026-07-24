/*
 * string-date.js — 字符串（str-001~012）/ 日期时间（date-001~010）/ 数值与类型（num-001~006），共 28 条
 * 字段规则：{id, cat, title, tags, level, syntax, example, note, pitfalls, dialects?}
 * - cat 取值 'str'/'date'/'num'；title ≤20 字；note ≤120 字；
 * - pitfalls 0-3 条、每条 ≤60 字；dialects 键为 db2/mysql/pg/mssql/oracle 子集，值 ≤80 字；
 * - syntax 参数用 <尖括号> 占位；example 自洽，统一用 EMP/DEPT 示例库；
 * - 纯 ES2019，禁止 import/export、fetch 与 http(s) 字符串。
 */
window.SQLMANTRA_DATA = window.SQLMANTRA_DATA || {};
window.SQLMANTRA_DATA['string-date'] = [
  {
    id: 'str-001', cat: 'str', title: '字符串拼接 CONCAT 与 ||',
    tags: ['CONCAT', '拼接', '||', '字符串连接'],
    level: 1,
    syntax: "<列1> || <列2>   -- 或 CONCAT(<列1>, <列2>)",
    example: "SELECT ename || ' - ' || job AS emp_desc\nFROM EMP;",
    note: '把多列拼成展示文本。标准写法是 ||，CONCAT 各库参数个数不一。任一操作数为 NULL 时结果常为 NULL，先 COALESCE。',
    pitfalls: ['拼接遇 NULL 结果为 NULL（MySQL CONCAT 亦同）。'],
    dialects: {
      mysql: '支持 CONCAT 多参数；|| 默认是逻辑或，需 PIPES_AS_CONCAT 模式。',
      mssql: '用 + 或 CONCAT()；+ 遇 NULL 得 NULL，CONCAT 把 NULL 当空串。',
      oracle: '|| 或 CONCAT（仅两参数）；NULL 当空串处理。'
    }
  },
  {
    id: 'str-002', cat: 'str', title: '截取子串 SUBSTR',
    tags: ['SUBSTR', 'SUBSTRING', '截取', '子串'],
    level: 1,
    syntax: 'SUBSTR(<列>, <起始位置>, <长度>);  -- 起始从 1 开始',
    example: "SELECT ename, SUBSTR(ename, 1, 3) AS prefix\nFROM EMP;",
    note: '按字符位置截取。编码列取前缀（机构码前 6 位、卡号段）高频使用，注意起始位从 1 而非 0。',
    pitfalls: ['起始位写 0 各库行为不一，易少取一位。'],
    dialects: {
      mssql: '函数名为 SUBSTRING(列, 起始, 长度)。',
      mysql: 'SUBSTR 与 SUBSTRING 通用，支持负起始位从尾部数。',
      oracle: 'SUBSTR 支持负起始位，从右往左定位。'
    }
  },
  {
    id: 'str-003', cat: 'str', title: '字符串长度 LENGTH',
    tags: ['LENGTH', 'LEN', 'CHAR_LENGTH', '长度'],
    level: 1,
    syntax: 'LENGTH(<列>);  -- 字符数；LENGTHB/OCTET_LENGTH 为字节数',
    example: "SELECT ename, LENGTH(ename) AS name_len\nFROM EMP;",
    note: '做数据质量检查（证件号位数）、截断判断。区分字符数与字节数，中文按字节会放大。',
    pitfalls: [],
    dialects: {
      mssql: 'LEN() 不计尾部空格；含尾空格用 DATALENGTH。',
      mysql: 'LENGTH 返回字节数，CHAR_LENGTH 返回字符数。',
      oracle: 'LENGTH 为字符数，LENGTHB 为字节数。'
    }
  },
  {
    id: 'str-004', cat: 'str', title: '大小写转换 UPPER / LOWER',
    tags: ['UPPER', 'LOWER', '大小写'],
    level: 1,
    syntax: 'UPPER(<列>) | LOWER(<列>);',
    example: "SELECT UPPER(ename) AS ename_up\nFROM EMP\nWHERE UPPER(job) = 'MANAGER';",
    note: '大小写不敏感匹配的兜底手段。但列上套函数会使普通索引失效，量大时考虑函数索引或规范化存储。',
    pitfalls: ['WHERE UPPER(列) = ... 无法走普通 B-Tree 索引。']
  },
  {
    id: 'str-005', cat: 'str', title: '去空格 TRIM 家族',
    tags: ['TRIM', 'LTRIM', 'RTRIM', '去空格'],
    level: 1,
    syntax: "TRIM([LEADING|TRAILING|BOTH] '<字符>' FROM <列>);",
    example: "SELECT ename, TRIM(ename) AS ename_clean\nFROM EMP;",
    note: '清洗入库数据的首尾空格/指定字符，关联键比对前必做。TRIM 默认去两端空格。',
    pitfalls: ['中文全角空格不在默认去除范围，需显式指定。']
  },
  {
    id: 'str-006', cat: 'str', title: 'REPLACE 子串替换',
    tags: ['REPLACE', '替换', '清洗'],
    level: 1,
    syntax: "REPLACE(<列>, '<旧串>', '<新串>');",
    example: "SELECT REPLACE(job, 'SALES', 'SALE') AS job2\nFROM EMP;",
    note: '全局替换列内子串，用于脱敏、统一编码、去分隔符。嵌套 REPLACE 可做多步清洗。',
    pitfalls: ['新串省略或传空串即删除旧串。']
  },
  {
    id: 'str-007', cat: 'str', title: '定位子串位置',
    tags: ['INSTR', 'POSITION', 'CHARINDEX', 'LOCATE', '定位'],
    level: 2,
    syntax: "INSTR(<列>, '<子串>');  -- 返回起始位置，未找到返回 0",
    example: "SELECT ename, INSTR(ename, 'A') AS pos_a\nFROM EMP;",
    note: '找子串首次出现位置，配合 SUBSTR 做"取分隔符前/后段"。各库函数名与参数顺序不同。',
    pitfalls: [],
    dialects: {
      db2: 'INSTR(列, 子串) 或 LOCATE(子串, 列)。',
      mysql: 'INSTR(列, 子串) 或 LOCATE(子串, 列)。',
      pg: "POSITION('子串' IN 列) 或 STRPOS(列, 子串)。",
      mssql: 'CHARINDEX(子串, 列[, 起点])。',
      oracle: 'INSTR(列, 子串[, 起点[, 第几次]])。'
    }
  },
  {
    id: 'str-008', cat: 'str', title: 'LPAD / RPAD 补位对齐',
    tags: ['LPAD', 'RPAD', '补零', '对齐'],
    level: 2,
    syntax: "LPAD(<列>, <总长>, '<填充符>');",
    example: "SELECT LPAD(CAST(empno AS VARCHAR(10)), 6, '0') AS empno6\nFROM EMP;",
    note: '把编号左侧补零到定长（凭证号、机构码），或对金额右补位。数字列先转字符串再补。',
    pitfalls: ['原串超长时会被截断到指定总长。'],
    dialects: {
      mssql: '无内置 LPAD，用 RIGHT(REPLICATE(\'0\',6)+列, 6) 或 FORMAT 实现。'
    }
  },
  {
    id: 'str-009', cat: 'str', title: '取左右两端 LEFT / RIGHT',
    tags: ['LEFT', 'RIGHT', '前缀', '后缀'],
    level: 1,
    syntax: 'LEFT(<列>, <n>) | RIGHT(<列>, <n>);',
    example: "SELECT ename, LEFT(ename, 1) AS first_ch\nFROM EMP;",
    note: '取前 n / 后 n 个字符，语法直观。等价的 SUBSTR(列,1,n) 跨库通用性更好。',
    pitfalls: [],
    dialects: {
      oracle: '无 LEFT/RIGHT，用 SUBSTR(列,1,n) 与 SUBSTR(列,-n)。',
      db2: '支持 LEFT/RIGHT，也可用 SUBSTR。'
    }
  },
  {
    id: 'str-010', cat: 'str', title: '按分隔符拆分取段',
    tags: ['SPLIT_PART', 'SUBSTRING_INDEX', '拆分', '分隔符'],
    level: 2,
    syntax: "按 <分隔符> 拆分 <列>，取第 <n> 段",
    example: "SELECT ename,\n       SUBSTR(ename, 1, INSTR(ename, 'A') - 1) AS seg1\nFROM EMP\nWHERE INSTR(ename, 'A') > 0;",
    note: '解析"省-市-区"这类拼装字段。通用做法：INSTR 定位 + SUBSTR 截取；各库也有专用拆分函数。',
    pitfalls: ['分隔符不存在时 INSTR 返回 0，截取需先判 > 0。'],
    dialects: {
      mysql: "SUBSTRING_INDEX(列, 分隔符, n)。",
      pg: 'SPLIT_PART(列, 分隔符, n)。',
      mssql: 'STRING_SPLIT 返回表；单段取常用 CHARINDEX+SUBSTRING。'
    }
  },
  {
    id: 'str-011', cat: 'str', title: '正则匹配与提取',
    tags: ['REGEXP', '正则', 'REGEXP_LIKE', '模式匹配'],
    level: 3,
    syntax: "<列> REGEXP '<正则表达式>';  -- 匹配返回真",
    example: "SELECT ename\nFROM EMP\nWHERE ename REGEXP '^[A-M]';",
    note: 'LIKE 表达不了的复杂模式（纯数字、证件格式、多分隔符）用正则。各库函数名与语法细节差异大。',
    pitfalls: ['正则匹配普遍无法走索引，大表慎用。'],
    dialects: {
      db2: 'REGEXP_LIKE(列, 模式)。',
      mysql: '列 REGEXP 模式 或 REGEXP_LIKE(列, 模式)。',
      pg: '列 ~ 模式（大小写敏感），~* 不敏感。',
      mssql: '原生无正则，LIKE 通配符 []/[^] 或 CLR。',
      oracle: 'REGEXP_LIKE(列, 模式[, 匹配参数])。'
    }
  },
  {
    id: 'str-012', cat: 'str', title: '多行聚合成一行（行转串）',
    tags: ['LISTAGG', 'GROUP_CONCAT', 'STRING_AGG', '行转列', '聚合拼接'],
    level: 3,
    syntax: '<聚合拼接函数>(<列>, <分隔符>) WITHIN GROUP (ORDER BY <排序列>);',
    example: "SELECT deptno,\n       LISTAGG(ename, ',') WITHIN GROUP (ORDER BY ename) AS names\nFROM EMP\nGROUP BY deptno;",
    note: '把组内多行值拼成逗号串，报表展示常用。五方言函数名各异，超长时各有截断/报错行为。',
    pitfalls: ['拼接结果超长会报错或截断，注意各库上限。'],
    dialects: {
      db2: 'LISTAGG(列, 分隔符) WITHIN GROUP (ORDER BY ...)。',
      mysql: 'GROUP_CONCAT(列 ORDER BY ... SEPARATOR 分隔符)。',
      pg: 'STRING_AGG(列, 分隔符 ORDER BY ...)。',
      mssql: 'STRING_AGG(列, 分隔符) WITHIN GROUP (ORDER BY ...)，2017+。',
      oracle: 'LISTAGG(列, 分隔符) WITHIN GROUP (ORDER BY ...)。'
    }
  },
  {
    id: 'date-001', cat: 'date', title: '取当前日期时间',
    tags: ['CURRENT_DATE', 'CURRENT_TIMESTAMP', 'NOW', 'SYSDATE', '当前时间'],
    level: 1,
    syntax: 'CURRENT_DATE / CURRENT_TIMESTAMP;',
    example: "SELECT ename, hiredate\nFROM EMP\nWHERE hiredate < CURRENT_DATE;",
    note: '标准 CURRENT_DATE/CURRENT_TIMESTAMP 五方言通用；各库惯用函数（NOW、SYSDATE、GETDATE）见方言对照条目。',
    pitfalls: ['CURRENT_TIMESTAMP 含时区语义，跨库迁移要核对。'],
    dialects: {
      mysql: 'NOW() / CURDATE() / SYSDATE()。',
      mssql: 'GETDATE() / SYSDATETIME()。',
      oracle: 'SYSDATE / SYSTIMESTAMP。'
    }
  },
  {
    id: 'date-002', cat: 'date', title: '日期加减运算',
    tags: ['日期', '加减', 'DATEADD', 'DATE_ADD', 'INTERVAL', '加天数', '加月份'],
    level: 2,
    syntax: '<日期> + INTERVAL <n> <单位>;  -- 或 DATEADD(<单位>, <n>, <日期>)',
    example: "SELECT ename, hiredate,\n       hiredate + INTERVAL 30 DAY AS after_30d\nFROM EMP;",
    note: '日、月、年粒度的加减，算到期日、账期窗口必用。写法五方言差异最大，详见方言对照「日期加减」。',
    pitfalls: ['月末加一个月各库都收敛到目标月最后一天，但链条加减不可逆。'],
    dialects: {
      db2: '日期 + 30 DAYS / + 1 MONTH，或 ADD_MONTHS。',
      mysql: "DATE_ADD(日期, INTERVAL 30 DAY)。",
      pg: "日期 + INTERVAL '30' DAY，或 + 30（日粒度）。",
      mssql: 'DATEADD(DAY, 30, 日期)。',
      oracle: '日期 + 30（日）或 ADD_MONTHS(日期, n)。'
    }
  },
  {
    id: 'date-003', cat: 'date', title: '两日期相差 DATEDIFF',
    tags: ['DATEDIFF', '日期差', '间隔天数'],
    level: 2,
    syntax: 'DATEDIFF(<单位>, <开始>, <结束>);  -- 各库单位与顺序不同',
    example: "SELECT ename,\n       DATEDIFF(YEAR, hiredate, CURRENT_DATE) AS years_worked\nFROM EMP;",
    note: '算账龄、在职时长、逾期天数。MSSQL 按"边界跨越次数"计，跨年差 1 天也算 1 年，口径要核对。',
    pitfalls: ['DATEDIFF(YEAR,...) 算的是跨年数，不是满周岁。'],
    dialects: {
      db2: 'DAYS(日期1) - DAYS(日期2) 得天数差。',
      mysql: 'DATEDIFF(日期1, 日期2) 仅日粒度；TIMESTAMPDIFF 支持多单位。',
      pg: "DATE_PART('day', 时间戳1 - 时间戳2) 或日期直接相减。",
      oracle: '日期直接相减得天数；月差用 MONTHS_BETWEEN。'
    }
  },
  {
    id: 'date-004', cat: 'date', title: '提取年月日 EXTRACT',
    tags: ['EXTRACT', 'YEAR', 'MONTH', 'DAY', '日期提取'],
    level: 1,
    syntax: 'EXTRACT(YEAR|MONTH|DAY FROM <日期列>);',
    example: "SELECT ename,\n       EXTRACT(YEAR FROM hiredate) AS hire_year,\n       EXTRACT(MONTH FROM hiredate) AS hire_month\nFROM EMP;",
    note: '标准 SQL 取日期分量。MySQL/MSSQL 另有 YEAR()/MONTH()/DAY() 简写。分组统计按年月聚合常用。',
    pitfalls: ['WHERE 中 EXTRACT 包裹列会使普通索引失效。'],
    dialects: {
      mysql: 'YEAR(列) / MONTH(列) / DAY(列) 简写。',
      mssql: 'YEAR(列) / MONTH(列) / DAY(列) 或 DATEPART。',
      pg: 'EXTRACT 或 DATE_PART 均可。'
    }
  },
  {
    id: 'date-005', cat: 'date', title: '日期格式化输出',
    tags: ['TO_CHAR', 'DATE_FORMAT', 'FORMAT', '日期格式化'],
    level: 2,
    syntax: "TO_CHAR(<日期>, '<格式模板>');  -- 如 YYYY-MM-DD",
    example: "SELECT ename,\n       TO_CHAR(hiredate, 'YYYY-MM-DD') AS hire_str\nFROM EMP;",
    note: '把日期按业务要求转成字符串（对账文件、报文）。格式符各库不通用，YYYY/MM/DD 大小写语义要查表。',
    pitfalls: ['Oracle 中 MM 是月、MI 是分，写错即错值不报错。'],
    dialects: {
      db2: "TO_CHAR(日期, 'YYYY-MM-DD') 或 VARCHAR_FORMAT。",
      mysql: "DATE_FORMAT(日期, '%Y-%m-%d')。",
      pg: "TO_CHAR(日期, 'YYYY-MM-DD')。",
      mssql: "FORMAT(日期, 'yyyy-MM-dd') 或 CONVERT 样式码。",
      oracle: "TO_CHAR(日期, 'YYYY-MM-DD HH24:MI:SS')。"
    }
  },
  {
    id: 'date-006', cat: 'date', title: '字符串转日期',
    tags: ['TO_DATE', 'STR_TO_DATE', 'CAST', '日期转换'],
    level: 2,
    syntax: "TO_DATE('<字符串>', '<格式模板>');",
    example: "SELECT ename\nFROM EMP\nWHERE hiredate = TO_DATE('1981-02-20', 'YYYY-MM-DD');",
    note: '外部数据以文本日期入库时的标准转换。显式给格式模板，绝不依赖会话默认格式，避免换环境翻车。',
    pitfalls: ['依赖默认 NLS/语言设置的隐式转换是跨库事故高发点。'],
    dialects: {
      mysql: "STR_TO_DATE('1981-02-20', '%Y-%m-%d')。",
      mssql: "CAST/CONVERT；CONVERT(DATE, 串, 样式码) 更稳。",
      pg: "TO_DATE 或 CAST('1981-02-20' AS DATE)。"
    }
  },
  {
    id: 'date-007', cat: 'date', title: '求月初与月末',
    tags: ['月初', '月末', 'DATE_TRUNC', 'LAST_DAY', 'EOMONTH'],
    level: 2,
    syntax: 'DATE_TRUNC 取月初；LAST_DAY / EOMONTH 取月末',
    example: "SELECT ename, hiredate,\n       LAST_DAY(hiredate) AS month_end\nFROM EMP;",
    note: '账期归属、月度窗口计算。月初用截断到月，月末各库函数不同；也可"下月月初减一天"通用实现。',
    pitfalls: [],
    dialects: {
      db2: '日期 - (DAY(日期)-1) DAYS 得月初；LAST_DAY 得月末。',
      mysql: 'DATE_FORMAT(日期, %Y-%m-01) 得月初；LAST_DAY 得月末。',
      pg: "DATE_TRUNC('month', 日期) 得月初；再 +1 月 -1 天得月末。",
      mssql: 'EOMONTH(日期) 得月末；DATEADD 月初需拼装。',
      oracle: 'TRUNC(日期, MM) 得月初；LAST_DAY 得月末。'
    }
  },
  {
    id: 'date-008', cat: 'date', title: 'DATE_TRUNC 按粒度截断',
    tags: ['DATE_TRUNC', 'TRUNC', '截断', '时间粒度'],
    level: 2,
    syntax: "DATE_TRUNC('<year|month|day|hour>', <时间列>);",
    example: "SELECT TRUNC(hiredate, 'YYYY') AS year_head,\n       COUNT(*) AS cnt\nFROM EMP\nGROUP BY TRUNC(hiredate, 'YYYY');",
    note: '把时间戳按年/月/日/时对齐到粒度起点，等效"向下取整"。按小时/按日聚合的通用写法。',
    pitfalls: [],
    dialects: {
      db2: 'TRUNC(日期, 粒度) 或 DATE_TRUNC 同义。',
      mysql: '无 DATE_TRUNC，用 DATE_FORMAT 或 DATE(列) 截断。',
      mssql: 'DATETRUNC（2022+）；早期用 DATEADD/DATEDIFF 归零。'
    }
  },
  {
    id: 'date-009', cat: 'date', title: '按日期范围过滤当天',
    tags: ['日期范围', '当天', '半开区间', '索引友好'],
    level: 2,
    syntax: 'WHERE <日期列> >= <起始日> AND <日期列> < <次日>;',
    example: "SELECT ename, hiredate\nFROM EMP\nWHERE hiredate >= DATE '1981-01-01'\n  AND hiredate <  DATE '1982-01-01';",
    note: '带时分秒的列查"某一天/某一年"用半开区间，既不漏数又能让索引范围扫描生效。',
    pitfalls: ['用 DATE(列)= 或 BETWEEN ... 23:59:59 都会踩坑。']
  },
  {
    id: 'date-010', cat: 'date', title: '星期几与周内计算',
    tags: ['星期', 'DAYOFWEEK', 'DATEPART', '周'],
    level: 2,
    syntax: 'EXTRACT(DOW FROM <日期>);  -- 各库星期函数编号规则不同',
    example: "SELECT ename, hiredate,\n       EXTRACT(DOW FROM hiredate) AS weekday_no\nFROM EMP;",
    note: '判断工作日/周末、按星期分组。最大坑是各库周日算 0 还是 1、周一开头还是周日开头，务必先核对编号表。',
    pitfalls: ['周日编号 0/1/7 各库不同，跨库迁移必测。'],
    dialects: {
      db2: 'DAYOFWEEK 周日=1；DAYOFWEEK_ISO 周一=1。',
      mysql: 'DAYOFWEEK 周日=1；WEEKDAY 周一=0。',
      pg: 'EXTRACT(DOW) 周日=0；ISODOW 周一=1。',
      mssql: 'DATEPART(WEEKDAY,...) 受 @@DATEFIRST 影响。',
      oracle: "TO_CHAR(日期,'D') 受 NLS_TERRITORY 影响。"
    }
  },
  {
    id: 'num-001', cat: 'num', title: 'CAST 显式类型转换',
    tags: ['CAST', 'CONVERT', '类型转换'],
    level: 1,
    syntax: 'CAST(<表达式> AS <目标类型>);',
    example: "SELECT empno,\n       CAST(sal AS DECIMAL(10,2)) AS sal_dec,\n       CAST(empno AS VARCHAR(10)) AS empno_str\nFROM EMP;",
    note: '标准类型转换，五方言通用。比较前统一类型可避免隐式转换导致的索引失效与精度损失。',
    pitfalls: ['字符串转数字遇到脏数据（含字母）会直接报错。'],
    dialects: {
      mssql: '另有 CONVERT(类型, 表达式[, 样式])。',
      mysql: 'CAST 支持 SIGNED/UNSIGNED/CHAR/DECIMAL/DATE。',
      pg: '可用 表达式::类型 简写。'
    }
  },
  {
    id: 'num-002', cat: 'num', title: 'ROUND 与 TRUNC 取舍',
    tags: ['ROUND', 'TRUNC', 'TRUNCATE', '四舍五入', '截断'],
    level: 1,
    syntax: 'ROUND(<数值>, <小数位>);  TRUNC(<数值>, <小数位>);',
    example: "SELECT ename,\n       ROUND(sal / 12, 2) AS month_avg,\n       TRUNC(sal / 12, 2) AS month_trunc\nFROM EMP;",
    note: 'ROUND 四舍五入、TRUNC 直接截断。金额口径必须明确用哪种，差一分钱对账就平不了。',
    pitfalls: ['银行家舍入与四舍五入各库边界行为不同。']
  },
  {
    id: 'num-003', cat: 'num', title: '取余 MOD 与整除',
    tags: ['MOD', '%', '取余', '整除', '分片'],
    level: 1,
    syntax: 'MOD(<被除数>, <除数>);  -- 或 <被除数> % <除数>',
    example: "SELECT ename, empno,\n       MOD(empno, 2) AS shard_flag\nFROM EMP;",
    note: '奇偶判断、按主键哈希分片（MOD(id, 64) 分 64 批）常用。整数相除求商用 FLOOR 或整型除法。',
    pitfalls: ['除数为 0 报错，先 NULLIF 保护。'],
    dialects: {
      mssql: '用 % 运算符，无 MOD 函数。',
      mysql: 'MOD 与 % 均可。'
    }
  },
  {
    id: 'num-004', cat: 'num', title: 'ABS / CEIL / FLOOR',
    tags: ['ABS', 'CEIL', 'CEILING', 'FLOOR', '取整'],
    level: 1,
    syntax: 'ABS(<n>) | CEIL(<n>) | FLOOR(<n>);',
    example: "SELECT ename,\n       ABS(sal - 3000) AS dist_3000,\n       CEIL(sal / 1000) AS k_ceil\nFROM EMP;",
    note: '绝对值、向上/向下取整。分页页数 = CEIL(总数/页大小)，误差比较用 ABS 差值。',
    pitfalls: [],
    dialects: {
      oracle: '向上取整函数名为 CEIL，无 CEILING。',
      mysql: 'CEIL 与 CEILING 均可。'
    }
  },
  {
    id: 'num-005', cat: 'num', title: 'DECIMAL 与 FLOAT 的精度',
    tags: ['DECIMAL', 'FLOAT', '精度', '金额'],
    level: 2,
    syntax: '金额/精确计算用 DECIMAL(<p>,<s>)；统计估算可用 FLOAT/DOUBLE',
    example: "SELECT ename,\n       CAST(sal AS DECIMAL(12,2)) * CAST(0.05 AS DECIMAL(5,4)) AS bonus\nFROM EMP;",
    note: 'FLOAT 是二进制近似存储，0.1 都存不准；涉及钱和必须相等比较的字段一律 DECIMAL。',
    pitfalls: ['FLOAT 列做 = 比较经常"看起来相等却查不到"。']
  },
  {
    id: 'num-006', cat: 'num', title: '随机数与随机抽样',
    tags: ['RAND', 'RANDOM', '随机数', '抽样'],
    level: 2,
    syntax: 'ORDER BY <随机函数> FETCH FIRST <n> ROWS ONLY;',
    example: "SELECT ename, sal\nFROM EMP\nORDER BY RAND()\nLIMIT 3;",
    note: '随机抽查样本。小表直接 ORDER BY 随机函数；大表先按主键区间或 MOD 缩小再抽，避免全表排序。',
    pitfalls: ['大表 ORDER BY RAND() 是全表排序，性能极差。'],
    dialects: {
      db2: 'RAND()。',
      mysql: 'RAND()。',
      pg: 'RANDOM()。',
      mssql: 'RAND() 或 NEWID() 排序抽样。',
      oracle: 'DBMS_RANDOM.VALUE。'
    }
  }
];
