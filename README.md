# The Simpsons Quote Finder
Static site (index.html, style.css, app.js) + one Vercel serverless function (api/match.js). No build step, no database.

## Deploy (works from iPhone)
1. Create a GitHub repo and upload **every file and folder in this project** (api/, data/, index.html, style.css, app.js, package.json, README.md, .gitignore).
2. In Vercel: Add New → Project → import the repo → Deploy (no settings to change).
3. Vercel → Settings → Environment Variables: name `OPENAI_API_KEY`, value = your NEW key. Redeploy.
Without the key the site still works using keyword search.

## Adding quotes
Edit `data/quotes.json`, one record per quote (id, text, character, season, episode, episodeTitle, tags, tone, situations, verified, source). Set `verified:true` only after you check exact wording and episode against a source you are licensed to use (e.g. Frinkiac for checking). Do not bulk-copy transcripts. The AI call sends the whole filtered list each time, so past ~300 quotes move to a database with pre-filtering (e.g. Vercel KV/Postgres, or Supabase free tier).

## Cost controls
gpt-4o-mini, 150 max output tokens, 300-char input cap, 8 requests/min per IP (in-memory, best-effort). Also set a monthly spend limit in your OpenAI billing settings.
