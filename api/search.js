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
const SYN = { evil: ['villain', 'supervillain', 'sinister', 'maniacal', 'scheme'], boss: ['employer', 'job', 'company'], fat: ['weight', 'obese', 'overweight', 'eating'], expelled: ['expel', 'suspended', 'kicked'], lonely: ['friends', 'friendship', 'alone'], truck: ['trucker', 'driver'], vacation: ['trip', 'travel', 'holiday'] };
const synonyms = ts => ts.concat(ts.flatMap(t => (SYN[t] || []).map(stem)));
const nt = s => String(s).toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const jac = (a, b) => { const A = new Set(a.split(' ')), B = new Set(b.split(' ')); let i = 0; A.forEach(w => B.has(w) && i++); return i / (A.size + B.size - i); };
// Maps titles the model suggests onto REAL database episodes only (exact or near-exact title match); anything else is discarded.
function hinted(pool, titles) {
  const out = [];
  for (const t of titles) { const n = nt(t); if (!n) continue; let best = null, bs = 0;
    for (const e of pool) { const j = nt(e.title) === n ? 1 : jac(nt(e.title), n); if (j > bs) { bs = j; best = e; } }
    if (best && bs >= 0.8 && !out.includes(best)) out.push(best); }
  return out;
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
  let terms = tok(q), hints = [];
  if (ai) {
    try {
      const x = await chat('A user is describing a Simpsons episode they want to find. Reply as JSON {"terms":[...],"titles":[...]}. "terms": up to 15 single words likely to appear in an official episode synopsis (character names, synonyms such as villain for evil, themes, settings). "titles": up to 4 exact Simpsons episode titles you are fairly confident match the description (empty list if unsure). These are only search hints.', q, 220);
      terms = terms.concat(tok((x.terms || []).join(' ')));
      hints = hinted(pool, (Array.isArray(x.titles) ? x.titles : []).slice(0, 4));
    } catch (e) {}
  }
  const ranked = rank(db, pool, synonyms(terms)).slice(0, 40).map(x => x.e), hid = new Set(hints.map(e => e.id));
  const cands = hints.concat(ranked.filter(e => !hid.has(e.id))).slice(0, 40);
  let out = { ids: cands.map(e => e.id), mode: 'keyword' };
  if (ai && cands.length) {
    try {
      const list = cands.map(e => ({ id: e.id, code: e.code, title: e.title, synopsis: e.synopsis.slice(0, 400), hinted: hid.has(e.id) }));
      const r = await chat('You match a user description to Simpsons episodes. You get candidate episodes with titles and official synopses; candidates with hinted=true were independently suggested as likely matches, so prefer them unless their synopsis clearly contradicts the request. Choose ONLY candidates that plausibly match, best first, at most 10. Never add episodes that are not in the list. If none plausibly match, return an empty list. Reply as JSON {"ids":[numbers]}.', JSON.stringify({ request: q, candidates: list }), 120);
      const valid = new Set(cands.map(e => e.id)), pick = [...new Set((r.ids || []).map(Number))].filter(i => valid.has(i));
      out = { ids: pick.concat(out.ids.filter(i => !pick.includes(i)).slice(0, pick.length ? 10 : 0)), mode: 'ai' };
    } catch (e) {}
  }
  if (memo.size > 300) memo.clear();
  memo.set(key, out);
  res.status(200).json(out);
};
