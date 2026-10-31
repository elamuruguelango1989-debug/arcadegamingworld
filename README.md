# ArcadeGamingWorld — Real-time Multiplayer Ludo

**Non-destructive addition:** this package adds a new `multiplayer-ludo.html` game page and its JS, plus a separate Cloudflare Worker. It does NOT overwrite `index.html`, `game-ludo.html`, or your current games and API.

## Contents
- `site/multiplayer-ludo.html` — standalone responsive game page
- `site/multiplayer-ludo.js` — WebSocket client and visual Ludo board
- `worker/src.js` — server-authoritative game rules and Durable Object room
- `worker/wrangler.jsonc` — Wrangler config with SQLite-backed Durable Object
- `README.md` — this guide

## 1. Upload to GitHub
1. Open `elamuruguelango1989-debug/arcadegamingworld` on GitHub.
2. Upload the **two files inside `site/`** to the repository root (not the `site/` directory): `multiplayer-ludo.html`, `multiplayer-ludo.js`.
3. Commit to `main`. Cloudflare Pages should deploy the new static files automatically.
4. Verify `https://www.arcadegamingworld.com/multiplayer-ludo.html` opens. The game will not connect until you deploy the Worker.

## 2. Deploy Cloudflare Worker (one-time, from your computer)
Prerequisites: Node.js 20+ and access to the same Cloudflare account that manages the domain.

```bash
cd worker
npx wrangler login
npx wrangler deploy
```

This creates the Worker `agw-ludo-multiplayer` and its SQLite-backed Durable Object. Note the `*.workers.dev` URL from the deployment output.

## 3. Route `/api/ludo/*` to the Worker (IMPORTANT)
In Cloudflare Dashboard, navigate to **Workers & Pages → agw-ludo-multiplayer → Settings → Domains & Routes → Add → Route** (menu labels may vary).

Add a route for **`www.arcadegamingworld.com/api/ludo/*`** on the Cloudflare zone `arcadegamingworld.com`, choosing this Worker. If visitors use the bare domain, also add **`arcadegamingworld.com/api/ludo/*`**.

Ensure your domain's DNS record is **proxied (orange cloud)**. **Do not add a catch-all `/*` route**, and do not replace your existing Pages project. These narrow routes preserve `/api/runner` and other endpoints.

If your Pages custom domain/route configuration conflicts, use a dedicated subdomain such as `ludo.arcadegamingworld.com` for the Worker and adjust the WebSocket and API URLs in the client accordingly; don't remove the Pages domain.

## 4. Test on two devices
1. Visit `https://www.arcadegamingworld.com/api/ludo/health` — expect `{"ok":true,"service":"ludo-multiplayer"}`.
2. On phone A, open `https://www.arcadegamingworld.com/multiplayer-ludo.html` and create a room.
3. Share the invite URL to phone B (on a different network if possible).
4. Phone B joins, and phone A clicks **Start match**.
5. Roll dice, move tokens, confirm both devices update immediately.
6. Refresh one device to verify reconnect with the same browser and nickname.

## 5. Add to homepage without replacing it
Edit your **current** GitHub `index.html`, adding this visible link near the games area:

```html
<a href="/multiplayer-ludo.html">🎲 Play Online Ludo with Friends — 2–4 players</a>
```

Avoid replacing your entire index file: the existing homepage may contain newer scripts and features.

## Rules and scope
- 2–4 player rooms, six-character room codes, server-side dice and move validation.
- Four tokens per player; roll six to enter; 52-square shared circuit; six-step home lane; exact 57 to finish; capture on non-safe squares; extra turn on six (max three rolls per turn).
- **Simplified Ludo variant**: circular track instead of a traditional cross-shaped board, no blockades or triple-six forfeiture. No bots, matchmaking, spectators, accounts, global rankings, or moderation yet.
- Rooms and player tokens are stored in Durable Objects; avoid posting private invite URLs publicly. Tokens are stored in localStorage and allow reconnection in the same browser.
- A disconnected player currently blocks their turn until they reconnect; add turn timers/forfeit controls before a public tournament.
- Room IDs are short invite codes, **not security boundaries**. Use longer unguessable codes or invitations/auth for private sensitive play.
- No gambling or real-money prizes.

## Troubleshooting
- 404 `/api/ludo/health`: Worker route missing or wrong hostname.
- 426 on `/api/ludo/room/ABC234/ws`: expected if opened in a normal browser; requires WebSocket upgrade.
- 502 / 1101: inspect Cloudflare Worker logs; check Wrangler Durable Object binding and migration.
- `Disconnected`: confirm WebSocket route, browser network, and Cloudflare Worker deploy.
- `Match already started`: new browser has no saved reconnect token; original device can rejoin using its stored token.

## Security and launch considerations
This is an MVP for friendly private games, not a hardened public tournament service. Add room expiry, rate limits, turn timeout, abuse protection, reconnect authentication upgrades, and automated multiplayer tests before high traffic.
