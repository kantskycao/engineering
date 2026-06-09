/**
 * API 配置
 * 
 * 方案说明:
 * - 国外用户: 直接连接 Cloudflare Worker (workers.dev)
 * - 国内用户: 如果 workers.dev 无法访问，自动尝试备用地址
 * 
 * 部署前请修改:
 * 1. WORKER_URL → 你的 Cloudflare Worker 地址
 * 2. (可选) FALLBACK_URL → 如果有国内可访问的备用地址
 */

const WORKER_URL = 'https://eng-papers-api.engineering-citation.workers.dev';
const FALLBACK_URL = ''; // 备用地址（如有）

// 自动选择可用的 API 地址
const API_BASE = (function() {
  // 如果设置了备用地址且当前域名与 WORKER_URL 不同域，直接使用 WORKER_URL
  // 浏览器会自动处理跨域
  return WORKER_URL;
})();
