// Integration smoke test against a RUNNING `wrangler dev` (local D1).
//
//   Terminal 1:  npm run db:migrate:local && npm run dev
//   Terminal 2:  npm run smoke
//
// It posts a handful of rounds under unique map names, then checks — through
// the real HTTP surface — that: the key is enforced, garbage is clamped,
// counters accumulate into ONE row per (hour, map, mode), the dashboard
// refuses unauthenticated / forged cookies, and a properly signed session
// renders the numbers. With GOOGLE_TOKEN_URL pointed at this script's fake
// token endpoint (see .dev.vars notes below) it also drives /auth/callback
// end to end: allowed e-mail → session; unknown e-mail → 403; bad state → 400.
//
// Env: BASE (default http://127.0.0.1:8787), SESSION_SECRET / INGEST_KEY
// (defaults match .dev.vars.example), FAKE_TOKEN_PORT (default 8899).

import http from 'node:http';
import { signSession, SESSION_COOKIE, OAUTH_COOKIE } from '../src/auth.js';
import { b64urlEncode, utf8 } from '../src/util.js';

const BASE = process.env.BASE || 'http://127.0.0.1:8787';
const KEY = process.env.INGEST_KEY || 'dev-ingest-key';
const SECRET = process.env.SESSION_SECRET || 'dev-session-secret-change-me';
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'smoke-client-id';
const FAKE_PORT = Number(process.env.FAKE_TOKEN_PORT || 8899);
const ALLOWED = process.env.ALLOWED_EMAILS || 'info@moonlightergames.com';

let failures = 0;
let passes = 0;
function check(cond, msg, extra) {
  if (cond) { passes++; console.log('  ok   ', msg); }
  else { failures++; console.log('  FAIL ', msg, extra !== undefined ? `\n         ${String(extra).slice(0, 400)}` : ''); }
}
const section = (t) => console.log(`\n== ${t}`);

const stamp = Date.now().toString(36).slice(-5);
const MAP_A = `Smoke ${stamp} Alpha`;
const MAP_B = `Smoke ${stamp} Beta`;

const round = (over = {}) => ({
  map: MAP_A, mode: 'infectious', outcome: 'hunters', players: 7, survivors: 0, seconds: 183.4,
  chaseSeconds: 240, headStart: 1, painterHP: 1, hunterSpeed: 1, hunterJump: 1, pellets: 1, range: 1,
  paintSupply: 1, paintRegen: 1, groundedHeight: 1, fallDamage: 1, painterPaintBoost: 1, hunterPaintSlow: 1,
  gloveLaunch: 1, roundsPerLobby: 1, grounded: false, infinitePaint: false, wallJump: true, weapons: 'both',
  build: 'smoke', ...over,
});

async function post(body, key = KEY, raw = false) {
  return fetch(`${BASE}/r`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(key === null ? {} : { 'X-Key': key }) },
    body: raw ? body : JSON.stringify(body),
  });
}

async function main() {
  section('health');
  const hz = await fetch(`${BASE}/healthz`).catch((e) => ({ status: 0, error: e }));
  check(hz.status === 200, `GET /healthz → 200 (got ${hz.status})`, hz.error);
  if (hz.status !== 200) {
    console.log(`\nIs wrangler dev running at ${BASE}?  (npm run dev)`);
    process.exit(2);
  }

  section('ingest: key enforcement');
  check((await post(round(), null)).status === 401, 'no X-Key → 401');
  check((await post(round(), 'wrong-key')).status === 401, 'wrong X-Key → 401');
  check((await fetch(`${BASE}/r`)).status === 405, 'GET /r → 405');

  section('ingest: validation');
  check((await post('{not json', KEY, true)).status === 400, 'invalid JSON → 400');
  check((await post(round({ outcome: 'banana' }))).status === 400, 'unknown outcome → 400');
  check((await post(round({ players: 'lots' }))).status === 400, 'non-numeric players → 400');
  const big = await post(JSON.stringify(round({ map: 'x'.repeat(10000) })), KEY, true);
  check(big.status === 413, `oversized body → 413 (got ${big.status})`);

  section('ingest: rounds accumulate into one row per (hour, map, mode)');
  // MAP_A / infectious: 2 hunter wins + 1 painter win (3 survivors) + 1 abandoned
  check((await post(round())).status === 204, 'hunters win → 204');
  check((await post(round({ players: 999, seconds: -20, hunterSpeed: 9 }))).status === 204, 'clamped garbage still 204');
  check((await post(round({ outcome: 'painters', survivors: 3, players: 5, seconds: 252, weapons: 'gloves', grounded: true }))).status === 204, 'painters win → 204');
  check((await post(round({ outcome: 'abandoned', players: 3, seconds: 12 }))).status === 204, 'abandoned → 204');
  // MAP_B / classic: 1 painter win
  check((await post(round({ map: MAP_B, mode: 'classic', outcome: 'painters', survivors: 1, players: 4, seconds: 300, chaseSeconds: 300 }))).status === 204, 'other map/mode → 204');
  // MAP_A / freeze with an unknown mode string → 'other'
  check((await post(round({ mode: 'ZANY', outcome: 'hunters', players: 6, seconds: 100 }))).status === 204, 'unknown mode → stored as other → 204');

  section('dashboard: auth gate');
  const noCookie = await fetch(`${BASE}/`);
  const noCookieHtml = await noCookie.text();
  check(noCookie.status === 200 && /Sign in with Google|not configured/.test(noCookieHtml) && !/Rounds played/.test(noCookieHtml),
    'GET / without cookie → sign-in page, no data');
  const forged = await fetch(`${BASE}/`, { headers: { Cookie: `${SESSION_COOKIE}=eyJlbWFpbCI6ImluZm9AbW9vbmxpZ2h0ZXJnYW1lcy5jb20ifQ.AAAA` } });
  check(!/Rounds played/.test(await forged.text()), 'GET / with forged cookie → still the sign-in page');
  check((await fetch(`${BASE}/api/stats`)).status === 401, 'GET /api/stats without cookie → 401');
  const wrongSecret = await signSession('not-the-secret', { email: ALLOWED.split(',')[0], iat: 0, exp: 4102444800 });
  check((await fetch(`${BASE}/api/stats`, { headers: { Cookie: `${SESSION_COOKIE}=${wrongSecret}` } })).status === 401, 'cookie signed with the wrong secret → 401');
  const notListed = await signSession(SECRET, { email: 'stranger@example.com', iat: 0, exp: 4102444800 });
  check((await fetch(`${BASE}/api/stats`, { headers: { Cookie: `${SESSION_COOKIE}=${notListed}` } })).status === 401, 'valid cookie for a non-listed e-mail → 401');

  section('dashboard: signed-in view');
  const now = Math.floor(Date.now() / 1000);
  const cookie = `${SESSION_COOKIE}=${await signSession(SECRET, { email: ALLOWED.split(',')[0].trim(), iat: now, exp: now + 600 })}`;
  const auth = { headers: { Cookie: cookie } };

  const statsA = await (await fetch(`${BASE}/api/stats?range=24h&mode=infectious&map=${encodeURIComponent(MAP_A)}`, auth)).json();
  const tA = statsA.totals;
  check(tA.rounds === 3, `map A: rounds = 3 (2 hunters + 1 painters; abandoned excluded) → got ${tA.rounds}`);
  check(tA.hunter_wins === 2 && tA.painter_wins === 1, `map A: hunter_wins=2 painter_wins=1 → got ${tA.hunter_wins}/${tA.painter_wins}`);
  check(tA.abandoned === 1, `map A: abandoned = 1 → got ${tA.abandoned}`);
  check(tA.players_max === 32, `players clamped to 32 → players_max ${tA.players_max}`);
  check(tA.players_sum === 7 + 32 + 5, `players_sum = 44 → got ${tA.players_sum}`);
  check(Math.abs(tA.seconds_sum - (183.4 + 0 + 252)) < 0.01, `seconds_sum = 435.4 (negative clamped to 0) → got ${tA.seconds_sum}`);
  check(Math.abs(tA.hunter_speed_sum - (1 + 1.25 + 1)) < 1e-9, `hunter_speed clamped to 1.25 → sum ${tA.hunter_speed_sum}`);
  check(tA.survivors_sum === 3, `survivors only on painter wins → ${tA.survivors_sum}`);
  check(tA.weapons_both === 2 && tA.weapons_gloves === 1, `weapons split 2 both / 1 gloves → ${tA.weapons_both}/${tA.weapons_gloves}`);
  check(tA.grounded_rounds === 1, `grounded_rounds = 1 → ${tA.grounded_rounds}`);
  const statsAall = await (await fetch(`${BASE}/api/stats?range=24h&map=${encodeURIComponent(MAP_A)}`, auth)).json();
  const modesA = statsAall.byMode.map((m) => m.mode).sort();
  check(modesA.join(',') === 'infectious,other', `map A modes = infectious + other → ${modesA.join(',')}`);
  const other = statsAall.byMode.find((m) => m.mode === 'other');
  check(other && other.rounds === 1 && other.hunter_wins === 1, 'unknown mode round landed under "other"');
  check(statsAall.totals.rounds === 4 && statsAall.totals.hunter_wins === 3, `map A all modes: 4 rounds, 3 hunter wins → ${statsAall.totals.rounds}/${statsAall.totals.hunter_wins}`);
  check(statsAall.byMap.length === 1 && statsAall.byMap[0].map === MAP_A, 'byMap honours the map filter');
  check(statsAall.byMapMode.length === 2, `byMapMode has 2 rows (infectious, other) → ${statsAall.byMapMode.length}`);

  const rows = await (await fetch(`${BASE}/api/rows.json?range=24h&map=${encodeURIComponent(MAP_A)}`, auth)).json();
  const infRows = rows.filter((r) => r.mode === 'infectious');
  check(infRows.length >= 1 && infRows.length <= 2, `map A/infectious is 1 row (2 only if the test straddled an hour) → ${infRows.length}`);
  check(infRows.reduce((s, r) => s + r.rounds, 0) === 3 && infRows.reduce((s, r) => s + r.abandoned, 0) === 1, 'row counters sum to what was posted');
  check(infRows.every((r) => /^\d{4}-\d{2}-\d{2}T\d{2}$/.test(r.hour_utc)), 'hour_utc is the server\'s UTC hour bucket');
  check(infRows.every((r) => r.build === 'smoke'), 'build column carries the last seen build');

  const statsB = await (await fetch(`${BASE}/api/stats?range=7d&map=${encodeURIComponent(MAP_B)}&mode=classic`, auth)).json();
  check(statsB.totals.rounds === 1 && statsB.totals.painter_wins === 1 && statsB.totals.chase_seconds_sum === 300, 'map B / classic filtered totals');

  const page = await fetch(`${BASE}/?range=24h&mode=infectious&map=${encodeURIComponent(MAP_A)}`, auth);
  const html = await page.text();
  check(page.status === 200 && /Rounds played/.test(html), 'GET / with a valid session → dashboard');
  check(html.includes('67%'), 'page shows hunter win rate 67% (2 of 3)');
  check(html.includes(MAP_A), 'page lists the map');
  check(/Sign out/.test(html), 'page has a sign-out link');
  check(page.headers.get('content-security-policy')?.includes("default-src 'none'"), 'CSP header present');

  const csv = await fetch(`${BASE}/api/rows.csv?range=24h&map=${encodeURIComponent(MAP_A)}`, auth);
  const csvText = await csv.text();
  check(csv.status === 200 && csvText.startsWith('hour_utc,map,mode,rounds,'), 'CSV export has the schema header');
  check(csvText.split('\r\n').filter(Boolean).length >= 3, 'CSV has data rows');

  // Save the rendered dashboard for eyeballing (self-contained HTML).
  const { writeFileSync, mkdirSync } = await import('node:fs');
  mkdirSync('.smoke', { recursive: true });
  const all = await (await fetch(`${BASE}/?range=7d`, auth)).text();
  writeFileSync('.smoke/dashboard.html', all);
  console.log('  saved .smoke/dashboard.html (open it in a browser to eyeball the charts)');

  section('auth: /auth/login redirect');
  const login = await fetch(`${BASE}/auth/login`, { redirect: 'manual' });
  const loc = login.headers.get('location') || '';
  const setCookie = login.headers.get('set-cookie') || '';
  const authConfigured = login.status === 302;
  if (!authConfigured) {
    check(login.status === 503, `login without GOOGLE_CLIENT_ID → 503 "not configured" (got ${login.status})`);
    console.log('  (set GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET in .dev.vars to exercise the callback flow)');
  } else {
    const u = new URL(loc);
    check(u.origin === 'https://accounts.google.com' && u.pathname === '/o/oauth2/v2/auth', 'redirects to Google');
    check(u.searchParams.get('redirect_uri') === `${BASE}/auth/callback`, `redirect_uri = ${BASE}/auth/callback`);
    check(u.searchParams.get('scope') === 'openid email' && u.searchParams.get('response_type') === 'code', 'scope/response_type');
    const state = u.searchParams.get('state');
    const nonce = u.searchParams.get('nonce');
    const m = setCookie.match(new RegExp(`${OAUTH_COOKIE}=([^;]+)`));
    check(m && m[1] === `${state}.${nonce}`, 'state+nonce cookie matches the redirect params');
    check(/HttpOnly/.test(setCookie) && /SameSite=Lax/.test(setCookie) && /Path=\/auth/.test(setCookie), 'oauth cookie is HttpOnly, Lax, /auth');

    section('auth: /auth/callback against a fake Google token endpoint');
    const fake = await startFakeGoogle();
    try {
      const cb = (params, cookieVal) => fetch(`${BASE}/auth/callback?${new URLSearchParams(params)}`, {
        redirect: 'manual', headers: cookieVal ? { Cookie: `${OAUTH_COOKIE}=${cookieVal}` } : {},
      });
      // The fake token endpoint mints an ID token from whatever the "code" says.
      const code = (claims) => b64urlEncode(utf8.encode(JSON.stringify(claims)));
      const okClaims = { iss: 'https://accounts.google.com', aud: CLIENT_ID, email: ALLOWED.split(',')[0].trim(), email_verified: true, nonce, exp: now + 300 };

      const good = await cb({ code: code(okClaims), state }, `${state}.${nonce}`);
      const sc = good.headers.get('set-cookie') || '';
      check(good.status === 302 && good.headers.get('location') === '/', `allowed e-mail → 302 to / (got ${good.status})`, await good.text());
      const sess = sc.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));
      check(Boolean(sess), 'session cookie set');
      if (sess) {
        const dash = await fetch(`${BASE}/`, { headers: { Cookie: `${SESSION_COOKIE}=${sess[1]}` } });
        check(/Rounds played/.test(await dash.text()), 'the session cookie from the callback opens the dashboard');
      }

      const stranger = await cb({ code: code({ ...okClaims, email: 'stranger@gmail.com' }), state }, `${state}.${nonce}`);
      check(stranger.status === 403 && /Not on the list/.test(await stranger.text()), `unknown e-mail → 403 (got ${stranger.status})`);

      const badState = await cb({ code: code(okClaims), state: 'tampered' }, `${state}.${nonce}`);
      check(badState.status === 400, `state mismatch → 400 (got ${badState.status})`);
      const noCookieCb = await cb({ code: code(okClaims), state }, null);
      check(noCookieCb.status === 400, `missing oauth cookie → 400 (got ${noCookieCb.status})`);

      const badAud = await cb({ code: code({ ...okClaims, aud: 'someone-else' }), state }, `${state}.${nonce}`);
      check(badAud.status === 401, `wrong audience → 401 (got ${badAud.status})`);
      const badNonce = await cb({ code: code({ ...okClaims, nonce: 'x' }), state }, `${state}.${nonce}`);
      check(badNonce.status === 401, `nonce mismatch → 401 (got ${badNonce.status})`);
      const unverified = await cb({ code: code({ ...okClaims, email_verified: false }), state }, `${state}.${nonce}`);
      check(unverified.status === 401, `unverified e-mail → 401 (got ${unverified.status})`);
      const denied = await cb({ error: 'access_denied', state }, `${state}.${nonce}`);
      check(denied.status === 400, `user cancelled at Google → 400 (got ${denied.status})`);
    } finally {
      fake.close();
    }
  }

  section('logout');
  const lo = await fetch(`${BASE}/auth/logout`, { redirect: 'manual', headers: { Cookie: cookie } });
  check(lo.status === 302 && /Max-Age=0/.test(lo.headers.get('set-cookie') || ''), 'logout clears the session cookie');

  console.log(`\n${passes} passed, ${failures} failed`);
  process.exit(failures ? 1 : 0);
}

/** Minimal stand-in for https://oauth2.googleapis.com/token: echoes claims from `code`. */
function startFakeGoogle() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let body = '';
      req.on('data', (c) => { body += c; });
      req.on('end', () => {
        const params = new URLSearchParams(body);
        let claims;
        try {
          claims = JSON.parse(Buffer.from(params.get('code'), 'base64url').toString('utf8'));
        } catch {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'invalid_grant' }));
        }
        const seg = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
        const idToken = `${seg({ alg: 'RS256', typ: 'JWT' })}.${seg(claims)}.${seg({ sig: 'fake' })}`;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ access_token: 'fake', id_token: idToken, token_type: 'Bearer', expires_in: 3600 }));
      });
    });
    server.listen(FAKE_PORT, '127.0.0.1', () => resolve(server));
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
