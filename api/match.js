const quotes = require('../data/quotes.json').quotes;
const hits = new Map();
const kw = (s, pool) => { const w = s.toLowerCase().match(/[a-z']{3,}/g) || [];
  return pool.map(q => { const h = [...q.tags, ...q.situations, q.tone, q.text].join(' ').toLowerCase();
    return { id: q.id, s: w.reduce((a, x) => a + (h.includes(x) ? 1 : 0), 0) }; }).sort((a, b) => b.s - a.s).map(x => x.id); };
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const ip = (req.headers['x-forwarded-for'] || 'x').split(',')[0], now = Date.now();
  const h = (hits.get(ip) || []).filter(t => now - t < 60000);
  if (h.length >= 8) return res.status(429).json({ error: 'Too many requests' });
  h.push(now); hits.set(ip, h);
  const { situation = '', character = 'All Characters' } = req.body || {};
  const s = String(situation).slice(0, 300).trim();
  if (!s) return res.status(400).json({ error: 'Empty situation' });
  const pool = quotes.filter(q => character === 'All Characters' || q.character === character);
  const base = kw(s, pool);
  if (!process.env.OPENAI_API_KEY || !pool.length) return res.status(503).json({ ids: base, mode: 'keyword' });
  try {
    const list = pool.map(q => ({ id: q.id, text: q.text, tags: q.tags, tone: q.tone, situations: q.situations }));
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + process.env.OPENAI_API_KEY },
      body: JSON.stringify({ model: 'gpt-4o-mini', temperature: 0.2, max_tokens: 150, response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: 'Rank the given quotes by how well they fit the user\'s situation, considering theme, emotion and humor. Use ONLY ids from the list. Reply as JSON: {"ids":["..."]} best first.' },
          { role: 'user', content: JSON.stringify({ situation: s, quotes: list }) }] }) });
    if (!r.ok) throw new Error('openai ' + r.status);
    const ai = JSON.parse((await r.json()).choices[0].message.content).ids || [];
    const valid = new Set(pool.map(q => q.id));
    const ids = [...new Set([...ai.filter(i => valid.has(i)), ...base])];
    res.status(200).json({ ids, mode: 'ai' });
  } catch (e) { res.status(200).json({ ids: base, mode: 'keyword' }); }
};
