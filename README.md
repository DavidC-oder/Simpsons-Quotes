# The Simpsons Episode Finder
Static site (index.html, results.html, style.css, app.js) + Vercel serverless functions (api/) + a TVmaze-powered episode database.
No paid services. Episode data: TVmaze (CC BY-SA 4.0, no API key).

## Deploy
1. Upload **every file and folder** to your GitHub repo (replace the old project): api/, lib/, data/, scripts/, .github/, index.html, results.html, style.css, app.js, package.json, vercel.json, README.md, .gitignore. Delete the old `api/match.js` and `data/quotes.json` if they remain.
2. Vercel redeploys automatically. Keep the env var `OPENAI_API_KEY` (Settings > Environment Variables). No other keys are needed.

## How the episode database works
- `data/episodes.json` starts empty. Until it is filled, the site loads episodes **live from TVmaze** (cached), so it works right after deploy.
- To fill/refresh the file: GitHub > Actions tab > "Update episodes" > Run workflow (in iPhone Safari, use "Request Desktop Website" if you don't see Actions). It also runs every Monday and commits changes, which triggers a Vercel redeploy. If the commit fails, enable Settings > Actions > General > Workflow permissions > Read and write.
- Or run `node scripts/fetch-episodes.js` on a computer.
- **Run the Action once.** TVmaze synopses are short TV-guide blurbs, so the update also pulls each episode's Wikipedia lead and Plot section (CC BY-SA 4.0; each card links to its source article). Articles are matched by title and rejected unless they mention The Simpsons and an episode. Unmatched episodes keep the TVmaze blurb only. This richer text is what makes searches like "evil villain with a flamethrower" work. It takes several minutes on the first run; later runs only fetch new episodes.
- The script retries on failures, de-duplicates by season+episode, skips specials and unreleased episodes, refuses to shrink the database by more than 10%, and leaves missing synopses empty rather than guessing.
- Character tags/filters come from names appearing in the TVmaze title/synopsis (add names in `data/characters.json`); they are not a full cast list. "Classic era" = Seasons 1-10; Treehouse of Horror = title match.

## Search
`/api/search`: (1) gpt-4o-mini expands your description into synopsis-style keywords and suggests likely episode titles (used only as hints and matched to real database titles), (2) keyword ranking over the real episodes, (3) gpt-4o-mini picks which of the top 40 candidates truly match, judged only from the supplied synopses. Returned ids are validated against the database, so nothing can be invented. Without an OpenAI key, or if OpenAI fails, keyword search is used. Costs are limited by 300-character inputs, small outputs, caching and 10 searches/min/IP.

## Effects
Picking a character in the Filters dropdown plays one themed item animation for that character (a preview on the home page, and again on the results page whatever the results are). Each character's item is listed in `FX` in `app.js`; edit the emoji there to change it. Treehouse of Horror episodes get a bloody, spooky card style.
