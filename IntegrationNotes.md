# Integration Notes for f1crazy

## Overview

**F1 Crazy** is a single-player arcade racing game set on a stylised Monaco Formula One street circuit. Players pick a zany driver, hustle around the twelve-corner Monaco centreline, and hoover up crazy pickups — bananas, pineapples, rubber ducks, flying baguettes and the occasional mystery crate — for points. Three laps, one score, one global leaderboard.

The repository is deliberately a **single-package monorepo-less layout**:

| Layer | Technology | Location |
|---|---|---|
| Frontend | Next.js (App Router, JSX, React 18) | repository root — `app/`, `components/`, `lib/` |
| Game engine | Framework-free 2D canvas simulation | `lib/game/engine.js` |
| Backend API | Node + Express | `server/` |
| Database | MySQL via `mysql2/promise` | `schema.sql`, `server/config/db.js` |
| Auth | `express-session` + `express-mysql-session` + `bcryptjs` | `server/config/session.js`, `server/controllers/authController.js` |
| Payments | none | — |

There is **exactly one `package.json`**, at the repository root, holding both the frontend and backend dependencies. There are no workspaces, no `concurrently`, and no nested package manifests.

The two halves are deployed as separate origins and talk over HTTPS with cookies:

```
Browser
  │
  ├── https://f1crazy.arx-app.com            (Next.js, `next build` + `next start`/host)
  │        └── lib/api.js → fetch(credentials: 'include')
  │
  └── https://f1crazy-api.arx-app.com:4119   (Express, server/index.js)
           └── mysql2 pool ──► MySQL (f1crazy database)
```

The Express API **never serves the Next.js app**. Cross-origin session cookies are made to work by setting `SameSite=None; Secure` on the `f1crazy.sid` cookie and by allowing any `https://*.arx-app.com` origin with `credentials: true` in the CORS layer.

The frontend is written to degrade gracefully: no API call happens at module scope or during SSR, so an unreachable API yields loading/error/empty states rather than a broken render. Guests can still race — `app/play/page.jsx` falls back to a local-only result and `app/garage/page.jsx` falls back to `lib/game/characters.js`.

---

## Prerequisites

- **Node.js >= 18** (enforced by the `engines` field in `package.json`). Node 18+ is required for the global `fetch` and `AbortController` used in `lib/api.js`.
- **npm 9+** (ships with Node 18).
- **MySQL 8.0+** (or MariaDB 10.6+) with a database and user you can create. `utf8mb4` is assumed throughout `schema.sql`.
- **TLS certificate + private key** if you intend to terminate HTTPS inside the API process (`SSL_ENABLED=true`). The deploy convention expects them under `/home/arx-app/backends/certs/`.
- **PM2** (optional, for production process supervision): `npm install -g pm2`.
- A POSIX shell for `START.sh` (it uses `#!/usr/bin/env bash` and `set -euo pipefail`).

---

## Installation

```bash
# 1. Clone and enter the project
git clone <your-repo-url> f1crazy
cd f1crazy

# 2. Install all dependencies (frontend + backend, single package.json)
npm install

# 3. Create your environment file from the template
cp .env.example .env
# then edit .env — at minimum set SESSION_SECRET, DB_* and NEXT_PUBLIC_API_BASE_URL
```

### Create the database and schema

```bash
# Create the database and a dedicated user (adjust to taste)
mysql -u root -p -e "CREATE DATABASE f1crazy CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p -e "CREATE USER 'f1crazy'@'127.0.0.1' IDENTIFIED BY 'your-secret-here';"
mysql -u root -p -e "GRANT ALL PRIVILEGES ON f1crazy.* TO 'f1crazy'@'127.0.0.1'; FLUSH PRIVILEGES;"

# Apply the schema (tables, indexes, seed rows, express-mysql-session `sessions` table)
mysql -u root -p f1crazy < schema.sql
```

`schema.sql` creates `users`, `characters`, `items`, `races`, `inventories` and the `sessions` table required by `express-mysql-session`. Because `sessions` is defined here, `server/config/session.js` constructs the store with `createDatabaseTable: false` — do **not** skip the schema step or sessions will fail at runtime.

### Seed (or re-seed) the catalogues

```bash
node server/db/seed.js
```

This script loads `dotenv`, upserts the six characters and seven crazy items with `INSERT ... ON DUPLICATE KEY UPDATE` (kept consistent with `lib/game/characters.js`, `lib/game/items.js` and the `schema.sql` seed rows), optionally creates the demo user `paddock_pete` with a bcrypt-hashed password and three sample races, prints a summary, and exits `0` on success / `1` on failure. It is idempotent and safe to re-run after a catalogue change.

### Build the frontend

```bash
npm run build
```

`next build` reads `NEXT_PUBLIC_API_BASE_URL` at build time and inlines it into the client bundle. **If you change that variable you must rebuild.**

---

## Environment Variables

All variables live in `.env` at the repository root (a template is provided at `.env.example`, which contains placeholder values only — never commit real secrets).

| Variable | Description | Example |
|---|---|---|
| `PORT` | Port the Express API binds to (assigned by the deploy script). Read in `server/index.js`; never hardcoded. | `4119` |
| `NODE_ENV` | Node environment. Controls error-detail suppression in `server/middleware/errorHandler.js`. | `production` |
| `SSL_ENABLED` | Set to the string `'true'` to terminate TLS directly in the API process via `https.createServer`. Any other value falls back to `http.createServer`. | `true` |
| `SSL_CERT_PATH` | Absolute path to the TLS certificate file, read with `fs.readFileSync` at startup. | `/home/arx-app/backends/certs/certificate.crt` |
| `SSL_KEY_PATH` | Absolute path to the TLS private key file. | `/home/arx-app/backends/certs/private.key` |
| `SSL_CA_PATH` | Optional absolute path to a CA bundle file; included in the HTTPS options only when present. | `/home/arx-app/backends/certs/ca_bundle.crt` |
| `SESSION_SECRET` | Secret used to sign the `express-session` cookie (`f1crazy.sid`). Use a long random string; rotating it invalidates all sessions. | `change-me-to-a-long-random-string` |
| `DB_HOST` | MySQL server hostname used by the `mysql2/promise` pool and the session store. | `127.0.0.1` |
| `DB_USER` | MySQL username. | `f1crazy` |
| `DB_PASSWORD` | MySQL password. | `your-secret-here` |
| `DB_NAME` | MySQL database name. | `f1crazy` |
| `NEXT_PUBLIC_API_BASE_URL` | Public base URL of the F1 Crazy API used by the browser. Consumed in `lib/api.js` as `process.env.NEXT_PUBLIC_API_BASE_URL \|\| 'https://f1crazy-api.arx-app.com:4119'`. Because it is `NEXT_PUBLIC_*` it is baked into the client bundle at build time. | `https://f1crazy-api.arx-app.com:4119` |

> **Cookie note:** `server/config/session.js` sets `cookie: { httpOnly: true, secure: true, sameSite: 'none' }`. `Secure` cookies are only accepted over HTTPS, so for a working login flow both the frontend origin and `NEXT_PUBLIC_API_BASE_URL` must be HTTPS. For plain-HTTP local experimentation, expect auth to fail in the browser while unauthenticated routes (`/health`, `/api/game/characters`, `/api/leaderboard`) keep working.

---

## Running the Application

The `scripts` block in `package.json` is intentionally minimal and contains exactly three entries:

```json
{
  "build": "next build",
  "start": "node server/index.js",
  "server": "node server/index.js"
}
```

### Backend API

```bash
# Foreground
npm run server          # identical to: npm start  → node server/index.js

# Or via the deploy helper
chmod +x START.sh
./START.sh
```

`START.sh` `cd`s to its own directory, exports `PORT=4119` and the SSL paths if they are not already set, runs `npm install --omit=dev` when `node_modules` is missing, then launches the API detached:

```
nohup node server/index.js >> logs/api.log 2>&1 &
```

and writes the PID to `api.pid`. Create the log directory first if it does not exist:

```bash
mkdir -p logs
```

Stop it with `kill "$(cat api.pid)"`.

### Frontend

The `start` script is reserved for the API, so run the Next.js server directly:

```bash
npm run build           # produces .next/
npx next start -p 3000  # production frontend
# or, during development:
npx next dev -p 3000
```

### Smoke tests

```bash
# Liveness (no DB touch)
curl -k https://localhost:4119/health
# → {"status":"ok"}

# Liveness + database ping (checkDatabaseConnection)
curl -k https://localhost:4119/api/health

# Catalogues
curl -k https://localhost:4119/api/game/characters
curl -k https://localhost:4119/api/game/items

# Leaderboard (returns rows: [] rather than an error when empty)
curl -k "https://localhost:4119/api/leaderboard?range=week&limit=10"
```

Auth and race flows require a cookie jar:

```bash
curl -k -c jar.txt -X POST https://localhost:4119/api/auth/signup \
  -H 'Content-Type: application/json' \
  -d '{"username":"paddock_pete","email":"pete@example.com","password":"bananas123"}'

curl -k -b jar.txt https://localhost:4119/api/auth/me
```

### PM2 (production)

`ecosystem.config.js` is pinned to the deploy path:

```js
module.exports = {
  apps: [{
    name: 'f1crazy',
    script: 'server/index.js',
    cwd: '/home/arx-app/backends/f1crazy',
    env: { NODE_ENV: 'production', PORT: 4119 }
  }]
};
```

```bash
pm2 start ecosystem.config.js
pm2 logs f1crazy
pm2 save && pm2 startup
```

If you deploy elsewhere, update `cwd` to match.

---

## Project Structure

```
f1crazy/
├── package.json              # the ONLY manifest: next, react, express, mysql2,
│                             # express-session, express-mysql-session, bcryptjs,
│                             # cors, dotenv, cookie-parser
├── next.config.js            # reactStrictMode; no rewrites — API is its own origin
├── ecosystem.config.js       # PM2 app definition (name f1crazy, port 4119)
├── START.sh                  # nohup launcher, writes api.pid, logs to logs/api.log
├── .env.example              # template for every variable above
├── schema.sql                # utf8mb4 tables + indexes + character/item seed rows
├── README.md                 # full docs: endpoints, architecture, structure tree
│
├── app/                      # Next.js App Router
│   ├── globals.css           # THE single stylesheet — design tokens (colour, 4px
│   │                         # spacing scale, type scale, radii, shadows, z-index),
│   │                         # base typography, layout + component classes.
│   │                         # Imported exactly once, from app/layout.jsx.
│   ├── layout.jsx            # server component; metadata, SessionProvider,
│   │                         # SiteHeader / <main className="container page"> / SiteFooter
│   ├── page.jsx              # landing: hero, how-it-works cards, item strip, top-5 preview
│   ├── play/page.jsx         # race page: HUD + RaceCanvas + ResultsModal, submits results
│   ├── garage/page.jsx       # character selection with API fetch + local fallback
│   ├── leaderboard/page.jsx  # all-time / this-week toggle, full LeaderboardTable
│   ├── login/page.jsx        # centred Card form → SessionProvider.login()
│   ├── signup/page.jsx       # username/email/password/confirm → SessionProvider.signup()
│   └── profile/page.jsx      # career stats, recent races Table, inventory Badges
│
├── components/
│   ├── SessionProvider.jsx   # context: {user, status, selectedCharacter}, login/signup/
│   │                         # logout/refresh; getMe() runs in useEffect only
│   ├── layout/
│   │   ├── SiteHeader.jsx    # sticky single-row header, 4 nav links, 44px mobile toggle
│   │   └── SiteFooter.jsx    # auto-fit link columns + full-width brand + bottom bar
│   ├── ui/                   # Button, Field, Card, Modal (createPortal + focus trap),
│   │                         # Table, Badge, Spinner, EmptyState
│   ├── game/                 # RaceCanvas (16/9 stage, DPR scaling, rAF loop), HUD,
│   │                         # ItemIcon, CharacterPicker, CharacterAvatar, ResultsModal
│   └── leaderboard/
│       └── LeaderboardTable.jsx
│
├── lib/
│   ├── api.js                # API_BASE_URL, request() with credentials:'include',
│   │                         # 10s AbortController timeout, typed ApiError;
│   │                         # getHealth/signup/login/logout/getMe/getCharacters/
│   │                         # selectCharacter/getItems/submitRace/getMyRaces/
│   │                         # getMyStats/getMyInventory/getLeaderboard
│   └── game/
│       ├── characters.js     # CHARACTERS fallback catalogue + DEFAULT_CHARACTER_SLUG
│       ├── items.js          # ITEMS with points/rarity/spawnWeight + pickWeightedItem
│       ├── track.js          # TRACK centreline (Sainte-Dévote → Anthony Noghès),
│       │                     # buildTrackPath, sampleTrackPoint, nearestCentrelineInfo
│       └── engine.js         # createRaceEngine: fixed-timestep physics, lap detection,
│                             # luck-weighted spawns, collisions, 3-lap finish, renderer
│
└── server/
    ├── index.js              # dotenv, cors (https://*.arx-app.com + localhost,
    │                         # credentials), express.json 100kb, cookie-parser,
    │                         # session, /health + /api/health, routers, notFound,
    │                         # errorHandler, http/https listen on PORT 0.0.0.0
    ├── config/
    │   ├── db.js             # mysql2/promise pool (connectionLimit 10, keepAlive,
    │   │                     # utf8mb4) + checkDatabaseConnection()
    │   └── session.js        # express-session + express-mysql-session store,
    │                         # name 'f1crazy.sid', SameSite=None, Secure, 7d
    ├── middleware/
    │   ├── auth.js           # requireAuth (401) + attachUser (non-fatal)
    │   └── errorHandler.js   # notFound, errorHandler, AppError; ER_DUP_ENTRY → 409
    ├── routes/               # auth.js, game.js, leaderboard.js
    ├── controllers/          # authController.js, gameController.js,
    │                         # leaderboardController.js
    └── db/
        └── seed.js           # idempotent catalogue upsert + optional demo data
```

### Key behavioural contracts worth knowing before you integrate

- **Server-authoritative scoring.** `server/controllers/gameController.js#submitRace` does not trust the client score. It validates item slugs against the `items` table, recomputes the total from stored `points_value` columns, clamps score to `0..100000` and laps to `1..10`, then writes the race, upserts `inventories` with `ON DUPLICATE KEY UPDATE`, and increments `users.total_points` / `users.races_played` — all inside one transaction on a pooled connection.
- **Every query is parameterised** via `pool.execute` / `connection.execute`; `multipleStatements` is `false` on the pool.
- **One styling approach only.** `app/globals.css` is plain global CSS with design tokens. There are no CSS Modules, no Tailwind and no CSS-in-JS anywhere in the tree. All spacing comes from flex/grid `gap`, never child margins or spacer elements.
- **No SSR fetching.** `lib/api.js` functions are never called at module scope; every consumer calls them inside `useEffect` or an event handler, so an API outage degrades to a visible error state with a retry button.

---

## Next Steps / Production Considerations

**Secrets and configuration**
- Replace the `SESSION_SECRET` placeholder with at least 32 bytes of randomness: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.
- Keep `.env` out of version control; `.env.example` is the only env file that should be committed.
- Give the MySQL user the minimum grants it needs (`SELECT, INSERT, UPDATE, DELETE` on `f1crazy.*`) rather than `ALL PRIVILEGES`.

**TLS and networking**
- In-process TLS (`SSL_ENABLED=true`) is convenient but means certificate renewal requires a process restart. Add a post-renew hook (`pm2 reload f1crazy`) to your ACME client, or move TLS to a reverse proxy and set `SSL_ENABLED=false`.
- If you do put nginx/Caddy in front, you must enable `app.set('trust proxy', 1)` in `server/index.js` (it is currently off) so `express-session` still issues `Secure` cookies.
- Lock the CORS origin list down from the wildcard `https://*.arx-app.com` pattern to the exact frontend origin once the domain is final.

**Database**
- Add automated backups (`mysqldump f1crazy`) and test a restore. Race history and inventories are not reconstructible.
- `express-mysql-session` prunes expired rows on an interval, but monitor the `sessions` table size; add an index-aware cleanup job if traffic grows.
- The indexes on `races(user_id)` and `races(score DESC)` cover current queries. If the leaderboard becomes hot, consider a materialised `leaderboard_cache` table refreshed on a schedule instead of the live `GROUP BY` in `leaderboardController.js`.
- Re-run `node server/db/seed.js` after any character or item balance change so the DB, `lib/game/characters.js` and `lib/game/items.js` stay in agreement.

**Hardening**
- Add rate limiting (e.g. `express-rate-limit`) to `POST /api/auth/login`, `POST /api/auth/signup` and `POST /api/game/races` to blunt credential stuffing and score spam.
- Consider raising bcrypt cost from 10 rounds as hardware allows, and add a server-side plausibility check on submitted lap times (a `bestLapMs` below the physically achievable minimum for the character should be rejected).
- Add `helmet` for baseline security headers on the API and a Content-Security-Policy on the frontend — the app uses only inline SVG and CSS gradients, no remote images or fonts, so a strict policy is achievable.

**Observability**
- `START.sh` appends to `logs/api.log` with no rotation. Add `logrotate`, or prefer PM2 with `pm2 install pm2-logrotate`.
- Point your uptime monitor at `/api/health` (which exercises `checkDatabaseConnection`) rather than `/health`, so a dead database actually trips the alarm.

**Frontend delivery**
- `NEXT_PUBLIC_API_BASE_URL` is inlined at build time — changing environments requires `npm run build` again, not just a restart.
- Verify the layout at 360px width: the header nav must collapse to the 44×44px toggle below 1024px and nothing should scroll horizontally.
- Confirm `prefers-reduced-motion` is honoured — the spinner animation and all transitions are disabled under that query, and the canvas loop should be reviewed for motion-sensitivity if you add screen shake or similar effects.

**Gameplay roadmap**
- Ghost replays (store input traces alongside races), weekly rotating item modifiers, and per-character leaderboards are all additive against the existing `races` schema.
- Character unlock gating currently compares `characters.unlock_points` against `users.total_points` in the UI; enforce it server-side in `selectCharacter` before shipping competitive features.

## Database Provisioning

A mysql database has been automatically provisioned for this app.

- **Database:** app_f1crazy
- **Host:** testdb.gridiron-app.com
- **Port:** 3306
- **User:** f1crazy
- **Credentials stored in Vault at:** `secret/data/mysql/f1crazy`

Retrieve the password securely from Vault and set it as an environment variable (e.g. `DB_PASSWORD`) in your deployment settings — do not commit it to source control.
