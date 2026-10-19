// Usage: node scripts/fetch-episodes.js   (set OUT to change the output path)
const fs = require('fs'), { fetchEpisodes, tag } = require('../lib/tvmaze'), { enrich } = require('../lib/wikipedia');
const OUT = process.env.OUT || 'data/episodes.json';
(async () => {
  const fresh = await fetchEpisodes();
  let old = { episodes: [] };
  try { old = JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch (e) {}
  if (old.episodes.length && fresh.episodes.length < old.episodes.length * 0.9) throw new Error(`Refusing to overwrite: new data has ${fresh.episodes.length} episodes, existing has ${old.episodes.length}`);
  const merged = new Map(old.episodes.map(e => [e.code, e]));
  fresh.episodes.forEach(e => { const o = merged.get(e.code); if (o && o.wiki && o.title === e.title) e.wiki = o.wiki; merged.set(e.code, e); });
  const episodes = [...merged.values()].sort((a, b) => a.season - b.season || a.episode - b.episode);
  let wiki = '';
  if (!process.env.SKIP_WIKI) {
    const need = episodes.filter(e => !e.wiki);
    console.log(`Wikipedia enrichment for ${need.length} episodes...`);
    const r = await enrich(need);
    episodes.forEach(e => { e.characters = tag(e.title + ' ' + e.synopsis + ' ' + (e.wiki ? e.wiki.intro : '')); });
    wiki = ` ${episodes.filter(e => e.wiki).length} with Wikipedia details (${r.unmatched} unmatched this run).`;
  }
  const added = episodes.length - old.episodes.length, changed = JSON.stringify(episodes) !== JSON.stringify(old.episodes);
  if (changed) fs.writeFileSync(OUT, JSON.stringify({ updated: fresh.updated, source: fresh.source, episodes }));
  console.log(`${changed ? 'Updated' : 'No changes'}: ${episodes.length} episodes (${added} new), ${episodes.filter(e => !e.synopsis).length} without synopsis, ${episodes.filter(e => e.characters.length).length} with character tags.${wiki}`);
})().catch(e => { console.error('Update failed:', e.message); process.exit(1); });
