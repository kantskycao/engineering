#!/bin/bash
# Cloudflare Engineering Papers API 部署脚本
# 使用方法: bash setup.sh

set -e

echo "========================================"
echo " Engineering Papers API - Cloudflare 部署"
echo "========================================"
echo ""

# 1. 安装 wrangler
echo ">>> 检查 wrangler..."
if ! command -v wrangler &>/dev/null; then
  echo "   安装 wrangler..."
  npm install -g wrangler@latest
fi
echo "   wrangler 已就绪: $(wrangler --version)"

# 2. 登录
echo ""
echo ">>> 请登录 Cloudflare..."
echo "    (浏览器窗口将打开)"
wrangler login

# 3. 创建 D1 数据库
echo ""
echo ">>> 创建 D1 数据库..."
DB_OUTPUT=$(wrangler d1 create eng-papers 2>&1 || true)
echo "$DB_OUTPUT"
DB_ID=$(echo "$DB_OUTPUT" | grep -oP 'database_id = "\K[^"]+' || echo "")

if [ -n "$DB_ID" ]; then
  echo "   D1 database_id: $DB_ID"
  # 更新 wrangler.toml
  sed -i "s/database_id = \"\"/database_id = \"$DB_ID\"/" wrangler.toml
  echo "   已更新 wrangler.toml"
fi

# 4. 创建 schema + 导入数据
echo ""
echo ">>> 初始化数据库..."
wrangler d1 execute eng-papers --remote --file src/schema.sql
echo "   导入种子数据..."
wrangler d1 execute eng-papers --remote --file seed.sql

# 5. 生成随机 AUTH_SECRET
echo ""
echo ">>> 生成随机密钥..."
NEW_SECRET=$(openssl rand -hex 32)
sed -i "s/AUTH_SECRET = \".*\"/AUTH_SECRET = \"$NEW_SECRET\"/" wrangler.toml
echo "   已更新 AUTH_SECRET"

# 6. 部署
echo ""
echo ">>> 部署 Worker..."
wrangler deploy

echo ""
echo "========================================"
echo " ✅ 部署完成!"
echo "========================================"
echo ""
echo "Worker 地址: https://eng-papers-api.<你的子域>.workers.dev"
echo ""
echo "前端需要配置的 API 地址:"
echo "  const API_BASE = 'https://eng-papers-api.<你的子域>.workers.dev';"
echo ""
echo "测试:"
echo "  curl https://eng-papers-api.<你的子域>.workers.dev/api/papers | head -20"
