# Mecha Tag round stats — Worker + D1 + private dashboard

The game's balance telemetry backend, and the private dashboard that reads it.

```
Mecha Tag host (server only, once per finished round)
   └─ POST https://mecha-tag-stats.threetwogun.workers.dev/r   (X-Key: shared secret)
        └─ Cloudflare Worker  ── clamps + validates ── one atomic upsert ──►  D1 (SQLite)
                                                                              one row per (UTC hour, map, mode)
You, in a browser
   └─ GET  https://mecha-tag-stats.threetwogun.workers.dev/      ── Sign in with Google (info@moonlightergames.com) ──►  dashboard
```

- **Cost: $0.** Everything sits inside the Workers/D1 free tiers with ~10× headroom on top
  of a 10× scale-up (table at the bottom). The free plan cannot bill.
- **Aggregate only.** No player names, ids or IPs — only counters per hour/map/mode. This is
  deliberate: it is cheaper *and* keeps the game out of GDPR / Steam-privacy-policy territory.
- **Reads are not metered per query.** The dashboard is a Worker route reading D1 — no BI tool
  re-scanning a warehouse on every refresh (the thing that produced the last game's bill).
- The design notes live in the game repo: `Mecha Doh/analytics.md`.

## Contents

```
stats-worker/
├── wrangler.toml            Worker + D1 binding + public vars (ALLOWED_EMAILS, SESSION_TTL_SECONDS)
├── migrations/0001_…sql     the round_stats table
├── src/
│   ├── index.js             router:  POST /r · GET / · /api/stats · /api/rows.{json,csv} · /auth/* · /healthz
│   ├── schema.js            THE column list + clamp ranges (mirrors RoundModifiers' Inspector ranges)
│   ├── ingest.js            validation/clamping + the single INSERT … ON CONFLICT DO UPDATE
│   ├── auth.js              Google sign-in (OAuth code flow) + HMAC session cookie + allow list
│   ├── stats.js             the dashboard's aggregate queries (one D1 batch), CSV export
│   ├── dashboard.js         the page (server-rendered tables/KPIs + inline SVG chart script)
│   └── pages.js, util.js    sign-in/error pages, helpers
├── test/                    unit tests (node --test):  npm test
└── scripts/
    ├── smoke.mjs            end-to-end checks against `wrangler dev`:  npm run smoke
    └── seed-local.mjs       a week of fake data for the LOCAL db:      npm run db:seed:local
```

---

## One-time setup (≈ 20 minutes)

You need: Node 20+ (you have it), a free **Cloudflare account**, and access to a **Google Cloud
project** for the OAuth client (the Firebase project `moonlightergameswebsite` is fine).

Run everything below from this folder:

```bash
cd "C:\Users\zacha\Documents\Moonlighter Games Website\stats-worker"
npm install
```

### 1. Log wrangler into Cloudflare

```bash
npx wrangler login
```
Opens a browser; approve. `npx wrangler whoami` should then print the account.

### 2. Create the database and paste its id

```bash
npm run db:create
```
Copy the printed `database_id` (a UUID) into `wrangler.toml`, replacing
`REPLACE_WITH_D1_DATABASE_ID`. Then create the table in it:

```bash
npm run db:migrate
```

### 3. Deploy the Worker

```bash
npm run deploy
```
First deploy on a fresh account asks you to pick a `workers.dev` subdomain (ours is `threetwogun`
— done 2026-08-16). At the end it prints the URL:

`https://mecha-tag-stats.threetwogun.workers.dev` — **this is your dashboard URL**, and
`…/r` is the game's endpoint. The dashboard is closed until steps 4–5 are done (it fails
closed: no secrets = nobody gets in, and the ingest route returns 503).

### 4. Set the two random secrets

Generate two long random strings (one for the game's key, one for the login cookie):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Run it twice, then:

```bash
npx wrangler secret put INGEST_KEY
npx wrangler secret put SESSION_SECRET
```
(each prompts for the value — paste one of the strings). Keep the `INGEST_KEY` string: it goes
into Unity in step 7. Secrets apply immediately; no redeploy needed.

### 5. Google sign-in — an OAuth client for the dashboard

In [Google Cloud Console](https://console.cloud.google.com/apis/credentials) with the project
`moonlightergameswebsite` selected (top bar):

1. **OAuth consent screen** (left menu; newer consoles call this *Google Auth Platform → Branding /
   Audience*), if the project has none yet:
   - *User type*: **Internal** if the project belongs to the moonlightergames.com Google
     Workspace org (then only org accounts can even attempt to sign in — best). If only
     **External** is offered, pick it, leave the app in *Testing*, and add
     `info@moonlightergames.com` under **Test users** — no Google verification is needed for that.
   - App name "Mecha Tag stats", support e-mail info@…, developer contact info@…. Scopes: none
     to add (we only ask for `openid email`).
2. **Credentials → + Create credentials → OAuth client ID** → Application type **Web application**,
   name "Mecha Tag stats dashboard".
   - **Authorized redirect URIs** → add exactly:
     `https://mecha-tag-stats.threetwogun.workers.dev/auth/callback`
     (optionally also `http://localhost:8787/auth/callback` for `wrangler dev`).
   - Create → copy the **Client ID** and **Client secret**.
3. Put them on the Worker:
   ```bash
   npx wrangler secret put GOOGLE_CLIENT_ID
   npx wrangler secret put GOOGLE_CLIENT_SECRET
   ```

Who may sign in is the `ALLOWED_EMAILS` var in `wrangler.toml` (currently just
`info@moonlightergames.com`; comma-separate to add more, then `npm run deploy`). Any other Google
account gets a polite 403 — even if it completes Google's login.

### 6. Open the dashboard

Visit `https://mecha-tag-stats.threetwogun.workers.dev` → **Sign in with Google** → pick
info@moonlightergames.com → you're in (empty state until the game reports something). The sign-in
lasts 30 days per browser (`SESSION_TTL_SECONDS`); *Sign out* is top-right.

### 7. Wire the game (Unity)

In the **game scene** (the one with the `MechaTag (Scene Settings)` object): the object already has
an `AnalyticsConfig` component if it was created after this feature landed; otherwise run
**MechaTag → Create Analytics Config** (adds it, selects it, nothing else). Fill in:

| Field | Value |
|---|---|
| Send Round Stats | ✔ |
| Endpoint Url | `https://mecha-tag-stats.threetwogun.workers.dev/r` |
| Ingest Key | the `INGEST_KEY` string from step 4 |
| Send From Editor | **off** normally — on only while testing, so your own Play sessions don't pollute the data |
| Log To Console | on while testing |

Then verify (this is the checklist from analytics.md):

1. `Send From Editor` **on**, `Log To Console` **on**, host a session in the editor, play a round to
   the end. Console shows `[MechaTag] Analytics: round reported (HTTP 204)` **once**; the
   dashboard (range *Last 24 hours*) shows 1 round. Then turn `Send From Editor` **off** again.
2. Guards: `Send Round Stats` off → no log line, no request. Join as a *client* → no request
   (only the host reports). Editor with `Send From Editor` off → no request.
3. It can't hurt the game: point `Endpoint Url` at a dead host (e.g. `https://127.0.0.1:9/r`)
   and finish a round — the results screen appears normally, no exception, at most a warning
   line if logging is on.

### 8. A friendlier URL: `moonlightergames.com/stats`

The site is on Firebase Hosting and its DNS is on Google, so a Cloudflare route on the domain
isn't available without moving nameservers (which would drag Google Workspace mail and the
Firebase site along — not worth it for this). A **redirect** from the site does the job: the
website repo's `firebase.json` → `hosting` carries

```json
"redirects": [
  { "source": "/stats", "destination": "https://mecha-tag-stats.threetwogun.workers.dev/", "type": 302 }
]
```
which goes live with the next hosting deploy from the website repo root:

```bash
npx firebase deploy --only hosting
```
(PowerShell, not Git Bash — see the site README.) After that, **https://moonlightergames.com/stats**
lands on the dashboard's sign-in page. It's a 302 on purpose, so browsers don't cache it forever
if the Worker URL ever changes. The URL doesn't need to be secret — the sign-in is the gate.

---

## Day to day

| Task | How |
|---|---|
| Live request log (see rounds land, see errors) | `npm run tail` |
| Peek at the last 20 rows | `npm run db:peek` |
| Export | dashboard footer → CSV / JSON (respects the current filters) |
| Add a viewer | edit `ALLOWED_EMAILS` in `wrangler.toml` → `npm run deploy` |
| Log everyone out | `npx wrangler secret put SESSION_SECRET` with a new value |
| Rotate the game key (abuse) | `npx wrangler secret put INGEST_KEY` new value → paste into Unity → ship a build |
| Redeploy after code changes | `npm run deploy` |
| Add a metric | `src/schema.js` (+ a `migrations/0002_….sql` with `ALTER TABLE round_stats ADD COLUMN … DEFAULT 0`) → `npm run db:migrate` → `npm run deploy`; then the Unity `RoundAnalytics.Payload` field |

### Local development & tests

```bash
npm test                    # unit tests: clamping, upsert SQL, auth/session, filters, rendering
cp .dev.vars.example .dev.vars
npm run db:migrate:local    # local SQLite under .wrangler/
npm run db:seed:local       # (optional) a week of plausible fake data to look at
npm run dev                 # http://127.0.0.1:8787
npm run smoke               # in a second terminal: 60+ end-to-end checks incl. the auth flow
```
To sign in to the *local* dashboard with Google, put the same OAuth client id/secret in `.dev.vars`
and add `http://localhost:8787/auth/callback` to the client's redirect URIs.

### Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Console: `report failed (…HTTP 401)` | `Ingest Key` in Unity ≠ `INGEST_KEY` secret |
| Console: `HTTP 503` | `INGEST_KEY` secret not set on the Worker |
| Console: `HTTP 400` | payload rejected — see `npm run tail` for the reason; means Unity and `schema.js` disagree |
| Google shows `redirect_uri_mismatch` | the redirect URI on the OAuth client must be exactly `https://…workers.dev/auth/callback` |
| "Not on the list" after Google login | that account isn't in `ALLOWED_EMAILS` (or you picked the wrong Google account — *Sign out and try another account*) |
| "Sign-in not configured" | one of `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `SESSION_SECRET` is missing |
| Dashboard empty after playing | editor session with `Send From Editor` off (by design), or you were a client, not the host |

---

## What gets stored

One row per **(UTC hour, map, game mode)** — the hour comes from the Worker's clock, never the
game's. Every column is a **sum or a count**; the dashboard divides at read time (sum ÷ rounds),
so any time window you slice later has correct averages.

| Column(s) | Meaning |
|---|---|
| `rounds`, `hunter_wins`, `painter_wins` | decided rounds and who won |
| `abandoned` | rounds that ended because the last painter left — counted, but kept out of `rounds` and every sum |
| `players_sum` / `players_max` | lobby size at round start (÷ rounds = average; max = biggest lobby) |
| `survivors_sum` | painters still standing at the buzzer (÷ painter_wins) |
| `seconds_sum` | round length, head start + chase (÷ rounds) |
| `*_sum` for every round rule | the host's ROUND SETUP values (chase length, HP/speed/pellet/range/paint scales, glove launch, rounds-per-lobby…) — ÷ rounds = the settings people *actually* played |
| `grounded_rounds`, `infinite_paint_rounds`, `wall_jump_rounds`, `weapons_*` | how many rounds had each toggle / loadout on |
| `build` | last game version seen in that bucket |

Server-side clamps (`src/schema.js`) mirror the Inspector ranges on `RoundModifiers`; players
1–32, seconds 0–3600, map names sanitized to 40 chars, unknown mode → `other`, unknown outcome →
rejected. Garbage is clamped or dropped, never stored raw.

## The shared key — being straight about it

The `X-Key` ships inside the game build, so anyone can pull it out. It stops casual drive-by
posting, nothing more. What actually protects you: the worst case is *skewed charts*, not a
bill — the free plan caps spend at zero by construction, requests over the free limit simply
fail (the game doesn't care), and clamping bounds how wrong any single fake round can be. If it's
ever abused, rotate the key in the next build. Not worth more engineering than that for balance
telemetry.

## Cost check (free tier vs 10× the last game)

Only the host posts, once per completed round. 200 concurrent players, 7 per round, ~5-minute
rounds ≈ **8,000 round-completions/day**.

| Free tier | Limit | Our usage |
|---|---|---|
| Workers requests | 100,000 / day | ~8,000 (8%) + your dashboard views |
| D1 rows written | 100,000 / day | ~8,000–16,000 (8–16%) |
| D1 rows read | 5,000,000 / day | a dashboard view reads a few hundred |
| D1 storage | 5 GB | ~30k rows/year at 3 maps × 3 modes — a rounding error |

**$0, with roughly 10× headroom on top of a 10× scale-up.** The first thing you'd ever hit is
the Workers request limit, and that's a $5/month plan away.
