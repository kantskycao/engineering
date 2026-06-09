# Engineering 论文引用管理系统

Frontend: **GitHub Pages**  
Backend: **Cloudflare Workers + D1 (SQLite)**  

## 项目结构

```
├── frontend/               ← GitHub Pages 静态站点
│   ├── index.html          ← 主页面
│   ├── app.js              ← 前端应用逻辑 (API 版本)
│   ├── api-config.js       ← API 地址配置
│   ├── style.css           ← 莫兰迪配色 + 毛玻璃样式
│   ├── standalone.html     ← 离线/开发版本 (内嵌数据)
│   └── standalone.js       ← 离线版本逻辑
│
├── cloudflare/             ← Cloudflare Workers API
│   ├── src/
│   │   ├── index.js        ← Worker 核心逻辑
│   │   ├── schema.sql      ← D1 数据库建表语句
│   │   └── papers.json     ← 论文原始数据
│   ├── seed.sql            ← 种子数据 SQL
│   ├── wrangler.toml       ← Wrangler 配置
│   └── setup.sh            ← 一键部署脚本
│
└── README.md
```

## 部署步骤

### 1. 部署 Cloudflare Workers API

```bash
cd cloudflare
bash setup.sh
```

或者手动：

```bash
# 安装 wrangler
npm install -g wrangler@latest

# 登录 Cloudflare
wrangler login

# 创建 D1 数据库
wrangler d1 create eng-papers

# 更新 wrangler.toml 中的 database_id

# 初始化数据库
wrangler d1 execute eng-papers --remote --file src/schema.sql

# 导入种子数据
wrangler d1 execute eng-papers --remote --file seed.sql

# 生成随机密钥
wrangler secret put AUTH_SECRET

# 部署 Worker
wrangler deploy
```

### 2. 配置前端

1. 修改 `frontend/api-config.js` 中的 `API_BASE` 为 Worker 实际地址
2. 将 `frontend/` 目录推送到 GitHub Pages

### 3. GitHub Pages 部署

```bash
# 推送代码
git add .
git commit -m "初始化: 论文引用管理系统"
git push -u origin main

# 在 GitHub 仓库 Settings → Pages 中
# Source: Deploy from a branch
# Branch: main, /frontend
```

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/login | 登录，获取 token |
| GET  | /api/papers | 获取论文列表 + 专题统计 |
| GET  | /api/bibtex | 获取 BibTeX 引用信息 |

### GET /api/papers 参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| topic | 专题筛选 | (全部) |
| sort | 排序: citations / year | citations |
| q | 搜索关键词 | (无) |
| mode | 搜索模式: title / author | title |

## 本地开发

```bash
# 使用离线版本（内嵌数据）
open frontend/standalone.html

# 或启动本地 Worker
cd cloudflare
wrangler dev
```

## 配色方案

采用**莫兰迪配色** + **毛玻璃 (glassmorphism)** 设计：
- 主色: `#8a9b8e` (莫兰迪绿)
- 背景: `#ecddd0` (暖米色)
- 毛玻璃: `rgba(255, 252, 248, 0.70)` + `blur(20px)`
