const { getDB } = require('../lib/db');
module.exports = async (req, res) => {
  try {
    const db = await getDB();
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.status(200).json({ updated: db.updated || null, episodes: db.episodes });
  } catch (e) { res.status(503).json({ error: 'Episode data is temporarily unavailable' }); }
};
