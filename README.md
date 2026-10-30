# ArcadeGamingWorld — automated live testing

This is a **read-only** Playwright + GitHub Actions smoke-test package for https://www.arcadegamingworld.com. It does **not** change your site, submit fake leaderboard scores, or modify Cloudflare D1.

## Installation — GitHub website (no command line needed)

1. Download and unzip `ArcadeGamingWorld-Playwright-Tests.zip` on your computer.
2. Open your existing repository: https://github.com/elamuruguelango1989-debug/arcadegamingworld
3. On the `main` branch, choose **Add file → Upload files**.
4. Upload the **contents of the unzipped folder**, keeping these paths in the repository root:
   - `.github/workflows/arcade-playwright.yml`
   - `tests/site.spec.js`, `tests/games.spec.js`, `tests/api.spec.js`
   - `package.json`, `playwright.config.js`
   - `README.md` (optional; rename if you already have a README)
5. **Important:** Some upload interfaces skip hidden folders (`.github`). If necessary, choose **Add file → Create new file** and enter `.github/workflows/arcade-playwright.yml` as the filename, then paste the workflow contents. Use **Add file → Upload files** for the other files.
6. Commit to `main`. These files do not replace your existing games or site files.
7. In GitHub, open **Actions → ArcadeGamingWorld Live Playwright Tests → Run workflow → Run workflow**.
8. Wait for the run to finish. Click the run → **browser-tests** to see passed/failed tests.
9. At the bottom of the run, download the artifact named `arcade-playwright-report-...`. Unzip it and open `playwright-report/index.html` locally to see screenshots, failure traces and details. If your browser blocks local report resources, run `npx playwright show-report` locally.

## What is covered

- Desktop Chromium and emulated iPhone-size Chromium.
- HTTP status and page rendering for homepage, About, Contact, Privacy, How to Play and 18 standalone game landing pages.
- Full-page screenshots of every page and game landing page.
- Homepage game catalog, game-dialog open/close, game search.
- Mobile horizontal overflow checks on key pages.
- Sitemap, robots.txt and logo availability.
- GET-only `/api/leaderboard` and `/api/favorites` checks; `/api/runner` is diagnostic only.
- Automatic runs on test file changes, manual dispatch, and every Monday at 12:15 UTC.

## Important limitations

- **Smoke tests, not full game-solving tests.** They confirm game pages load and a homepage game dialog opens, but they do not yet verify every game-specific movement, scoring, or win condition.
- A successful landing-page test does not guarantee the full game is playable.
- The `www` domain is the default target. Change `BASE_URL` in the workflow if your preferred canonical domain is non-www.
- The API GET checks may need adjusting if your Cloudflare Functions require parameters, use different routes, or use POST only. A 400/405 is not automatically a failure; a 404 or 5xx is.
- Cloudflare bot protection or rate limiting may cause CI-only failures. Check logs before changing production security settings.
- This package was prepared from the site's known routes and a locally available earlier project copy; it has **not** been executed against the live website from this environment.

## Run on your computer (optional)

```bash
npm install
npx playwright install chromium
npm test
npx playwright show-report
```

## Troubleshooting

- **No workflow appears:** Confirm `.github/workflows/arcade-playwright.yml` exists in the `main` branch, not inside a nested package folder.
- **Page not found:** Verify the file was deployed to Cloudflare Pages, or update the path in the test.
- **API 404:** Verify the Cloudflare Pages Functions route and deployment; do not create a fake score to test it.
- **Game dialog test fails:** Your site's launcher selector may have changed; edit `tests/games.spec.js` accordingly.
- **Mobile overflow fails:** Inspect the saved screenshot to identify the overflowing component.
- **Tests fail right after a push:** Cloudflare may still be deploying. Wait for its production deployment to finish and use **Run workflow** again.
