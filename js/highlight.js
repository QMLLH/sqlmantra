/* SQLMANTRA — 手写 SQL 语法高亮器（零依赖）
 * 导出全局函数 highlightSQL(code)，返回已逐 token 转义的 HTML 字符串。
 * token 识别顺序：注释(--... 与 /*...*​/) → 字符串('...' 含 '' 转义) → 数字
 *   → 关键字（约80词）→ 函数（约60词）→ 标识符原样输出。
 * class 固定五类：tk-k 关键字 / tk-f 函数 / tk-s 字符串 / tk-n 数字 / tk-c 注释。
 */
(function (global) {
  'use strict';

  var KEYWORDS = [
    'SELECT', 'FROM', 'WHERE', 'GROUP', 'BY', 'HAVING', 'ORDER', 'INSERT',
    'UPDATE', 'DELETE', 'MERGE', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'FULL',
    'OUTER', 'CROSS', 'ON', 'UNION', 'ALL', 'INTERSECT', 'EXCEPT', 'CASE',
    'WHEN', 'THEN', 'ELSE', 'END', 'AS', 'DISTINCT', 'AND', 'OR', 'NOT',
    'NULL', 'IS', 'IN', 'EXISTS', 'BETWEEN', 'LIKE', 'ESCAPE', 'WITH',
    'OVER', 'PARTITION', 'ROWS', 'RANGE', 'UNBOUNDED', 'PRECEDING',
    'CURRENT', 'FOLLOWING', 'FETCH', 'FIRST', 'ONLY', 'OFFSET', 'LIMIT',
    'TOP', 'VALUES', 'INTO', 'SET', 'CREATE', 'ALTER', 'DROP', 'TABLE',
    'INDEX', 'VIEW', 'BEGIN', 'COMMIT', 'ROLLBACK', 'CAST', 'COALESCE',
    'NULLIF', 'UNIQUE', 'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES',
    'CONSTRAINT', 'DEFAULT', 'CHECK', 'ASC', 'DESC', 'NULLS', 'LAST',
    'GRANT', 'REVOKE', 'TRUNCATE', 'EXPLAIN', 'ANALYZE', 'USING', 'LATERAL',
    'RECURSIVE', 'MATERIALIZED', 'TEMP', 'TEMPORARY', 'IF', 'REPLACE'
  ];

  var FUNCTIONS = [
    'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'ROW_NUMBER', 'RANK', 'DENSE_RANK',
    'LAG', 'LEAD', 'FIRST_VALUE', 'LAST_VALUE', 'NTH_VALUE', 'NTILE',
    'CUME_DIST', 'PERCENT_RANK', 'SUBSTR', 'SUBSTRING', 'LENGTH', 'CHAR_LENGTH',
    'TRIM', 'LTRIM', 'RTRIM', 'UPPER', 'LOWER', 'REPLACE', 'CONCAT', 'INSTR',
    'LOCATE', 'POSITION', 'CHARINDEX', 'LEFT_STR', 'RIGHT_STR', 'LPAD', 'RPAD',
    'REVERSE', 'REPEAT', 'SPLIT_PART', 'STRING_AGG', 'GROUP_CONCAT', 'LISTAGG',
    'DATE', 'YEAR', 'MONTH', 'DAY', 'HOUR', 'MINUTE', 'SECOND', 'EXTRACT',
    'CURRENT_TIMESTAMP', 'CURRENT_DATE', 'CURRENT_TIME', 'DATEADD', 'DATEDIFF',
    'DATE_TRUNC', 'DATE_FORMAT', 'DATEADD', 'TO_CHAR', 'TO_DATE', 'TO_NUMBER',
    'NOW', 'SYSDATE', 'GETDATE', 'CURDATE', 'STR_TO_DATE', 'ADD_MONTHS',
    'MONTHS_BETWEEN', 'LAST_DAY', 'NEXT_DAY', 'ROUND', 'TRUNC', 'CEIL',
    'CEILING', 'FLOOR', 'ABS', 'MOD', 'POWER', 'SQRT', 'SIGN', 'RANDOM',
    'NVL', 'NVL2', 'DECODE', 'IIF', 'ISNULL', 'IFNULL', 'NULLIFZERO',
    'ZEROIFNULL', 'COALESCE', 'CONVERT', 'TRY_CAST', 'GENERATE_SERIES',
    'JSON_VALUE', 'JSON_QUERY', 'PIVOT'
  ];

  var KEYWORD_SET = {};
  var FUNCTION_SET = {};
  var i;
  for (i = 0; i < KEYWORDS.length; i++) KEYWORD_SET[KEYWORDS[i]] = true;
  for (i = 0; i < FUNCTIONS.length; i++) FUNCTION_SET[FUNCTIONS[i]] = true;

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function span(cls, text) {
    return '<span class="' + cls + '">' + escapeHtml(text) + '</span>';
  }

  /* 主 tokenizer：单遍扫描，按规格固定优先级产出 token */
  function highlightSQL(code) {
    var src = String(code == null ? '' : code);
    var out = [];
    var n = src.length;
    var p = 0;
    while (p < n) {
      var ch = src.charAt(p);
      var two = src.substr(p, 2);

      /* 1. 行注释 --... 到行尾 */
      if (two === '--') {
        var eol = src.indexOf('\n', p);
        if (eol === -1) eol = n;
        out.push(span('tk-c', src.slice(p, eol)));
        p = eol;
        continue;
      }
      /* 1. 块注释 */
      if (two === '/*') {
        var close = src.indexOf('*/', p + 2);
        var cend = close === -1 ? n : close + 2;
        out.push(span('tk-c', src.slice(p, cend)));
        p = cend;
        continue;
      }
      /* 2. 字符串 '...'（'' 为转义单引号） */
      if (ch === "'") {
        var q = p + 1;
        while (q < n) {
          if (src.charAt(q) === "'") {
            if (src.charAt(q + 1) === "'") { q += 2; continue; }
            q += 1;
            break;
          }
          q += 1;
        }
        out.push(span('tk-s', src.slice(p, q)));
        p = q;
        continue;
      }
      /* 3. 数字（整数 / 小数 / .5 形式） */
      if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(src.charAt(p + 1)))) {
        var m = /^[0-9]*\.?[0-9]+([eE][+-]?[0-9]+)?/.exec(src.slice(p));
        out.push(span('tk-n', m[0]));
        p += m[0].length;
        continue;
      }
      /* 4/5. 关键字与函数（标识符整体取大写查表），6. 其余标识符原样 */
      if (/[A-Za-z_]/.test(ch)) {
        var idm = /^[A-Za-z_][A-Za-z0-9_$#]*/.exec(src.slice(p));
        var word = idm[0];
        var upper = word.toUpperCase();
        if (KEYWORD_SET[upper]) out.push(span('tk-k', word));
        else if (FUNCTION_SET[upper]) out.push(span('tk-f', word));
        else out.push(escapeHtml(word));
        p += word.length;
        continue;
      }
      /* 其余字符（空白、运算符、标点）原样转义输出 */
      out.push(escapeHtml(ch));
      p += 1;
    }
    return out.join('');
  }

  global.highlightSQL = highlightSQL;
})(window);
