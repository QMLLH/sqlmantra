/* ============================================================
   SQLMANTRA — SQL 真言箓 · 交互主逻辑（零依赖，ES2019，file:// 直开）
   数据契约：window.SQLMANTRA_CATALOG + window.SQLMANTRA_DATA['<key>']
   编纂：鹤仙人
   ============================================================ */
(function () {
  'use strict';

  /* ---------------- 基础工具 ---------------- */
  function $(sel, root) { return (root || document).querySelector(sel); }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /* localStorage 安全封装：不可用时仅内存生效，不报错（规格【十二】） */
  var storageOK = (function () {
    try {
      var k = '__sqlmantra_test__';
      window.localStorage.setItem(k, '1');
      window.localStorage.removeItem(k);
      return true;
    } catch (e) { return false; }
  })();
  var memStore = {};
  function storeGet(key) {
    if (storageOK) { try { return window.localStorage.getItem(key); } catch (e) { /* fall */ } }
    return Object.prototype.hasOwnProperty.call(memStore, key) ? memStore[key] : null;
  }
  function storeSet(key, val) {
    if (storageOK) { try { window.localStorage.setItem(key, val); return; } catch (e) { /* fall */ } }
    memStore[key] = val;
  }

  var LS_THEME = 'sqlmantra.theme.v1';
  var LS_FAVS = 'sqlmantra.favs.v1';
  var LS_RECENT = 'sqlmantra.recent.v1';

  /* ---------------- 目录与数据合并 ---------------- */
  var catalog = window.SQLMANTRA_CATALOG || { order: [], cats: { all: '全部' } };
  var NAV_ORDER = Object.keys(catalog.cats);      /* 固定 12 项导航顺序 */
  var CAT_NAMES = catalog.cats;
  /* 内容分类（排除 all/fav/recent 三个虚拟分类） */
  var CONTENT_CATS = {};
  NAV_ORDER.forEach(function (k) {
    if (k !== 'all' && k !== 'fav' && k !== 'recent') CONTENT_CATS[k] = true;
  });

  /* 检测数据文件缺失，生成错误横幅（规格【十二】） */
  var missingFiles = [];
  var rawData = window.SQLMANTRA_DATA || {};
  catalog.order.forEach(function (key) {
    if (!Array.isArray(rawData[key])) missingFiles.push(key + '.js');
  });

  function mergeData() {
    var all = [];
    catalog.order.forEach(function (key) {
      var arr = rawData[key];
      if (Array.isArray(arr)) all = all.concat(arr);
    });
    return all;
  }

  /* validateData()：重复 id 只留首条，缺字段/未知 cat 仅警告，不阻断 */
  function validateData(entries) {
    var seen = {};
    var out = [];
    var REQUIRED = ['id', 'cat', 'title', 'tags', 'level', 'syntax', 'example', 'note', 'pitfalls'];
    entries.forEach(function (e, idx) {
      if (!e || typeof e !== 'object') {
        console.warn('[SQLMANTRA] 第 ' + idx + ' 条数据不是对象，已忽略');
        return;
      }
      var missing = [];
      REQUIRED.forEach(function (f) {
        if (e[f] === undefined || e[f] === null) missing.push(f);
      });
      if (missing.length) {
        console.warn('[SQLMANTRA] 条目 ' + (e.id || ('#' + idx)) + ' 缺少字段: ' + missing.join(', '));
      }
      if (e.id !== undefined) {
        if (seen[e.id]) {
          console.warn('[SQLMANTRA] 重复 id: ' + e.id + '，只保留首条');
          return;
        }
        seen[e.id] = true;
      }
      if (e.cat && !CONTENT_CATS[e.cat]) {
        console.warn('[SQLMANTRA] 条目 ' + e.id + ' 使用未知 cat: ' + e.cat);
      }
      out.push(e);
    });
    return out;
  }

  var entries = validateData(mergeData());
  var idSet = {};
  var byId = {};
  entries.forEach(function (e) { if (e.id) { idSet[e.id] = true; byId[e.id] = e; } });

  /* ---------------- 状态 ---------------- */
  function loadIdArray(key, cap) {
    var arr = [];
    try {
      var raw = storeGet(key);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          parsed.forEach(function (v) {
            /* 读出的 id 必须在当前数据 id 集合内校验，非法静默丢弃 */
            if (typeof v === 'string' && idSet[v] && arr.indexOf(v) === -1) arr.push(v);
          });
        }
      }
    } catch (e) { /* 非法 JSON 静默丢弃 */ }
    if (cap && arr.length > cap) arr = arr.slice(0, cap);
    return arr;
  }

  var state = {
    cat: 'all',
    query: '',
    favs: loadIdArray(LS_FAVS, 0),
    recent: loadIdArray(LS_RECENT, 20)
  };

  function saveFavs() { storeSet(LS_FAVS, JSON.stringify(state.favs)); }
  function saveRecent() { storeSet(LS_RECENT, JSON.stringify(state.recent)); }

  function recordRecent(id) {
    if (!idSet[id]) return;
    var i = state.recent.indexOf(id);
    if (i !== -1) state.recent.splice(i, 1);
    state.recent.unshift(id);
    if (state.recent.length > 20) state.recent = state.recent.slice(0, 20);
    saveRecent();
    if (state.cat === 'recent') render();
    else updateNavCounts();
  }

  /* ---------------- 主题（规格【九】） ---------------- */
  function currentTheme() {
    return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  }
  function applyTheme(theme, persist) {
    if (theme !== 'light' && theme !== 'dark') return;
    document.documentElement.setAttribute('data-theme', theme);
    var btn = $('#theme-toggle');
    if (btn) btn.textContent = theme === 'light' ? '☀' : '☾';
    if (persist) storeSet(LS_THEME, theme);
  }
  function initTheme() {
    var stored = storeGet(LS_THEME);
    applyTheme(stored === 'light' ? 'light' : 'dark', false);
  }
  function toggleTheme() {
    applyTheme(currentTheme() === 'light' ? 'dark' : 'light', true);
  }

  /* ---------------- URL 参数（规格【十】，file:// 生效） ---------------- */
  function parseURL() {
    var hashId = null;
    try {
      var params = new URLSearchParams(location.search || '');
      var q = params.get('q');
      if (typeof q === 'string' && q) state.query = q.slice(0, 100);
      var cat = params.get('cat');
      if (cat && CAT_NAMES[cat]) state.cat = cat;
      var theme = params.get('theme');
      /* ?theme= 本次运行覆盖，不写入存储；非法值静默忽略 */
      if (theme === 'light' || theme === 'dark') applyTheme(theme, false);
    } catch (e) { /* 非法参数静默忽略 */ }
    try {
      var h = (location.hash || '').replace(/^#/, '');
      if (h) {
        var decoded = decodeURIComponent(h);
        if (idSet[decoded]) hashId = decoded;
      }
    } catch (e) { /* 非法 hash 静默忽略 */ }
    return hashId;
  }

  /* ---------------- 搜索引擎（规格【四】） ---------------- */
  function tokenizeQuery(q) {
    return String(q || '').trim().split(/\s+/).filter(Boolean).map(function (w) {
      return w.toLowerCase();
    });
  }

  /* 单关键词得分 = 命中字段权重之和；多关键词 AND，总分为各词之和 */
  function scoreEntry(e, kws) {
    var title = String(e.title || '').toLowerCase();
    var tags = (Array.isArray(e.tags) ? e.tags.join(' ') : '').toLowerCase();
    var syntax = String(e.syntax || '').toLowerCase();
    var example = String(e.example || '').toLowerCase();
    var note = String(e.note || '').toLowerCase();
    var total = 0;
    for (var i = 0; i < kws.length; i++) {
      var w = kws[i];
      var s = 0;
      if (title.indexOf(w) !== -1) s += 10;
      if (tags.indexOf(w) !== -1) s += 5;
      if (syntax.indexOf(w) !== -1) s += 3;
      if (example.indexOf(w) !== -1) s += 2;
      if (note.indexOf(w) !== -1) s += 1;
      if (s === 0) return 0;      /* AND：任一词未命中即排除 */
      total += s;
    }
    return total;
  }

  /* 分类过滤（与搜索 AND 叠加，先分类后搜索） */
  function filterByCat(list, cat) {
    if (cat === 'all') return list.slice();
    if (cat === 'fav') return list.filter(function (e) { return state.favs.indexOf(e.id) !== -1; });
    if (cat === 'recent') {
      var out = [];
      state.recent.forEach(function (id) { if (byId[id]) out.push(byId[id]); });
      return out.filter(function (e) { return list.indexOf(e) !== -1; });
    }
    return list.filter(function (e) { return e.cat === cat; });
  }

  /* 当前过滤结果：分类 ∩ 搜索，搜索按总分降序、同分 id 升序 */
  function currentFiltered() {
    var base = filterByCat(entries, state.cat);
    var kws = tokenizeQuery(state.query);
    if (!kws.length) return base;
    var scored = [];
    base.forEach(function (e) {
      var s = scoreEntry(e, kws);
      if (s > 0) scored.push({ e: e, s: s });
    });
    scored.sort(function (a, b) {
      if (b.s !== a.s) return b.s - a.s;
      return String(a.e.id) < String(b.e.id) ? -1 : (String(a.e.id) > String(b.e.id) ? 1 : 0);
    });
    return scored.map(function (x) { return x.e; });
  }

  /* 仅按搜索过滤（用于各分类计数徽标，随搜索实时变化） */
  function searchFiltered() {
    var kws = tokenizeQuery(state.query);
    if (!kws.length) return entries.slice();
    return entries.filter(function (e) { return scoreEntry(e, kws) > 0; });
  }

  /* ---------------- <mark> 高亮（只允许在转义后的文本上插入） ---------------- */
  function insertMarks(escaped, kws) {
    if (!kws.length || !escaped) return escaped;
    var lower = escaped.toLowerCase();
    var flags = new Array(escaped.length);
    var i, j;
    for (i = 0; i < escaped.length; i++) flags[i] = false;
    kws.forEach(function (kw) {
      var ekw = escapeHtml(kw).toLowerCase();
      if (!ekw) return;
      var idx = 0;
      while ((idx = lower.indexOf(ekw, idx)) !== -1) {
        for (j = idx; j < idx + ekw.length; j++) flags[j] = true;
        idx += ekw.length;
      }
    });
    var out = '';
    var open = false;
    for (i = 0; i < escaped.length; i++) {
      if (flags[i] && !open) { out += '<mark>'; open = true; }
      if (!flags[i] && open) { out += '</mark>'; open = false; }
      out += escaped.charAt(i);
    }
    if (open) out += '</mark>';
    return out;
  }

  /* 在高亮器输出的 HTML 上插 mark：跳过标签，仅处理文本节点 */
  function insertMarksInHTML(html, kws) {
    if (!kws.length) return html;
    var out = '';
    var i = 0;
    var n = html.length;
    while (i < n) {
      var lt = html.indexOf('<', i);
      if (lt === -1) { out += insertMarks(html.slice(i), kws); break; }
      out += insertMarks(html.slice(i, lt), kws);
      var gt = html.indexOf('>', lt);
      if (gt === -1) { out += html.slice(lt); break; }
      out += html.slice(lt, gt + 1);
      i = gt + 1;
    }
    return out;
  }

  /* ---------------- JOIN 可视化（规格【八】） ---------------- */
  var VIZ_CAPTIONS = {
    inner: '保留两表键值匹配的行',
    left: 'A 表全保留，B 表无匹配补 NULL',
    right: 'B 表全保留，A 表无匹配补 NULL',
    full: '两表全保留，无匹配一侧补 NULL',
    cross: '两表笛卡尔积：3 × 3 = 9 种组合'
  };

  /* 全部为静态 SVG 模板 + CSS 变量取色，无数据注入 */
  function buildJoinViz(viz, entryId) {
    var stroke = 'stroke="var(--accent)" stroke-opacity="0.55" stroke-width="1"';
    var fill = 'fill="var(--accent)" fill-opacity="0.2"';
    var circleA = '<circle cx="38" cy="30" r="22" fill="none" ' + stroke + '/>';
    var circleB = '<circle cx="62" cy="30" r="22" fill="none" ' + stroke + '/>';
    var body = '';
    if (viz === 'cross') {
      /* 3×3 点阵：间距 12px、半径 2px，中心 (50,30)，表示笛卡尔积 */
      var dots = '';
      [18, 30, 42].forEach(function (cy) {
        [38, 50, 62].forEach(function (cx) {
          dots += '<circle cx="' + cx + '" cy="' + cy + '" r="2" fill="var(--accent)"/>';
        });
      });
      body = dots;
    } else if (viz === 'inner') {
      var clipId = 'viz-clip-' + String(entryId).replace(/[^A-Za-z0-9_-]/g, '');
      body = '<defs><clipPath id="' + clipId + '"><circle cx="62" cy="30" r="22"/></clipPath></defs>' +
        '<circle cx="38" cy="30" r="22" ' + fill + ' stroke="none" clip-path="url(#' + clipId + ')"/>' +
        circleA + circleB;
    } else if (viz === 'left') {
      body = '<circle cx="38" cy="30" r="22" ' + fill + ' stroke="none"/>' + circleA + circleB;
    } else if (viz === 'right') {
      body = '<circle cx="62" cy="30" r="22" ' + fill + ' stroke="none"/>' + circleA + circleB;
    } else if (viz === 'full') {
      body = '<circle cx="38" cy="30" r="22" ' + fill + ' stroke="none"/>' +
        '<circle cx="62" cy="30" r="22" ' + fill + ' stroke="none"/>' + circleA + circleB;
    } else {
      return null;
    }
    var wrap = document.createElement('div');
    wrap.className = 'join-viz';
    /* 静态 SVG 模板（HTML 解析器自动识别 svg 命名空间），无数据原文注入 */
    wrap.innerHTML = '<svg viewBox="0 0 100 60" width="100" height="60" aria-hidden="true">' +
      body + '</svg>';
    var cap = document.createElement('div');
    cap.className = 'viz-caption';
    cap.textContent = VIZ_CAPTIONS[viz] || '';
    wrap.appendChild(cap);
    return wrap;
  }

  /* ---------------- 复制（规格【七】） ---------------- */
  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    ta.style.top = '0';
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    return ok;
  }

  function copyText(text, btn, entryId) {
    function done(ok) {
      if (ok) {
        btn.textContent = '✓ 已复制';
        btn.classList.add('ok');
        recordRecent(entryId);       /* 复制成功记入 recent */
      } else {
        btn.textContent = '✗ 复制失败';
        btn.classList.add('fail');
        console.warn('[SQLMANTRA] 复制失败: ' + entryId);
      }
      setTimeout(function () {
        btn.textContent = '复制';
        btn.classList.remove('ok');
        btn.classList.remove('fail');
      }, 1600);
    }
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard.writeText(text).then(function () { done(true); }, function () {
        done(fallbackCopy(text));
      });
    } else {
      done(fallbackCopy(text));
    }
  }

  /* ---------------- 收藏 ---------------- */
  function toggleFav(id) {
    var i = state.favs.indexOf(id);
    if (i === -1) state.favs.push(id);
    else state.favs.splice(i, 1);
    saveFavs();
    recordRecent(id);
    render();
  }

  /* ---------------- 卡片渲染（规格【七】） ---------------- */
  var DIALECT_LABELS = [
    ['db2', 'DB2'], ['mysql', 'MySQL'], ['pg', 'PG'], ['mssql', 'MSSQL'], ['oracle', 'Oracle']
  ];

  function el(tag, cls, text) {
    var d = document.createElement(tag);
    if (cls) d.className = cls;
    if (text !== undefined) d.textContent = text;
    return d;
  }

  function buildCodeBlock(label, code, kws, entryId) {
    var block = el('div', 'code-block');
    var head = el('div', 'block-head');
    head.appendChild(el('span', 'block-label', label));
    var btn = el('button', 'copy-btn', '复制');
    btn.type = 'button';
    btn.addEventListener('click', function (ev) {
      ev.stopPropagation();
      copyText(String(code == null ? '' : code), btn, entryId);
    });
    head.appendChild(btn);
    block.appendChild(head);
    var pre = document.createElement('pre');
    var codeEl = document.createElement('code');
    /* 高亮器输出内部已逐 token 转义，允许 innerHTML；mark 仅插在转义文本上 */
    var html = window.highlightSQL ? window.highlightSQL(code) : escapeHtml(code);
    codeEl.innerHTML = insertMarksInHTML(html, kws);
    pre.appendChild(codeEl);
    block.appendChild(pre);
    return block;
  }

  function buildCard(e) {
    var kws = tokenizeQuery(state.query);
    var card = el('article', 'card');
    card.setAttribute('data-id', e.id || '');
    if (e.id) card.id = 'card-' + e.id;

    /* 头部行：id 徽标 + 标题 + level 角标 + 星标 */
    var head = el('div', 'card-head');
    head.appendChild(el('span', 'card-id', e.id || ''));
    var title = el('h2', 'card-title');
    title.innerHTML = insertMarks(escapeHtml(e.title), kws);
    head.appendChild(title);
    var lv = Number(e.level) || 1;
    if (lv < 1 || lv > 3) lv = 1;
    head.appendChild(el('span', 'level-badge level-' + lv, 'L' + lv));
    var faved = state.favs.indexOf(e.id) !== -1;
    var star = el('button', 'fav-btn' + (faved ? ' faved' : ''), faved ? '★' : '☆');
    star.type = 'button';
    star.setAttribute('aria-label', faved ? '取消收藏' : '收藏');
    star.addEventListener('click', function (ev) {
      ev.stopPropagation();
      toggleFav(e.id);
    });
    head.appendChild(star);
    card.appendChild(head);

    /* 语法块 + 示例块 */
    card.appendChild(buildCodeBlock('语法', e.syntax, kws, e.id));
    card.appendChild(buildCodeBlock('示例', e.example, kws, e.id));

    /* JOIN 可视化（entry.viz 存在时内嵌） */
    if (e.viz) {
      var viz = buildJoinViz(e.viz, e.id);
      if (viz) card.appendChild(viz);
    }

    /* 说明段 */
    if (e.note) {
      var note = el('p', 'card-note');
      note.innerHTML = insertMarks(escapeHtml(e.note), kws);
      card.appendChild(note);
    }

    /* 坑点列表 */
    if (Array.isArray(e.pitfalls) && e.pitfalls.length) {
      var ul = el('ul', 'pitfalls');
      e.pitfalls.forEach(function (p) {
        ul.appendChild(el('li', null, p));
      });
      card.appendChild(ul);
    }

    /* 方言对照 tab（仅渲染存在的键，无刷新切换） */
    if (e.dialects && typeof e.dialects === 'object') {
      var present = DIALECT_LABELS.filter(function (d) { return e.dialects[d[0]] !== undefined; });
      if (present.length) {
        var tabs = el('div', 'dialect-tabs');
        tabs.setAttribute('role', 'tablist');
        var panel = el('p', 'dialect-panel');
        present.forEach(function (d, idx) {
          var tab = el('button', 'dialect-tab' + (idx === 0 ? ' active' : ''), d[1]);
          tab.type = 'button';
          tab.setAttribute('role', 'tab');
          tab.addEventListener('click', function (ev) {
            ev.stopPropagation();
            var all = tabs.querySelectorAll('.dialect-tab');
            for (var t = 0; t < all.length; t++) all[t].classList.remove('active');
            tab.classList.add('active');
            panel.textContent = e.dialects[d[0]];
          });
          tabs.appendChild(tab);
        });
        panel.textContent = e.dialects[present[0][0]];
        card.appendChild(tabs);
        card.appendChild(panel);
      }
    }

    /* 点击查看记入 recent（复制/收藏按钮已 stopPropagation） */
    card.addEventListener('click', function () { recordRecent(e.id); });
    return card;
  }

  /* ---------------- 批量渲染（>80 张时先 40 张，追加每批 40 张） ---------------- */
  var renderList = [];
  var renderedCount = 0;
  var BATCH = 40;
  var PAGINATE_THRESHOLD = 80;

  var contentEl, innerEl, loadMoreBtn;

  function appendBatch() {
    var end = Math.min(renderedCount + BATCH, renderList.length);
    var frag = document.createDocumentFragment();
    for (var i = renderedCount; i < end; i++) {
      frag.appendChild(buildCard(renderList[i]));
    }
    renderedCount = end;
    innerEl.insertBefore(frag, loadMoreBtn);
    updateLoadMore();
  }

  function updateLoadMore() {
    var remain = renderList.length - renderedCount;
    if (remain > 0) {
      loadMoreBtn.hidden = false;
      loadMoreBtn.textContent = '加载更多（剩余 ' + remain + ' 条）';
    } else {
      loadMoreBtn.hidden = true;
    }
  }

  function renderEmptyState() {
    var box = el('div', 'empty-state');
    if (state.query) {
      box.appendChild(el('div', 'empty-title', '未命中任何真言 —— 换个关键词试试'));
      box.appendChild(el('div', 'empty-query', '已输入：' + state.query));
      var btn = el('button', 'clear-btn', '清空搜索');
      btn.type = 'button';
      btn.addEventListener('click', function () {
        state.query = '';
        var input = $('#search');
        if (input) input.value = '';
        render();
      });
      box.appendChild(btn);
    } else if (state.cat === 'fav') {
      box.appendChild(el('div', 'empty-title', '尚未收藏任何真言。'));
    } else if (state.cat === 'recent') {
      box.appendChild(el('div', 'empty-title', '暂无最近查看的真言。'));
    } else {
      box.appendChild(el('div', 'empty-title', '该分类暂无真言条目。'));
    }
    innerEl.insertBefore(box, loadMoreBtn);
  }

  function render() {
    renderList = currentFiltered();
    renderedCount = 0;
    innerEl.innerHTML = '';
    loadMoreBtn.hidden = true;
    innerEl.appendChild(loadMoreBtn);
    if (!renderList.length) {
      renderEmptyState();
    } else if (renderList.length > PAGINATE_THRESHOLD) {
      appendBatch();
    } else {
      var frag = document.createDocumentFragment();
      renderList.forEach(function (e) { frag.appendChild(buildCard(e)); });
      innerEl.insertBefore(frag, loadMoreBtn);
      renderedCount = renderList.length;
      updateLoadMore();
    }
    updateNavCounts();
    updateHitCounter();
    updateNavActive();
  }

  /* ---------------- 左导航（规格【三】） ---------------- */
  var navEls = {};

  function buildNav() {
    var nav = $('#sidenav');
    nav.innerHTML = '';
    NAV_ORDER.forEach(function (key) {
      var item = el('button', 'nav-item');
      item.type = 'button';
      item.setAttribute('data-cat', key);
      item.appendChild(el('span', 'nav-label', CAT_NAMES[key]));
      item.appendChild(el('span', 'nav-count', '0'));
      item.addEventListener('click', function () { setCat(key); });
      nav.appendChild(item);
      navEls[key] = item;
    });
  }

  function countForCat(list, cat) {
    if (cat === 'all') return list.length;
    if (cat === 'fav') {
      var n = 0;
      list.forEach(function (e) { if (state.favs.indexOf(e.id) !== -1) n++; });
      return n;
    }
    if (cat === 'recent') {
      var r = 0;
      list.forEach(function (e) { if (state.recent.indexOf(e.id) !== -1) r++; });
      return r;
    }
    var c = 0;
    list.forEach(function (e) { if (e.cat === cat) c++; });
    return c;
  }

  /* 计数徽标随搜索过滤实时变化 */
  function updateNavCounts() {
    var searched = searchFiltered();
    NAV_ORDER.forEach(function (key) {
      var badge = navEls[key] && navEls[key].querySelector('.nav-count');
      if (badge) badge.textContent = String(countForCat(searched, key));
    });
  }

  function updateNavActive() {
    NAV_ORDER.forEach(function (key) {
      if (navEls[key]) navEls[key].classList.toggle('active', key === state.cat);
    });
  }

  function updateHitCounter() {
    var elc = $('#hit-counter');
    if (elc) elc.textContent = '命中 ' + renderList.length + ' / 共 ' + entries.length + ' 条';
  }

  function setCat(cat) {
    if (!CAT_NAMES[cat]) return;
    state.cat = cat;
    contentEl.scrollTop = 0;         /* 切分类重置滚动到顶部 */
    closeDrawer();
    render();
  }

  /* ---------------- 错误横幅（规格【十二】） ---------------- */
  function initBanner() {
    if (!missingFiles.length) return;
    var banner = $('#error-banner');
    if (!banner) return;
    banner.querySelector('.banner-text').textContent =
      '数据真言缺失：' + missingFiles.join('、');
    banner.hidden = false;
    banner.querySelector('.banner-close').addEventListener('click', function () {
      banner.hidden = true;
    });
  }

  /* ---------------- 抽屉与移动搜索（规格【十一】） ---------------- */
  function closeDrawer() { document.body.classList.remove('nav-open'); }
  function initResponsive() {
    var toggle = $('#nav-toggle');
    if (toggle) {
      toggle.addEventListener('click', function () {
        document.body.classList.toggle('nav-open');
      });
    }
    var overlay = $('#nav-overlay');
    if (overlay) overlay.addEventListener('click', closeDrawer);
    var searchIcon = $('#search-icon');
    if (searchIcon) {
      searchIcon.addEventListener('click', function () {
        document.body.classList.add('search-open');
        var input = $('#search');
        if (input) input.focus();
      });
    }
  }

  /* ---------------- 搜索框事件（防抖 120ms，截断 100 字符） ---------------- */
  function initSearch() {
    var input = $('#search');
    if (!input) return;
    input.value = state.query;
    var timer = null;
    input.addEventListener('input', function () {
      if (input.value.length > 100) input.value = input.value.slice(0, 100);
      clearTimeout(timer);
      timer = setTimeout(function () {
        state.query = input.value.trim();
        render();
      }, 120);
    });
    /* 移动版展开态下失焦收起 */
    input.addEventListener('blur', function () {
      document.body.classList.remove('search-open');
    });
  }

  /* ---------------- 快捷键（规格【十】） ---------------- */
  function initShortcuts() {
    document.addEventListener('keydown', function (ev) {
      var target = ev.target;
      var tag = target && target.tagName ? target.tagName.toLowerCase() : '';
      var inField = tag === 'input' || tag === 'textarea' || tag === 'select';
      if (ev.key === 'Escape') {
        /* Esc：清空搜索并失焦（输入框内同样生效） */
        var input = $('#search');
        if (input) { input.value = ''; input.blur(); }
        state.query = '';
        document.body.classList.remove('search-open');
        closeDrawer();
        render();
        return;
      }
      if (inField) return;                 /* 焦点在表单控件时忽略其余全局快捷键 */
      if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
      var key = ev.key;
      if (key === '/') {
        ev.preventDefault();
        var inp = $('#search');
        if (window.innerWidth <= 720) document.body.classList.add('search-open');
        if (inp) inp.focus();
      } else if (key === 't' || key === 'T') {
        toggleTheme();
      } else if (key === 'f' || key === 'F') {
        setCat('fav');
      } else if (/^[0-9]$/.test(key)) {
        var idx = key === '0' ? 0 : parseInt(key, 10);
        if (idx < NAV_ORDER.length) setCat(NAV_ORDER[idx]);
      }
    });
  }

  /* 主题按钮 */
  function initThemeToggle() {
    var btn = $('#theme-toggle');
    if (btn) btn.addEventListener('click', toggleTheme);
  }

  /* 滚动到底自动追加下一批 */
  function initScrollPaging() {
    contentEl.addEventListener('scroll', function () {
      if (renderedCount >= renderList.length) return;
      if (contentEl.scrollTop + contentEl.clientHeight >= contentEl.scrollHeight - 160) {
        appendBatch();
      }
    });
    loadMoreBtn.addEventListener('click', appendBatch);
  }

  /* ---------------- hash 直达：滚动定位 + 2 秒描边高亮动画 ---------------- */
  function jumpToHash(hashId) {
    if (!hashId) return;
    /* 若条目不在当前过滤结果中，回退到全部分类以保证可达 */
    if (renderList.indexOf(byId[hashId]) === -1) {
      state.cat = 'all';
      render();
    }
    /* 分批渲染场景下确保目标卡片已挂载 */
    var guard = 0;
    while (!document.getElementById('card-' + hashId) &&
           renderedCount < renderList.length && guard < 100) {
      appendBatch();
      guard++;
    }
    var node = document.getElementById('card-' + hashId);
    if (!node) return;
    recordRecent(hashId);
    requestAnimationFrame(function () {
      node.scrollIntoView({ block: 'center' });
      node.classList.add('flash');
      setTimeout(function () { node.classList.remove('flash'); }, 2000);
    });
  }

  /* ---------------- 启动 ---------------- */
  function init() {
    initTheme();
    var hashId = parseURL();
    initBanner();
    buildNav();

    contentEl = $('#content');
    innerEl = $('#content-inner');
    loadMoreBtn = el('button', null, '加载更多');
    loadMoreBtn.id = 'load-more';
    loadMoreBtn.type = 'button';
    loadMoreBtn.hidden = true;

    initSearch();
    initShortcuts();
    initThemeToggle();
    initResponsive();
    initScrollPaging();

    render();
    jumpToHash(hashId);

    /* 彩蛋：作者署名（隐藏，仅 DevTools 控制台可见） */
    console.log('%c☯ SQLMANTRA · 鹤仙人 编纂', 'color:#7fdcff;font-weight:bold;');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
