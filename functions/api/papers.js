// GET /api/papers
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
  'Next Ten Years: Create a Better Future': '未来十年.创造更美好的未来',
  'Subwavelength Optics': '亚波长光学',
  'Metamaterials': '超材料',
  'VSI: SIN Theory and Technology': '空间信息网络理论与技术',
};

export async function onRequest(context) {
  try {
    const { request, env } = context;
    const { searchParams } = new URL(request.url);
    const topic = searchParams.get('topic') || '';
    const sortBy = searchParams.get('sort') || 'citations';
    const q = searchParams.get('q') || '';
    const mode = searchParams.get('mode') || 'title';

    let sql = 'SELECT * FROM papers';
    const params = [];
    const conds = [];

    if (topic && topic !== 'all') {
      conds.push('topic = ?');
      params.push(topic);
    }

    if (q) {
      if (mode === 'author') {
        conds.push('LOWER(authors) LIKE ?');
      } else {
        conds.push('LOWER(title) LIKE ?');
      }
      params.push('%' + q.toLowerCase() + '%');
    }

    if (conds.length) sql += ' WHERE ' + conds.join(' AND ');

    if (sortBy === 'year') {
      sql += ' ORDER BY year DESC, total_citations DESC';
    } else {
      sql += ' ORDER BY total_citations DESC, year DESC';
    }

    const { results: papers } = await env.DB.prepare(sql).bind(...params).all();

    const { results: topics } = await env.DB.prepare(
      'SELECT topic, COUNT(*) as cnt, SUM(total_citations) as ct FROM papers GROUP BY topic ORDER BY ct DESC'
    ).all();

    const topicSummary = topics.map(t => ({
      topic: t.topic,
      zh: TOPIC_ZH[t.topic] || t.topic,
      count: t.cnt,
      citations: t.ct,
    }));

    return new Response(JSON.stringify({ papers, topics: topicSummary }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
