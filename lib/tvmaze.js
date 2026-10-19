// Fetches and normalizes Simpsons episodes from TVmaze (https://www.tvmaze.com/api, CC BY-SA 4.0, no API key needed).
const BASE = process.env.TVMAZE_BASE || 'https://api.tvmaze.com';
const CHARS = require('../data/characters.json');
const rx = a => new RegExp('(?<![A-Za-z])(?:' + a.map(x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ")(?![A-Za-z])");
const MATCHERS = CHARS.map(c => ({ name: c.name, re: rx(c.aliases) }));
const strip = h => (h || '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;|&rsquo;|&lsquo;/g, "'").replace(/&nbsp;/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim();
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function get(url, tries = 4) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': 'simpsons-episode-finder', Accept: 'application/json' }, signal: AbortSignal.timeout(20000) });
      if (r.ok) return await r.json();
      if (r.status !== 429 && r.status < 500) { const e = new Error('HTTP ' + r.status + ' for ' + url); e.fatal = true; throw e; }
    } catch (e) { if (e.fatal || i === tries - 1) throw e; }
    await sleep(1000 * 2 ** i);
  }
  throw new Error('Request failed: ' + url);
}
async function findShowId() {
  try { const s = await get(BASE + '/shows/83'); if (/simpsons/i.test(s.name)) return s.id; } catch (e) {}
  const s = await get(BASE + '/singlesearch/shows?q=' + encodeURIComponent('the simpsons'));
  if (!/simpsons/i.test(s.name)) throw new Error('Could not identify The Simpsons on TVmaze');
  return s.id;
}
function normalize(raw) {
  const today = new Date().toISOString().slice(0, 10), by = new Map();
  for (const e of Array.isArray(raw) ? raw : []) {
    if (e.type && e.type !== 'regular') continue;                 // skip specials
    if (!e.season || !e.number || !e.name || !e.airdate || e.airdate > today) continue; // unreleased / incomplete
    const synopsis = strip(e.summary), key = e.season + 'x' + e.number, old = by.get(key);
    if (old && old.synopsis.length >= synopsis.length) continue;   // duplicate: keep the richer entry
    const text = e.name + ' ' + synopsis;
    by.set(key, { id: e.id, title: e.name.trim(), season: e.season, episode: e.number, code: 'S' + String(e.season).padStart(2, '0') + 'E' + String(e.number).padStart(2, '0'), airdate: e.airdate, synopsis, characters: MATCHERS.filter(m => m.re.test(text)).map(m => m.name), halloween: /treehouse of horror/i.test(e.name), url: e.url || null });
  }
  return [...by.values()].sort((a, b) => a.season - b.season || a.episode - b.episode);
}
async function fetchEpisodes() {
  const id = await findShowId();
  const raw = await get(BASE + '/shows/' + id + '/episodes');   // TVmaze returns the full list in one response (no pagination)
  const episodes = normalize(raw);
  if (!episodes.length) throw new Error('TVmaze returned no usable episodes');
  return { updated: new Date().toISOString(), source: 'TVmaze (CC BY-SA 4.0)', episodes };
}
module.exports = { fetchEpisodes, normalize };
