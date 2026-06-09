// POST /api/login
export async function onRequest(context) {
  try {
    const { request, env } = context;
    const { username, password } = await request.json();

    if (!username || !password) {
      return new Response(JSON.stringify({ error: '请输入用户名和密码' }), {
        status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const { results } = await env.DB.prepare(
      'SELECT username, password_hash FROM users WHERE username = ?'
    ).bind(username).all();

    if (!results.length) {
      return new Response(JSON.stringify({ error: '用户名或密码错误' }), {
        status: 401, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // SHA-256
    const msgBuffer = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

    if (hash !== results[0].password_hash) {
      return new Response(JSON.stringify({ error: '用户名或密码错误' }), {
        status: 401, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // 生成简单 token
    const secret = env.AUTH_SECRET || 'default-secret';
    const raw = username + '::' + secret + '::' + Math.floor(Date.now() / 1000 / 86400 / 7);
    const tokenBuf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
    const token = Array.from(new Uint8Array(tokenBuf)).map(b => b.toString(16).padStart(2, '0')).join('');

    return new Response(JSON.stringify({ token, username, message: '登录成功' }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: '登录失败: ' + e.message }), {
      status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
