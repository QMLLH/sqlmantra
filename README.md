# SQLMANTRA — SQL 真言箓

纯离线 SQL 速查手册 Web 应用。零第三方依赖，无构建步骤，双击 `index.html` 即可使用，完全支持 `file://` 协议，适合无法访问外网的内网办公环境。

## 功能

- **全文检索**：按空白分词、多关键词 AND、字段加权计分（title×10 / tags×5 / syntax×3 / example×2 / note×1），命中片段 `<mark>` 高亮，输入防抖 120ms
- **12 个分类**：查询基础 / 连接与集合 / 窗口函数 / 字符串 / 日期时间 / 数值与类型 / 性能与索引 / 实战模板 / 方言对照 / 收藏 / 最近查看，左导航实时命中计数
- **方言对照**：DB2 / MySQL / PostgreSQL / SQL Server / Oracle 五方言差异 tab 切换
- **JOIN 可视化**：INNER / LEFT / RIGHT / FULL / CROSS 五种连接内嵌 SVG 维恩图（CROSS 为 3×3 点阵），主题切换颜色同步
- **一键复制**：优先 `navigator.clipboard`，失败自动降级 `execCommand('copy')`
- **收藏与最近查看**：localStorage 持久化（`sqlmantra.favs.v1` / `sqlmantra.recent.v1`），隐私模式下自动降级为内存态
- **双主题**：暗色「终端」/ 亮色「公文」，CSS 变量驱动，`<html data-theme>` 切换
- **快捷键**：`/` 聚焦搜索，`Esc` 清空，`T` 切主题，`1-9,0` 切分类，`F` 跳收藏
- **URL 接口**（`file://` 下同样生效）：`?q=` 初始搜索、`?cat=` 初始分类、`#<id>` 条目直达、`?theme=` 临时主题

## 快速开始

无需安装任何东西：

1. 克隆或下载本仓库
2. 双击 `index.html`（或拖入浏览器）

运行期不发起任何网络请求。

## 目录结构

```
index.html                  入口，按序加载数据脚本
css/style.css               双主题样式（CSS 变量）
js/app.js                   应用逻辑（搜索 / 渲染 / 收藏 / 快捷键 / URL）
js/highlight.js             手写 SQL tokenizer（关键字/函数/字符串/数字/注释五类）
js/data/catalog.js          分类定义与数据文件加载顺序
js/data/core.js             查询基础 / 聚合分组 / 条件逻辑 / NULL 专题（24 条）
js/data/join.js             连接与集合（12 条）
js/data/window.js           窗口函数（16 条）
js/data/string-date.js      字符串 / 日期时间 / 数值与类型（28 条）
js/data/performance.js      性能 / 索引 / 执行计划 / 大表（18 条）
js/data/patterns.js         实战模板（14 条）
js/data/dialects.js         方言对照大表（8 条）
```

共 **120 条**速查条目，教学示例统一使用示例库 `EMP(empno,ename,job,mgr,hiredate,sal,comm,deptno)` 与 `DEPT(deptno,dname,loc)`。

## 数据扩展

新增条目只需在对应 `js/data/*.js` 文件的数组中追加对象，schema 固定：

```js
{
  id: 'win-017',              // 分类前缀 + 三位序号，全库唯一，支持 URL 直达
  cat: 'window',              // 分类 key，见 catalog.js
  title: '不超过 20 字标题',
  tags: ['ROW_NUMBER', '去重'],
  level: 2,                   // 1 入门 / 2 进阶 / 3 高阶
  syntax: 'SELECT <列> FROM <表> WHERE <条件>',
  example: 'SELECT ... ;      // 完整可运行示例',
  note: '什么时候用、为什么，不超过 120 字',
  pitfalls: ['坑点，每条不超过 60 字'],  // 0–3 条，无坑给 []
  dialects: { mysql: '差异说明', pg: '...' }  // 可选，仅方言有差异时填
}
```

新增分类数据文件时，在 `js/data/catalog.js` 的 `order` 中登记文件名，并在 `index.html` 中按相同顺序加一行 `<script>`。`app.js` 内置 `validateData()`，会在控制台报告重复 id、缺字段、未知分类（不阻断运行，重复 id 只保留首条）。

## 技术约束

- 原生 HTML/CSS/JavaScript（ES2019），零依赖、无 npm、无 vendor
- 不使用 ES Modules / fetch / XHR，数据经普通 `<script>` 标签挂载到 `window.SQLMANTRA_DATA`
- 所有数据渲染路径经过 `escapeHtml`，`<mark>` 高亮只插入转义后文本
- 打印友好：`@media print` 白底黑字、隐藏导航与按钮、卡片跨页不截断
