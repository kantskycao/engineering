/**
 * Engineering Papers · 前端页面 (API 版本)
 * 从 Cloudflare Pages Functions API 获取数据
 * 支持统计图表、年份筛选
 */

// ─── API Base ──────────────────────────────────────────
const API = (typeof API_BASE !== 'undefined') ? API_BASE : 'http://localhost:8787';

// ─── State ─────────────────────────────────────────────
const state = {
  token: sessionStorage.getItem('ep_token') || '',
  username: sessionStorage.getItem('ep_user') || '',
  topic: 'all',
  sort: 'citations',
  yearFilter: 'all',
  query: '',
  mode: 'title',
  papers: [],
  topics: [],
};

const $ = id => document.getElementById(id);

// ─── Auth ──────────────────────────────────────────────
async function login(e) {
  e.preventDefault();
  const u = $('username').value.trim();
  const p = $('password').value.trim();
  if (!u || !p) { showErr('请输入用户名和密码'); return; }

  $('login-btn').disabled = true;
  $('login-error').style.display = 'none';

  try {
    const res = await fetch(API + '/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: u, password: p }),
    });
    const data = await res.json();

    if (!res.ok) { showErr(data.error || '登录失败'); $('login-btn').disabled = false; return; }

    state.token = data.token;
    state.username = data.username;
    sessionStorage.setItem('ep_token', data.token);
    sessionStorage.setItem('ep_user', data.username);
    showDash();
  } catch (err) {
    showErr('网络错误: ' + err.message);
  }
  $('login-btn').disabled = false;
}

function showErr(msg) {
  $('login-error').textContent = msg;
  $('login-error').style.display = 'block';
}

function logout() {
  state.token = '';
  sessionStorage.removeItem('ep_token');
  sessionStorage.removeItem('ep_user');
  $('login-page').classList.add('active');
  $('dashboard-page').classList.remove('active');
}

function showDash() {
  $('login-page').classList.remove('active');
  $('dashboard-page').classList.add('active');
  loadData();
}

// ─── Load Data from API ───────────────────────────────
async function loadData() {
  try {
    const params = new URLSearchParams();
    if (state.topic !== 'all') params.set('topic', state.topic);
    params.set('sort', state.sort);
    if (state.query) params.set('q', state.query);
    params.set('mode', state.mode);

    const headers = {};
    if (state.token) headers['Authorization'] = 'Bearer ' + state.token;

    const res = await fetch(API + '/api/papers?' + params.toString(), { headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '请求失败');

    state.papers = data.papers;
    state.topics = data.topics;
    render();
  } catch (err) {
    $('papers-list').innerHTML = `<div class="empty-state"><p style="color:var(--color-danger)">⚠ 加载失败: ${err.message}</p></div>`;
  }
}

// ─── Search Mode ──────────────────────────────────────
function setSearchMode(mode) {
  state.mode = mode;
  $('search-title-btn').classList.toggle('active', mode === 'title');
  $('search-author-btn').classList.toggle('active', mode === 'author');
  $('search-input').placeholder = mode === 'title' ? '搜索论文标题…' : '搜索作者姓名…';
  $('search-input').focus();
  loadData();
}

// ─── Render ────────────────────────────────────────────
function render() {
  renderTopics();
  renderStats();
  renderYearFilter();
  renderPapers();
}

function renderTopics() {
  const total = state.papers.length;
  const totalC = state.papers.reduce((s, p) => s + p.total_citations, 0);

  let html = `<div class="topic-item${state.topic === 'all' ? ' active' : ''}" data-t="all">
    <div class="topic-name"><div class="topic-name-text">全部论文</div><div class="topic-name-sub">All Papers</div></div>
    <div class="topic-meta"><span class="topic-count">${total}篇</span><span class="topic-citations">${totalC}次引用</span></div></div>`;

  state.topics.forEach(t => {
    const act = state.topic === t.topic ? ' active' : '';
    html += `<div class="topic-item${act}" data-t="${escAttr(t.topic)}">
      <div class="topic-name"><div class="topic-name-text">${esc(t.zh)}</div><div class="topic-name-sub">${esc(t.topic)}</div></div>
      <div class="topic-meta"><span class="topic-count">${t.count}篇</span><span class="topic-citations">${t.citations}次引用</span></div></div>`;
  });

  $('topic-list').innerHTML = html;
  $('topic-list').querySelectorAll('.topic-item').forEach(el => {
    el.addEventListener('click', () => {
      state.topic = el.dataset.t;
      state.yearFilter = 'all';
      $('search-input').value = '';
      state.query = '';
      loadData();
    });
  });
}

// ─── Statistics Chart ──────────────────────────────────
function renderStats() {
  const container = $('stats-container');
  if (!container) return;

  const papers = state.papers;
  if (!papers.length) { container.innerHTML = ''; return; }

  const yearMap = {};
  papers.forEach(p => {
    if (!yearMap[p.year]) yearMap[p.year] = { count: 0, citations: 0 };
    yearMap[p.year].count++;
    yearMap[p.year].citations += p.total_citations;
  });

  const years = Object.keys(yearMap).sort();
  const counts = years.map(y => yearMap[y].count);
  const citations = years.map(y => yearMap[y].citations);

  const maxCount = Math.max(...counts, 1);
  const maxCit = Math.max(...citations, 1);

  let html = `<div class="stats-section">
    <div class="stats-title">统计概览</div>
    <div class="stats-charts">
      <div class="stats-chart">
        <div class="stats-chart-label">论文数量</div>
        <div class="bar-chart">`;

  years.forEach((y, i) => {
    const pct = (counts[i] / maxCount * 100).toFixed(1);
    html += `<div class="bar-item">
      <div class="bar-fill" style="height:${pct}%"><span class="bar-val">${counts[i]}</span></div>
      <div class="bar-year">${y}</div>
    </div>`;
  });

  html += `</div></div>
      <div class="stats-chart">
        <div class="stats-chart-label">引用总数</div>
        <div class="bar-chart">`;

  years.forEach((y, i) => {
    const pct = (citations[i] / maxCit * 100).toFixed(1);
    html += `<div class="bar-item">
      <div class="bar-fill bar-fill-cit" style="height:${pct}%"><span class="bar-val">${citations[i]}</span></div>
      <div class="bar-year">${y}</div>
    </div>`;
  });

  html += `</div></div></div></div>`;

  container.innerHTML = html;
}

// ─── Year Filter ──────────────────────────────────────
function renderYearFilter() {
  const container = $('year-filter');
  if (!container) return;

  const years = [...new Set(state.papers.map(p => p.year))].sort((a, b) => b - a);
  let html = `<div class="year-filter-bar">
    <span class="year-filter-label">按年份：</span>
    <button class="year-btn${state.yearFilter === 'all' ? ' active' : ''}" data-y="all">全部</button>`;

  years.forEach(y => {
    html += `<button class="year-btn${state.yearFilter === y ? ' active' : ''}" data-y="${y}">${y}</button>`;
  });

  html += '</div>';
  container.innerHTML = html;
  container.querySelectorAll('.year-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.yearFilter = btn.dataset.y;
      renderYearFilter();
      renderPapers();
    });
  });
}

// ─── Render Papers ────────────────────────────────────
function renderPapers() {
  let list = state.papers;

  if (state.yearFilter !== 'all') {
    list = list.filter(p => p.year === parseInt(state.yearFilter));
  }

  const topicName = state.topic === 'all' ? '全部论文' : getTopicZh(state.topic);
  $('current-topic-title').textContent = state.yearFilter === 'all'
    ? topicName
    : `${topicName} (${state.yearFilter})`;
  $('papers-count').textContent = list.length + ' 篇';

  if (!list.length) {
    $('papers-list').innerHTML = `<div class="empty-state"><div class="empty-icon">⌕</div><p>${state.query ? '未找到匹配的论文' : '暂无论文数据'}</p></div>`;
    return;
  }

  const yearGroups = {};
  list.forEach(p => {
    if (!yearGroups[p.year]) yearGroups[p.year] = [];
    yearGroups[p.year].push(p);
  });

  const sortedYears = Object.keys(yearGroups).sort((a, b) => b - a);

  let html = '';

  // 总表
  html += `<div class="papers-table-wrapper">
    <table class="papers-table">
      <thead>
        <tr>
          <th class="col-num">#</th>
          <th class="col-title">论文题目</th>
          <th class="col-year">年份</th>
          <th class="col-cit">引用</th>
        </tr>
      </thead>
      <tbody>`;

  let idx = 0;
  sortedYears.forEach(year => {
    yearGroups[year].forEach(p => {
      idx++;
      html += `<tr>
        <td class="col-num">${idx}</td>
        <td class="col-title">
          <a href="#" class="paper-title-link" data-title="${escAttr(p.title)}">${esc(p.title)}</a>
          <div class="paper-authors-sm">${esc(shortAuthors(p.authors))}</div>
        </td>
        <td class="col-year">${p.year}</td>
        <td class="col-cit"><span class="cit-num">${p.total_citations}</span></td>
      </tr>`;
    });
  });

  html += `</tbody></table></div>`;

  // 论文详情
  html += `<div class="paper-details-section">
    <div class="stats-title">论文详情</div>`;

  sortedYears.forEach(year => {
    html += `<div class="year-group">
      <div class="year-group-title">${year} 年（${yearGroups[year].length} 篇）</div>`;

    yearGroups[year].forEach(p => {
      const authors = (p.authors || '').length > 120 ? (p.authors || '').substring(0, 120) + '…' : (p.authors || '');
      html += `<div class="paper-card" id="paper-${p.id}">
        <div class="paper-header">
          <div class="paper-title">${esc(p.title)}</div>
          <div class="paper-citations-group">
            <span class="paper-citations-total">${p.total_citations}</span>
            <span class="paper-citations-label">引用</span>
            ${p.citations_2026 > 0 ? `<span class="paper-citations-2026">+${p.citations_2026}</span>` : ''}
          </div>
        </div>
        <div class="paper-meta">
          ${p.type ? `<span class="paper-type">${esc(p.type)}</span>` : ''}
          <span class="paper-year">${p.year}</span>
          ${p.volume ? `<span class="paper-year">Vol. ${esc(p.volume)}</span>` : ''}
          ${p.issue ? `<span class="paper-year">No. ${esc(p.issue)}</span>` : ''}
        </div>
        <div class="paper-authors">${esc(authors)}</div>
        <div class="paper-actions">
          <button class="btn btn-bibtex" data-title="${escAttr(p.title)}">BibTeX</button>
        </div>
      </div>`;
    });

    html += `</div>`;
  });

  html += `</div>`;

  $('papers-list').innerHTML = html;

  $('papers-list').querySelectorAll('.btn-bibtex').forEach(btn => {
    btn.addEventListener('click', () => showBib(btn.dataset.title));
  });

  $('papers-list').querySelectorAll('.paper-title-link').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const allCards = document.querySelectorAll('.paper-card');
      for (const c of allCards) {
        if (c.querySelector('.paper-title')?.textContent?.trim() === link.dataset.title) {
          c.scrollIntoView({ behavior: 'smooth', block: 'center' });
          c.style.boxShadow = '0 0 0 2px var(--morandi-green), var(--shadow-md)';
          setTimeout(() => c.style.boxShadow = '', 2000);
          break;
        }
      }
    });
  });
}

function shortAuthors(authors) {
  if (!authors) return '';
  const parts = authors.split(';');
  if (parts.length <= 2) return authors;
  return parts[0] + ' 等 ' + parts.length + ' 位作者';
}

function getTopicZh(topic) {
  const t = state.topics.find(x => x.topic === topic);
  return t ? t.zh : topic;
}

// ─── BibTeX ────────────────────────────────────────────
async function showBib(title) {
  $('bibtex-text').textContent = '加载中…';
  $('bibtex-modal').style.display = 'flex';
  $('copy-success').style.display = 'none';

  try {
    const res = await fetch(API + '/api/bibtex?title=' + encodeURIComponent(title));
    if (!res.ok) throw new Error('未找到');
    $('bibtex-text').textContent = await res.text();
  } catch {
    $('bibtex-text').textContent = '未找到该论文的 BibTeX 信息';
  }
}

async function copyBib() {
  try { await navigator.clipboard.writeText($('bibtex-text').textContent); } catch {
    const ta = document.createElement('textarea');
    ta.value = $('bibtex-text').textContent;
    document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
  }
  $('copy-success').style.display = 'inline';
  setTimeout(() => $('copy-success').style.display = 'none', 2000);
}

function closeModal() { $('bibtex-modal').style.display = 'none'; }

// ─── Utils ─────────────────────────────────────────────
function esc(s) { if (!s) return ''; const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
function escAttr(s) { return (s || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

// ─── Events ────────────────────────────────────────────
$('login-form').addEventListener('submit', login);
$('logout-btn').addEventListener('click', logout);
$('modal-close').addEventListener('click', closeModal);
$('modal-overlay').addEventListener('click', closeModal);
$('copy-bibtex-btn').addEventListener('click', copyBib);
$('sort-select').addEventListener('change', () => { state.sort = $('sort-select').value; loadData(); });
$('search-title-btn').addEventListener('click', () => setSearchMode('title'));
$('search-author-btn').addEventListener('click', () => setSearchMode('author'));

let st;
$('search-input').addEventListener('input', () => {
  clearTimeout(st);
  st = setTimeout(() => { state.query = $('search-input').value; loadData(); }, 300);
});

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

// ─── Init ──────────────────────────────────────────────
if (state.token) { showDash(); } else { $('login-page').classList.add('active'); }
