// Usage: node scripts/fetch-episodes.js   (set OUT to change the output path)
const fs = require('fs'), { fetchEpisodes } = require('../lib/tvmaze');
const OUT = process.env.OUT || 'data/episodes.json';
(async () => {
  const fresh = await fetchEpisodes();
  let old = { episodes: [] };
  try { old = JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch (e) {}
  if (old.episodes.length && fresh.episodes.length < old.episodes.length * 0.9) throw new Error(`Refusing to overwrite: new data has ${fresh.episodes.length} episodes, existing has ${old.episodes.length}`);
  const merged = new Map(old.episodes.map(e => [e.code, e]));
  fresh.episodes.forEach(e => merged.set(e.code, e));
  const episodes = [...merged.values()].sort((a, b) => a.season - b.season || a.episode - b.episode);
  const added = episodes.length - old.episodes.length, changed = JSON.stringify(episodes) !== JSON.stringify(old.episodes);
  if (changed) fs.writeFileSync(OUT, JSON.stringify({ updated: fresh.updated, source: fresh.source, episodes }));
  console.log(`${changed ? 'Updated' : 'No changes'}: ${episodes.length} episodes (${added} new), ${episodes.filter(e => !e.synopsis).length} without synopsis, ${episodes.filter(e => e.characters.length).length} with character tags.`);
})().catch(e => { console.error('Update failed:', e.message); process.exit(1); });
