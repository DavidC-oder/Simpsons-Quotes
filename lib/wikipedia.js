// Enriches episodes with Wikipedia lead text + Plot section (CC BY-SA 4.0). Titles are matched to real articles and validated.
const { get } = require('./tvmaze');
const BASE = process.env.WIKI_BASE || 'https://en.wikipedia.org';
const API = p => BASE + '/w/api.php?' + new URLSearchParams({ action: 'query', format: 'json', formatversion: '2', redirects: '1', explaintext: '1', ...p });
const clean = s => (s || '').replace(/\s+/g, ' ').trim();
const ok = p => p && !p.missing && !p.invalid && /Simpsons/.test(p.extract || '') && /episode/i.test(p.extract || '') && !/may refer to/i.test(p.extract || '');
const cut = (s, n) => { if (s.length <= n) return s; const c = s.slice(0, n), i = c.lastIndexOf('. '); return i > n * 0.5 ? c.slice(0, i + 1) : c; };
async function intros(titles) {                       // 20 titles per request (MediaWiki limit for extracts)
  const out = new Map();
  for (let i = 0; i < titles.length; i += 20) {
    const batch = titles.slice(i, i + 20);
    let j; try { j = await get(API({ prop: 'extracts', exintro: '1', exlimit: '20', titles: batch.join('|') })); } catch (e) { continue; }
    const q = j.query || {}, m = new Map(), pages = new Map((q.pages || []).map(p => [p.title, p]));
    [...(q.normalized || []), ...(q.redirects || [])].forEach(r => m.set(r.from, r.to));
    for (const t of batch) { let k = t, n = 0; while (m.has(k) && n++ < 5) k = m.get(k); const p = pages.get(k); if (ok(p)) out.set(t, { title: p.title, extract: p.extract }); }
  }
  return out;
}
async function plot(title) {
  try {
    const j = await get(API({ prop: 'extracts', exsectionformat: 'wiki', titles: title })), text = (j.query.pages[0] || {}).extract || '';
    const m = text.match(/^==\s*(Plot|Plot summary|Synopsis)\s*==\s*$/mi); if (!m) return '';
    const rest = text.slice(m.index + m[0].length), end = rest.search(/^==[^=]/m);
    return clean(cut(clean((end < 0 ? rest : rest.slice(0, end)).replace(/=+[^=\n]+=+/g, ' ')), 6500));
  } catch (e) { return ''; }
}
// Mutates the given episodes: sets e.wiki = { title, url, intro, plot } when a validated article is found.
async function enrich(episodes, log = console.log) {
  let todo = episodes.map(e => ({ e, base: e.title.replace(/[’‘]/g, "'").replace(/[“”]/g, '"') }));
  const found = new Map();
  for (const suffix of ['', ' (The Simpsons)', ' (The Simpsons episode)', ' (episode)']) {
    if (!todo.length) break;
    const res = await intros(todo.map(x => x.base + suffix));
    todo = todo.filter(x => { const r = res.get(x.base + suffix); if (r) found.set(x.e, r); return !r; });
  }
  let n = 0;
  for (const [e, r] of found) {
    e.wiki = { title: r.title, url: BASE + '/wiki/' + encodeURIComponent(r.title.replace(/ /g, '_')), intro: cut(clean(r.extract), 1100), plot: await plot(r.title) };
    if (++n % 100 === 0) log('  wikipedia: ' + n + '/' + found.size);
    await new Promise(r => setTimeout(r, 120));
  }
  return { matched: found.size, unmatched: todo.length };
}
module.exports = { enrich };
