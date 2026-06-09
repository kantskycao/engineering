// GET /api/bibtex?title=xxx
export async function onRequest(context) {
  try {
    const { request, env } = context;
    const title = new URL(request.url).searchParams.get('title');
    if (!title) {
      return new Response(JSON.stringify({ error: '请提供 title 参数' }), {
        status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const { results } = await env.DB.prepare(
      'SELECT * FROM papers WHERE title = ?'
    ).bind(title).all();

    if (!results.length) {
      return new Response(JSON.stringify({ error: '未找到该论文' }), {
        status: 404, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const p = results[0];
    const key = p.bibtex_key || ('p_' + p.title.replace(/[^a-z0-9]/gi, '').toLowerCase().slice(0, 25));
    const authors = (p.authors || '').split(';').join(' and ').trim();

    let bib = `@article{${key},\n`;
    if (authors) bib += `  author  = {${authors}},\n`;
    bib += `  title   = {${p.title}},\n`;
    bib += `  journal = {Engineering},\n`;
    bib += `  year    = {${p.year}}`;
    if (p.volume) bib += `,\n  volume  = {${p.volume}}`;
    if (p.issue) bib += `,\n  number  = {${p.issue}}`;
    if (p.doi) bib += `,\n  doi     = {${p.doi}}`;
    bib += '\n}';

    return new Response(bib, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Access-Control-Allow-Origin': '*' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
