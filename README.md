# F1 Crazy — Monaco Street Scramble

A single-player arcade racing game where zany drivers blast around a stylised version of the Monaco Formula One street circuit, hoovering up crazy pickups — bananas, pineapples, rubber ducks, flying baguettes and the legendary golden pineapple — for points, glory and a place on the global leaderboard.

- **Frontend:** [https://f1crazy.arx-app.com](https://f1crazy.arx-app.com)
- **API:** [https://f1crazy-api.arx-app.com:4119](https://f1crazy-api.arx-app.com:4119)

---

## Table of contents

1. [Overview](#overview)
2. [Features](#features)
3. [Architecture](#architecture)
4. [Tech stack](#tech-stack)
5. [Project structure](#project-structure)
6. [Environment variables](#environment-variables)
7. [MySQL setup](#mysql-setup)
8. [Local development](#local-development)
9. [API reference](#api-reference)
10. [Game design notes](#game-design-notes)
11. [Deployment (PM2)](#deployment-pm2)
12. [Troubleshooting](#troubleshooting)

---

## Overview

F1 Crazy is a browser arcade racer built on an HTML `<canvas>`. The simulation is deliberately framework-free: a fixed-timestep physics loop (throttle, brake, steering, grip, off-track slowdown) drives a car around a waypoint-defined Monaco circuit that runs from Sainte-Dévote, up the hill through Massenet and Casino, down to Mirabeau and the Grand Hotel Hairpin, through Portier, the Tunnel, the Nouvelle Chicane, Tabac, the Swimming Pool complex, Rascasse and finally Anthony Noghès.

Races are three laps long. Pickups spawn on the racing line weighted by your chosen character's `luck` stat. Hazards (hello, traffic cone) subtract points. When the chequered flag drops the result is posted to the Express API, which **recomputes the score authoritatively from the server-side item catalogue** before storing it — the client is never trusted.

Guests can play immediately; signed-in drivers get persistent career stats, a crazy-item inventory and leaderboard entries.

---

## Features

- 🏎️ **Canvas arcade racer** — fixed-timestep physics, lap detection, kerbs, barriers and a tunnel section, all rendered with a palette-driven 2D renderer.
- 🤪 **Six zany characters** — Banana Baron, Pineapple Pete, Turbo Tortoise, Disco Dolores, Sir Honks-a-Lot and Neon Nina, each with distinct top speed / handling / luck stats and an inline-SVG avatar (no external image assets anywhere).
- 🍍 **Seven crazy pickups** — banana (25), pineapple (50), rubber duck (40), traffic cone (−15 hazard), flying baguette (75), golden pineapple (250) and the mystery crate (random payout).
- 🏆 **Global leaderboard** — all-time and last-7-days ranges, ranked by best score then best lap.
- 👤 **Session auth** — signup/login/logout with bcryptjs hashing and an `express-mysql-session` backed cookie that works cross-origin between the frontend and API hosts.
- 📦 **Inventory & career stats** — every item you collect is banked against your account with `ON DUPLICATE KEY UPDATE` upserts.
- ♿ **Accessible UI** — real `<button>` elements, visible focus rings, ≥44×44px hit areas, `role="dialog"` modals with focus trapping, `prefers-reduced-motion` support.
- 📱 **Mobile-first** — works down to 360px with no horizontal scroll; on-screen touch controls for the race.
- 🛡️ **Graceful degradation** — the API is never called during SSR, and if it is unreachable the UI falls back to the local character/item catalogues and plays in local-only mode.

---

## Architecture

```
                         ┌──────────────────────────────────────┐
                         │              Browser                 │
                         │  https://f1crazy.arx-app.com         │
                         └──────────────────┬───────────────────┘
                                            │
                    ┌───────────────────────┴────────────────────────┐
                    │                                                │
         ┌──────────▼───────────┐                        ┌───────────▼─────────────┐
         │  Next.js (App Router)│   fetch (credentials   │  Express API            │
         │  repository root     │   : 'include', CORS)   │  server/index.js        │
         │                      ├───────────────────────►│  https://f1crazy-api    │
         │  app/  components/   │                        │  .arx-app.com:4119      │
         │  lib/   public/      │◄───────────────────────┤                         │
         │                      │   JSON + session cookie│  routes → controllers   │
         │  canvas game engine  │                        │  express-session        │
         │  lib/game/engine.js  │                        │  (express-mysql-session)│
         └──────────────────────┘                        └───────────┬─────────────┘
                                                                     │ mysql2/promise
                                                                     │ pool (limit 10)
                                                         ┌───────────▼─────────────┐
                                                         │        MySQL            │
                                                         │  users, characters,     │
                                                         │  items, races,          │
                                                         │  inventories, sessions  │
                                                         └─────────────────────────┘
```

Key points:

- There is **one** `package.json`, at the repository root, declaring both frontend and backend dependencies.
- The Next.js frontend lives at the repository root (`app/`, `components/`, `lib/`, `public/`) — **not** in a `frontend/`, `client/` or `web/` subfolder.
- The Express API lives under `server/` and is reached **directly over its own HTTPS origin**. There are no Next.js rewrites or proxying.
- The API never serves the Next.js app; the two are deployed independently.

---

## Tech stack

| Layer      | Technology |
|------------|------------|
| Frontend   | Next.js (App Router), React, plain global CSS (`app/globals.css`) with design tokens |
| Game       | Vanilla JS 2D canvas engine, `requestAnimationFrame`, fixed timestep |
| Backend    | Node.js ≥ 18, Express, express-session, express-mysql-session, cookie-parser, cors, dotenv |
| Database   | MySQL 8 (utf8mb4) via `mysql2/promise` |
| Auth       | Session cookies + bcryptjs password hashing |
| Process    | PM2 (`ecosystem.config.js`) or `./START.sh` |

---

## Project structure

```
.
├── app/                         # Next.js App Router (frontend, at repo root)
│   ├── globals.css              # THE single global stylesheet (design tokens + components)
│   ├── layout.jsx               # Root layout: SessionProvider, SiteHeader, main, SiteFooter
│   ├── page.jsx                 # Landing page: hero, how-it-works, items strip, top-5 preview
│   ├── play/page.jsx            # The race: HUD + RaceCanvas + ResultsModal
│   ├── garage/page.jsx          # Character selection
│   ├── leaderboard/page.jsx     # Full leaderboard (all-time / this week)
│   ├── login/page.jsx           # Sign in
│   ├── signup/page.jsx          # Create account
│   └── profile/page.jsx         # Career stats, recent races, item inventory
│
├── components/
│   ├── SessionProvider.jsx      # Auth context: user, status, selectedCharacter, login/signup/logout
│   ├── layout/
│   │   ├── SiteHeader.jsx       # Sticky header, 4 nav links, mobile toggle
│   │   └── SiteFooter.jsx       # Footer link columns + bottom bar
│   ├── ui/
│   │   ├── Button.jsx           # variant/size/loading primitive
│   │   ├── Field.jsx            # Labelled input with error/hint wiring
│   │   ├── Card.jsx             # Surface with optional header row
│   │   ├── Modal.jsx            # Portal dialog, focus trap, Escape to close
│   │   ├── Table.jsx            # Scrollable table with skeleton + empty states
│   │   ├── Badge.jsx            # Pill label
│   │   ├── Spinner.jsx          # Accessible loading spinner
│   │   └── EmptyState.jsx       # Centred empty block with inline SVG art
│   ├── game/
│   │   ├── RaceCanvas.jsx       # Canvas host, DPR scaling, input wiring
│   │   ├── HUD.jsx              # Lap / time / score / speed / recent items
│   │   ├── ItemIcon.jsx         # Inline SVG per crazy item
│   │   ├── CharacterPicker.jsx  # Selectable character grid
│   │   ├── CharacterAvatar.jsx  # Inline SVG avatar per character
│   │   └── ResultsModal.jsx     # End-of-race summary
│   └── leaderboard/
│       └── LeaderboardTable.jsx # Preview + full leaderboard table
│
├── lib/
│   ├── api.js                   # Browser API client (credentials:'include', 10s timeout, ApiError)
│   └── game/
│       ├── characters.js        # CHARACTERS fallback catalogue + helpers
│       ├── items.js             # ITEMS catalogue + pickWeightedItem
│       ├── track.js             # TRACK waypoints + sampling helpers
│       └── engine.js            # createRaceEngine: physics, laps, pickups, renderer
│
├── server/                      # Express API
│   ├── index.js                 # App entry: cors, session, routers, http/https listen
│   ├── config/
│   │   ├── db.js                # mysql2 pool + checkDatabaseConnection
│   │   └── session.js           # express-session + express-mysql-session store
│   ├── middleware/
│   │   ├── auth.js              # requireAuth, attachUser
│   │   └── errorHandler.js      # notFound, errorHandler, AppError
│   ├── routes/
│   │   ├── auth.js              # /api/auth
│   │   ├── game.js              # /api/game
│   │   └── leaderboard.js       # /api/leaderboard
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── gameController.js
│   │   └── leaderboardController.js
│   └── db/
│       └── seed.js              # Idempotent catalogue + demo data seeder
│
├── schema.sql                   # MySQL schema + seed rows
├── next.config.js
├── ecosystem.config.js          # PM2
├── START.sh                     # Background API launcher
├── .env.example
├── package.json                 # The ONLY package.json
└── README.md
```

---

## Environment variables

Copy `.env.example` to `.env` and fill in real values. Never commit `.env`.

```bash
cp .env.example .env
```

| Variable | Required | Example / default | Description |
|---|---|---|---|
| `PORT` | yes | `4119` | Port the Express API binds to (assigned by the deploy script). Never hardcoded in source. |
| `NODE_ENV` | no | `production` | Node environment. Controls error verbosity in `errorHandler`. |
| `SSL_ENABLED` | no | `true` | When `'true'` the API terminates TLS itself via `https.createServer`; otherwise plain `http`. |
| `SSL_CERT_PATH` | if SSL | `/home/arx-app/backends/certs/certificate.crt` | Absolute path to the TLS certificate. |
| `SSL_KEY_PATH` | if SSL | `/home/arx-app/backends/certs/private.key` | Absolute path to the TLS private key. |
| `SSL_CA_PATH` | no | `/home/arx-app/backends/certs/ca_bundle.crt` | Optional CA bundle; included only when present. |
| `SESSION_SECRET` | yes | `change-me-to-a-long-random-string` | Secret used to sign the `f1crazy.sid` session cookie. |
| `DB_HOST` | yes | `localhost` | MySQL server hostname. |
| `DB_USER` | yes | `f1crazy` | MySQL username. |
| `DB_PASSWORD` | yes | `your-db-password` | MySQL password. |
| `DB_NAME` | yes | `f1crazy` | MySQL database name. |
| `NEXT_PUBLIC_API_BASE_URL` | yes (build time) | `https://f1crazy-api.arx-app.com:4119` | Public API base URL baked into the browser bundle. `lib/api.js` falls back to this exact value when unset. |

> **Note:** `NEXT_PUBLIC_*` variables are inlined at **build** time. Change it before `npm run build`, not after.

---

## MySQL setup

1. **Create the database and a user** (adjust names/passwords to taste):

   ```sql
   CREATE DATABASE f1crazy CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER 'f1crazy'@'localhost' IDENTIFIED BY 'your-db-password';
   GRANT ALL PRIVILEGES ON f1crazy.* TO 'f1crazy'@'localhost';
   FLUSH PRIVILEGES;
   ```

2. **Apply the schema** (creates all tables and inserts the character/item seed rows):

   ```bash
   mysql -u root -p f1crazy < schema.sql
   ```

3. **Seed / refresh catalogues and optional demo data**:

   ```bash
   node server/db/seed.js
   ```

   The seeder is idempotent — it uses `INSERT ... ON DUPLICATE KEY UPDATE` for the six characters and seven items, and can create a demo driver `paddock_pete` with a few sample races. It exits `0` on success and `1` on failure.

### Tables created by `schema.sql`

| Table | Purpose |
|---|---|
| `users` | `id`, `username` (unique), `email` (unique), `password_hash`, `selected_character_slug`, `total_points`, `races_played`, `created_at` |
| `characters` | `id`, `slug` (unique), `name`, `tagline`, `description`, `top_speed`, `handling`, `luck`, `accent_color`, `unlock_points`, `is_starter` |
| `items` | `id`, `slug` (unique), `name`, `svg_key`, `points_value`, `rarity` (`common`/`rare`/`legendary`), `description` |
| `races` | `id`, `user_id` (FK → users), `character_slug`, `score`, `items_collected`, `best_lap_ms`, `total_time_ms`, `laps`, `created_at` — indexed on `user_id` and `score DESC` |
| `inventories` | `id`, `user_id` (FK → users), `item_slug`, `quantity`, unique on `(user_id, item_slug)` |
| `sessions` | `session_id` varchar(128) PK, `expires` int, `data` mediumtext — used by `express-mysql-session` (`createDatabaseTable: false`) |

---

## Local development

Requirements: **Node.js ≥ 18** and a reachable **MySQL 8** instance.

```bash
# 1. Install all dependencies (frontend + backend, single package.json)
npm install

# 2. Configure environment
cp .env.example .env
#    …then edit .env with your DB credentials and SESSION_SECRET

# 3. Create schema + seed data
mysql -u root -p f1crazy < schema.sql
node server/db/seed.js

# 4. Build the Next.js frontend
npm run build

# 5. Start the Express API (this is what `npm start` runs)
npm start
```

### Available scripts

| Command | What it does |
|---|---|
| `npm run build` | `next build` — produces the production Next.js build. |
| `npm start` | `node server/index.js` — starts the Express API. |
| `npm run server` | `node server/index.js` — identical alias for the API. |

### `./START.sh`

Convenience launcher used on the deployment host. It:

1. `cd`s to its own directory,
2. exports `PORT=4119` and the SSL paths if they are not already set,
3. runs `npm install --omit=dev` when `node_modules/` is missing,
4. launches `nohup node server/index.js >> logs/api.log 2>&1 &` and writes the PID to `api.pid`.

```bash
chmod +x START.sh
./START.sh
tail -f logs/api.log
```

### Local notes

- During development the API's CORS origin callback allows any `https://*.arx-app.com` origin **plus** `localhost`, with `credentials: true`.
- The session cookie is `secure: true; sameSite: 'none'`, which browsers only accept over HTTPS. For fully local work either set `SSL_ENABLED=true` with a local certificate, or run the frontend against the deployed API.
- Set `NEXT_PUBLIC_API_BASE_URL=https://localhost:4119` before `npm run build` if you want the browser bundle to talk to a local API.

---

## API reference

Base URL: `https://f1crazy-api.arx-app.com:4119`

All responses are JSON. All authenticated endpoints rely on the `f1crazy.sid` session cookie, so browser requests **must** use `credentials: 'include'` (`lib/api.js` does this for you). Errors use the shape `{ "error": "message" }`.

| Status | Meaning |
|---|---|
| `200` | OK |
| `201` | Created (signup, race submitted) |
| `400` | Validation failure |
| `401` | `{"error":"Not authenticated"}` |
| `404` | `{"error":"Route not found"}` |
| `409` | Duplicate username/email (`ER_DUP_ENTRY`) |
| `500` | `{"error":"Internal server error"}` |

### Health

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | — | Liveness probe. Returns `{ "status": "ok" }`. |
| `GET` | `/api/health` | — | Readiness probe including DB status via `checkDatabaseConnection()`. Returns `{ "status": "ok", "database": "connected" \| "unavailable" }`. |

### Auth — `/api/auth`

| Method | Path | Auth | Body / Query | Returns |
|---|---|---|---|---|
| `POST` | `/api/auth/signup` | — | `{ username, email, password }` | `201 { user }` — username 3–24 chars `[A-Za-z0-9_]`, valid email, password ≥ 8 chars. Password hashed with bcryptjs (10 rounds); session regenerated. |
| `POST` | `/api/auth/login` | — | `{ username, password }` (username **or** email accepted) | `200 { user }` or `401 { error }`. |
| `POST` | `/api/auth/logout` | — | — | `200 { ok: true }`. Destroys the session and clears the cookie. |
| `GET` | `/api/auth/me` | optional | — | `200 { user }` when signed in, `200 { user: null }` for guests (never 401). |

Sanitised user shape:

```json
{
  "id": 7,
  "username": "paddock_pete",
  "email": "pete@example.com",
  "selectedCharacterSlug": "banana-baron",
  "totalPoints": 4820,
  "racesPlayed": 13
}
```

### Game — `/api/game`

| Method | Path | Auth | Body / Query | Returns |
|---|---|---|---|---|
| `GET` | `/api/game/characters` | — | — | `{ characters: [{ slug, name, tagline, description, topSpeed, handling, luck, accentColor, unlockPoints, isStarter }] }` |
| `GET` | `/api/game/items` | — | — | `{ items: [{ slug, name, points, rarity, description }] }` |
| `POST` | `/api/game/character` | ✅ | `{ slug }` | `{ user }` with the updated `selectedCharacterSlug`. 400 if the slug is unknown or still locked. |
| `POST` | `/api/game/races` | ✅ | `{ characterSlug, score, laps, bestLapMs, totalTimeMs, items: [{ slug, count }] }` | `201 { race, rank }`. Score is **recomputed server-side** from the `items` table; `score` is clamped 0–100000 and `laps` 1–10. Race insert, inventory upsert and user totals all run in one transaction. |
| `GET` | `/api/game/me/races` | ✅ | — | `{ races: [...] }` — the 10 most recent races, newest first. |
| `GET` | `/api/game/me/stats` | ✅ | — | `{ stats: { totalPoints, racesPlayed, bestScore, bestLapMs } }` |
| `GET` | `/api/game/me/inventory` | ✅ | — | `{ inventory: [{ slug, name, quantity, rarity, points }] }` |

Example race submission:

```bash
curl -X POST https://f1crazy-api.arx-app.com:4119/api/game/races \
  -H 'Content-Type: application/json' \
  -b 'f1crazy.sid=…' \
  -d '{
    "characterSlug": "pineapple-pete",
    "score": 735,
    "laps": 3,
    "bestLapMs": 41230,
    "totalTimeMs": 128540,
    "items": [
      { "slug": "banana", "count": 8 },
      { "slug": "pineapple", "count": 5 },
      { "slug": "golden-pineapple", "count": 1 },
      { "slug": "traffic-cone", "count": 2 }
    ]
  }'
```

### Leaderboard — `/api/leaderboard`

| Method | Path | Auth | Query | Returns |
|---|---|---|---|---|
| `GET` | `/api/leaderboard` | — | `range=all\|week` (default `all`), `limit=1..100` (default `20`) | `{ range, rows: [{ rank, username, characterSlug, score, bestLapMs, races }] }` |

Rows aggregate `MAX(score)`, `MIN(best_lap_ms)` and `COUNT(*)` per driver, ordered by best score descending then best lap ascending. When no races exist the endpoint returns `{ "range": "all", "rows": [] }` — never an error.

```bash
curl 'https://f1crazy-api.arx-app.com:4119/api/leaderboard?range=week&limit=10'
```

---

## Game design notes

### Scoring

| Item | Slug | Points | Rarity |
|---|---|---|---|
| 🍌 Banana | `banana` | +25 | common |
| 🍍 Pineapple | `pineapple` | +50 | common |
| 🦆 Rubber duck | `rubber-duck` | +40 | common |
| 🚧 Traffic cone | `traffic-cone` | **−15** (hazard) | common |
| 🥖 Flying baguette | `flying-baguette` | +75 | rare |
| 🏆 Golden pineapple | `golden-pineapple` | +250 | legendary |
| 📦 Mystery crate | `mystery-crate` | random | rare |

(Emoji above are for this document only — the app renders every icon as an inline SVG via `components/game/ItemIcon.jsx`.)

### Characters

Six starters/unlockables: `banana-baron`, `pineapple-pete`, `turbo-tortoise`, `disco-dolores`, `sir-honks-a-lot`, `neon-nina`. Each has `topSpeed`, `handling` and `luck` (1–10). Top speed and handling feed the physics model directly; luck biases the weighted item spawn table. Characters with `unlock_points > 0` require that many career points before they can be selected.

### Controls

| Action | Keyboard | Touch |
|---|---|---|
| Accelerate | `↑` / `W` | On-screen ▲ button |
| Brake / reverse | `↓` / `S` | On-screen ▼ button |
| Steer left | `←` / `A` | On-screen ◀ button |
| Steer right | `→` / `D` | On-screen ▶ button |

All on-screen controls are ≥ 44×44px. The canvas sits in an `aspect-ratio: 16/9` stage wrapper so there is no layout shift, and is scaled for `devicePixelRatio`.

---

## Deployment (PM2)

The repository ships with `ecosystem.config.js`:

```js
module.exports = {
  apps: [
    {
      name: 'f1crazy',
      script: 'server/index.js',
      cwd: '/home/arx-app/backends/f1crazy',
      env: { NODE_ENV: 'production', PORT: 4119 }
    }
  ]
};
```

### First deploy

```bash
cd /home/arx-app/backends/f1crazy

npm install --omit=dev
cp .env.example .env            # then edit with real values
mysql -u root -p f1crazy < schema.sql
node server/db/seed.js

npm run build                   # build the Next.js frontend
pm2 start ecosystem.config.js
pm2 save
```

### Day-to-day

```bash
pm2 restart f1crazy       # restart after a code change
pm2 reload  f1crazy       # zero-downtime reload
pm2 logs    f1crazy       # tail logs
pm2 status                # process table
pm2 stop    f1crazy
pm2 delete  f1crazy
```

### TLS

With `SSL_ENABLED=true` the API reads `SSL_CERT_PATH`, `SSL_KEY_PATH` and (when present) `SSL_CA_PATH` with `fs.readFileSync` and serves HTTPS directly on `PORT`, binding `0.0.0.0`. Otherwise it serves plain HTTP and is expected to sit behind a TLS-terminating proxy. The session cookie's `secure: true; sameSite: 'none'` settings require HTTPS end-to-end for cross-origin auth between `f1crazy.arx-app.com` and `f1crazy-api.arx-app.com`.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Browser shows "Could not reach the pit wall" / local-only mode | API down or CORS origin rejected | Check `pm2 logs f1crazy`; confirm the frontend origin matches `https://*.arx-app.com` or `localhost`. |
| Logged in but `GET /api/auth/me` returns `{"user":null}` | Session cookie not sent | Ensure both origins are HTTPS, requests use `credentials: 'include'`, and `SESSION_SECRET` is stable across restarts. |
| `ER_NO_SUCH_TABLE: ...sessions` | Schema not applied | Run `mysql -u root -p f1crazy < schema.sql`. The store uses `createDatabaseTable: false`. |
| `ER_ACCESS_DENIED_ERROR` on boot | Wrong `DB_USER` / `DB_PASSWORD` / `DB_HOST` | Verify `.env` and the MySQL grants. |
| `409` on signup | Username or email already taken (`ER_DUP_ENTRY`) | Choose different credentials. |
| `EADDRINUSE` on start | Port 4119 already bound | `pm2 delete f1crazy` or kill the stale PID in `api.pid`. |
| Frontend still calls the old API host | `NEXT_PUBLIC_API_BASE_URL` is build-time | Update `.env` then re-run `npm run build`. |
| Submitted score differs from the on-screen score | Expected — the server recomputes from the `items` table | Confirm the item slugs sent match the seeded catalogue. |

---

## Licence

Private project. All characters, items and track stylisation are original creations and are not affiliated with Formula One, the Automobile Club de Monaco or any rights holder.