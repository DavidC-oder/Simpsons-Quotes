const { getDB } = require('../lib/db');
const OPENAI = process.env.OPENAI_BASE || 'https://api.openai.com';
const hits = new Map(), memo = new Map(), idx = new WeakMap();
const STOP = new Set('the and for with that this episode episodes simpsons simpson want find looking about where when who what which whats there their have has had are was were get gets got tries try into from some any one all like really very just remember saw show'.split(' '));
const stem = w => (w.length > 4 ? w.replace(/(ing|ed|es|s)$/, '') : w);
const tok = s => (String(s).toLowerCase().match(/[a-z0-9]+/g) || []).filter(w => w.length > 2 && !STOP.has(w)).map(stem);
const filt = (eps, f = {}) => eps.filter(e => (!f.s || e.season == f.s) && (!f.c || e.characters.includes(f.c)) && (!f.h || e.halloween) && (!f.t || e.title.toLowerCase().includes(String(f.t).toLowerCase())) &&
  (!f.e || (f.e === 'classic' ? e.season <= 10 : Math.floor(+(e.airdate || '0').slice(0, 4) / 10) * 10 == +String(f.e).slice(1))));
function index(db) {
  if (idx.has(db)) return idx.get(db);
  const df = new Map(), docs = new Map();
  for (const e of db.episodes) {
    const t = tok(e.title), s = tok(e.synopsis), c = tok(e.characters.join(' '));
    docs.set(e.id, { t: new Set(t), s: new Map(s.map(w => [w, s.filter(x => x === w).length])), c: new Set(c) });
    new Set([...t, ...s, ...c]).forEach(w => df.set(w, (df.get(w) || 0) + 1));
  }
  const v = { df, docs, n: db.episodes.length }; idx.set(db, v); return v;
}
function rank(db, pool, terms) {
  const { df, docs, n } = index(db), ts = [...new Set(terms)];
  return pool.map(e => { const d = docs.get(e.id); let s = 0;
    for (const w of ts) { const idf = Math.log(1 + n / (1 + (df.get(w) || 0))); s += idf * ((d.t.has(w) ? 3 : 0) + Math.min(d.s.get(w) || 0, 2) + (d.c.has(w) ? 2 : 0)); }
    return { e, s }; }).filter(x => x.s > 0).sort((a, b) => b.s - a.s);
}
async function chat(sys, user, max) {
  const r = await fetch(OPENAI + '/v1/chat/completions', { method: 'POST', signal: AbortSignal.timeout(15000),
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + process.env.OPENAI_API_KEY },
    body: JSON.stringify({ model: 'gpt-4o-mini', temperature: 0.1, max_tokens: max, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: sys }, { role: 'user', content: user }] }) });
  if (!r.ok) throw new Error('openai ' + r.status);
  return JSON.parse((await r.json()).choices[0].message.content);
}
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const ip = (req.headers['x-forwarded-for'] || 'x').split(',')[0], now = Date.now();
  const h = (hits.get(ip) || []).filter(t => now - t < 60000);
  if (h.length >= 10) return res.status(429).json({ error: 'Too many searches. Try again in a minute.' });
  h.push(now); hits.set(ip, h);
  const { query = '', filters = {} } = req.body || {}, q = String(query).slice(0, 300).trim();
  let db; try { db = await getDB(); } catch (e) { return res.status(503).json({ error: 'Episode data is temporarily unavailable' }); }
  const pool = filt(db.episodes, filters);
  if (!q) return res.status(200).json({ ids: pool.map(e => e.id), mode: 'browse' });
  const key = q.toLowerCase() + '|' + JSON.stringify(filters);
  if (memo.has(key)) return res.status(200).json(memo.get(key));
  const ai = !!process.env.OPENAI_API_KEY;
  let terms = tok(q);
  if (ai) { try { const x = await chat('A user is describing a Simpsons episode. List up to 15 single words likely to appear in an official episode synopsis (character names, synonyms, themes, settings). Do not list episode titles. Reply as JSON {"terms":["..."]}.', q, 120); terms = terms.concat(tok((x.terms || []).join(' '))); } catch (e) {} }
  const cands = rank(db, pool, terms).slice(0, 25);
  let out = { ids: cands.map(x => x.e.id), mode: 'keyword' };
  if (ai && cands.length) {
    try {
      const list = cands.map(x => ({ id: x.e.id, code: x.e.code, title: x.e.title, synopsis: x.e.synopsis.slice(0, 450) }));
      const r = await chat('You match a user description to Simpsons episodes. You get candidate episodes with titles and official synopses. Choose ONLY candidates that plausibly match what the user describes, best first, at most 10. Judge using the provided data only; never add episodes that are not in the list. If none plausibly match, return an empty list. Reply as JSON {"ids":[numbers]}.', JSON.stringify({ request: q, candidates: list }), 120);
      const valid = new Set(cands.map(x => x.e.id)), pick = [...new Set((r.ids || []).map(Number))].filter(i => valid.has(i));
      out = { ids: pick.concat(out.ids.filter(i => !pick.includes(i)).slice(0, pick.length ? 10 : 0)), mode: 'ai' };
    } catch (e) {}
  }
  if (memo.size > 300) memo.clear();
  memo.set(key, out);
  res.status(200).json(out);
};
