/**
 * Pages Functions 中间件
 * 处理 /api/* 路由，转发到 Worker
 */

// 导入 Worker 的 fetch 处理函数
// 这里我们直接在 Pages 中嵌入 API 逻辑
// 但更好的方式是将 Worker 作为 Pages Functions 的一部分

export async function onRequest(context) {
  const { request, next } = context;
  
  // 对于 API 请求，我们转发到已部署的 Worker
  const url = new URL(request.url);
  
  if (url.pathname.startsWith('/api/')) {
    const apiUrl = 'https://eng-papers-api.engineering-citation.workers.dev' + url.pathname + url.search;
    
    const apiRequest = new Request(apiUrl, {
      method: request.method,
      headers: request.headers,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
    });
    
    // 复制请求体
    if (request.method === 'POST') {
      const body = await request.text();
      return fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': request.headers.get('Authorization') || '',
        },
        body: body,
      });
    }
    
    return fetch(apiUrl);
  }
  
  return next();
}
