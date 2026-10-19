const { fetchEpisodes } = require('./tvmaze');
let cache = null, at = 0;
// Uses data/episodes.json when populated; otherwise pulls live from TVmaze so the site works even before the first scheduled update.
async function getDB() {
  if (cache && Date.now() - at < 864e5) return cache;
  let db = { episodes: [] };
  try { db = require('../data/episodes.json'); } catch (e) {}
  if (!db.episodes || !db.episodes.length) db = await fetchEpisodes();
  cache = db; at = Date.now();
  return db;
}
module.exports = { getDB };
