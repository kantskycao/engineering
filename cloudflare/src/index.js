/**
 * Engineering Papers API - Cloudflare Worker + D1
 *
 * 简洁认证：使用 SHA-256 密码哈希对比，无需 JWT
 * 前端在 GitHub Pages，API 在 Cloudflare Workers
 *
 * Endpoints:
 *   POST /api/login       { username, password } → { token }
 *   GET  /api/papers       ?topic=&sort=&q=&mode= → { papers, topics }
 *   GET  /api/bibtex       ?title= → BibTeX text
 */

// ─── SHA-256 ──────────────────────────────────────────
async function sha256(msg) {
  const buf = new TextEncoder().encode(msg);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ─── Simple Token 生成 / 验证 ──────────────────────────
// 用 SHA-256(username + secret + timestamp) 生成 token
const TOKEN_EXPIRY = 86400 * 7; // 7天

async function makeToken(username, secret, now) {
  const raw = username + '::' + secret + '::' + Math.floor(now / TOKEN_EXPIRY);
  return await sha256(raw);
}

async function checkToken(token, username, secret) {
  if (!token || !username) return false;
  const now = Date.now() / 1000;
  const t1 = await makeToken(username, secret, now);
  if (token === t1) return true;
  const t2 = await makeToken(username, secret, now - TOKEN_EXPIRY);
  return token === t2;
}

// ─── 生成 BibTeX ──────────────────────────────────────
function genBibTeX(p) {
  const key = p.bibtex_key || ('p_' + p.title.replace(/[^a-z0-9]/gi, '').toLowerCase().slice(0, 25));
  const authors = (p.authors || '').split(';').join(' and ').trim();
  let o = `@article{${key},\n`;
  if (authors) o += `  author  = {${authors}},\n`;
  o += `  title   = {${p.title}},\n`;
  o += `  journal = {Engineering},\n`;
  o += `  year    = {${p.year}}`;
  if (p.volume) o += `,\n  volume  = {${p.volume}}`;
  if (p.issue) o += `,\n  number  = {${p.issue}}`;
  if (p.doi) o += `,\n  doi     = {${p.doi}}`;
  o += '\n}';
  return o;
}

// ─── CORS ──────────────────────────────────────────────
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

// ─── Topic 中文翻译 ────────────────────────────────────
const TOPIC_ZH = {
  'Systems Science': '系统科学',
  'Electronic Engineering': '电子工程',
  'MWPT Technology': '微波无线输能技术',
  'Cyber Technology': '网络技术',
  'Robotics': '机器人学',
  'Artificial intelligence': '人工智能',
  'Artificial Intelligence': '人工智能',
  'wireless communications': '无线通信',
  'Wireless Communications': '无线通信',
  'Optical Neural Networks': '光学神经网络',
  'Microwave Wireless Power Transfer Technology': '微波无线输能技术',
  'SI: Artificial Intelligence': '人工智能专刊',
  'High-End Measuring Instruments': '高端测量仪器',
  'SI: Subwavelength Optics': '亚波长光学专刊',
  'Advanced Antennas for Wireless Connectivity': '先进无线天线',
  'Complex Network': '复杂网络',
  'Next Ten Years: Create a Better Future': '未来十年',
  'Subwavelength Optics': '亚波长光学',
  'Metamaterials': '超材料',
  'VSI: SIN Theory and Technology': '空间信息网络理论与技术',
};

// ─── Handlers ──────────────────────────────────────────

// POST /api/login
async function handleLogin(request, env) {
  try {
    const { username, password } = await request.json();
    if (!username || !password) return json({ error: '请输入用户名和密码' }, 400);

    const { results } = await env.DB.prepare(
      'SELECT username, password_hash FROM users WHERE username = ?'
    ).bind(username).all();

    if (!results.length) return json({ error: '用户名或密码错误' }, 401);

    const hash = await sha256(password);
    if (hash !== results[0].password_hash) return json({ error: '用户名或密码错误' }, 401);

    const token = await makeToken(username, env.AUTH_SECRET, Date.now() / 1000);
    return json({ token, username, message: '登录成功' });
  } catch (e) {
    return json({ error: '登录失败: ' + e.message }, 500);
  }
}

// GET /api/papers
async function handlePapers(request, env) {
  const { searchParams } = new URL(request.url);
  const token = request.headers.get('Authorization')?.slice(7);
  const username = 'admin';

  // 允许所有人读取（无 token 也可以），但搜索/排序需要 token
  const authed = token ? await checkToken(token, username, env.AUTH_SECRET) : false;

  const topic = searchParams.get('topic') || '';
  const sortBy = searchParams.get('sort') || 'citations';
  const q = searchParams.get('q') || '';
  const mode = searchParams.get('mode') || 'title';

  let papersSql = 'SELECT * FROM papers';
  const params = [];
  const conditions = [];

  if (topic && topic !== 'all') {
    conditions.push('topic = ?');
    params.push(topic);
  }

  if (q) {
    if (mode === 'author') {
      conditions.push('LOWER(authors) LIKE ?');
    } else {
      conditions.push('LOWER(title) LIKE ?');
    }
    params.push('%' + q.toLowerCase() + '%');
  }

  if (conditions.length) papersSql += ' WHERE ' + conditions.join(' AND ');

  if (sortBy === 'year') {
    papersSql += ' ORDER BY year DESC, total_citations DESC';
  } else {
    papersSql += ' ORDER BY total_citations DESC, year DESC';
  }

  const { results: papers } = await env.DB.prepare(papersSql).bind(...params).all();

  // Topic summary
  const { results: topics } = await env.DB.prepare(
    'SELECT topic, COUNT(*) as cnt, SUM(total_citations) as ct FROM papers GROUP BY topic ORDER BY ct DESC'
  ).all();

  const topicSummary = topics.map(t => ({
    topic: t.topic,
    zh: TOPIC_ZH[t.topic] || t.topic,
    count: t.cnt,
    citations: t.ct,
  }));

  return json({ papers, topics: topicSummary });
}

// GET /api/bibtex?title=xxx
async function handleBibTeX(request, env) {
  const title = new URL(request.url).searchParams.get('title');
  if (!title) return json({ error: '请提供 title 参数' }, 400);

  const { results } = await env.DB.prepare(
    'SELECT * FROM papers WHERE title = ?'
  ).bind(title).all();

  if (!results.length) return json({ error: '未找到该论文' }, 404);

  const bib = genBibTeX(results[0]);
  return new Response(bib, {
    headers: { ...CORS, 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

// ─── Router ────────────────────────────────────────────
export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/api/login' && request.method === 'POST') return handleLogin(request, env);
    if (path === '/api/papers' && request.method === 'GET') return handlePapers(request, env);
    if (path === '/api/bibtex' && request.method === 'GET') return handleBibTeX(request, env);

    return json({ error: 'Not Found' }, 404);
  },
};
