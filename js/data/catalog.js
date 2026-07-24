/* SQLMANTRA — 分类定义与数据文件加载顺序
 * 契约：
 *   - order：数据文件加载顺序，对应 js/data/<key>.js，文件向 window.SQLMANTRA_DATA['<key>'] 挂载条目数组。
 *   - cats：固定 12 个分类的 key → 显示名（对象键序即左导航顺序）。
 *   - 条目字段规则见各数据文件顶部注释（schema: {id, cat, title, tags, level, syntax, example, note, pitfalls, dialects?}）。
 */
window.SQLMANTRA_CATALOG = {
  order: ['core', 'join', 'window', 'string-date', 'performance', 'patterns', 'dialects'],
  cats: {
    all: '全部',
    core: '查询基础',
    join: '连接与集合',
    window: '窗口函数',
    str: '字符串',
    date: '日期时间',
    num: '数值与类型',
    perf: '性能与索引',
    pattern: '实战模板',
    dialect: '方言对照',
    fav: '我的收藏',
    recent: '最近查看'
  }
};
