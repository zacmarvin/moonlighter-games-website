// Seed the LOCAL D1 with a week of plausible telemetry so the dashboard can be
// eyeballed before the game has sent anything. Writes .smoke/seed.sql and
// applies it with `wrangler d1 execute --local`. Never touches production.
//
//   npm run db:seed:local
//
// Deterministic (seeded PRNG) so re-running produces the same rows; rows are
// INSERT OR REPLACE'd, so it is safe to run repeatedly.

import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { METRIC_COLS, RULE_SCALES, RULE_FLAGS } from '../src/schema.js';

let seed = 20260816;
const rand = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

const MAPS = [
  { name: 'Sinti City',   weight: 0.5, hunterWin: { infectious: 0.58, classic: 0.44, freeze: 0.50 } },
  { name: 'Fantasy City', weight: 0.3, hunterWin: { infectious: 0.41, classic: 0.30, freeze: 0.38 } },
  { name: 'Sci-Fi City',  weight: 0.2, hunterWin: { infectious: 0.66, classic: 0.52, freeze: 0.61 } },
];
const MODES = [['infectious', 0.7], ['classic', 0.2], ['freeze', 0.1]];
const HOURS = 7 * 24;
const now = Date.now();
const startHour = Math.floor((now - HOURS * 3600e3) / 3600e3) * 3600e3;

// Evening peak in US time-ish (UTC 23–05), quiet mornings.
const activity = (utcHour) => {
  const local = (utcHour + 24 - 5) % 24; // pretend the audience is UTC-5
  if (local >= 18 && local <= 23) return 1.0;
  if (local >= 12) return 0.5;
  if (local >= 8) return 0.25;
  return 0.06;
};

const rows = new Map(); // key → row
const key = (h, m, mo) => `${h}|${m}|${mo}`;
function blank(h, m, mo) {
  const r = { hour_utc: h, map: m, mode: mo, build: '0.0.14' };
  for (const c of METRIC_COLS) r[c] = 0;
  return r;
}

for (let i = 0; i < HOURS; i++) {
  const t = new Date(startHour + i * 3600e3);
  const hour = t.toISOString().slice(0, 13);
  const dow = t.getUTCDay();
  const weekend = dow === 0 || dow === 6 ? 1.6 : 1;
  const expected = 14 * activity(t.getUTCHours()) * weekend;
  const n = Math.max(0, Math.round(expected * (0.6 + rand() * 0.8)));
  for (let k = 0; k < n; k++) {
    // weighted map / mode picks
    let r = rand(); let map = MAPS[0];
    for (const m of MAPS) { if (r < m.weight) { map = m; break; } r -= m.weight; }
    r = rand(); let mode = 'infectious';
    for (const [mo, w] of MODES) { if (r < w) { mode = mo; break; } r -= w; }

    const row = rows.get(key(hour, map.name, mode)) || blank(hour, map.name, mode);
    const players = 3 + Math.floor(rand() * 8); // 3..10
    const abandoned = rand() < 0.04;
    if (abandoned) { row.abandoned += 1; rows.set(key(hour, map.name, mode), row); continue; }
    const hunters = rand() < map.hunterWin[mode];
    const chase = pick([180, 240, 240, 240, 300, 360]);
    const seconds = hunters ? 20 + rand() * (chase * 0.9) : 12 + chase; // painters win at the buzzer
    row.rounds += 1;
    row.hunter_wins += hunters ? 1 : 0;
    row.painter_wins += hunters ? 0 : 1;
    row.players_sum += players;
    row.players_max = Math.max(row.players_max, players);
    row.survivors_sum += hunters ? 0 : 1 + Math.floor(rand() * Math.max(1, players - 2));
    row.seconds_sum += seconds;
    for (const s of RULE_SCALES) {
      let v = s.def;
      if (s.key === 'chaseSeconds') v = chase;
      else if (rand() < 0.15) v = Math.min(s.max, Math.max(s.min, s.def * (0.7 + rand() * 0.6)));
      row[s.col] += v;
    }
    for (const f of RULE_FLAGS) {
      const on = f.def ? rand() > 0.05 : rand() < 0.12;
      row[f.col] += on ? 1 : 0;
    }
    const w = rand();
    if (w < 0.8) row.weapons_both += 1; else if (w < 0.92) row.weapons_shotgun += 1; else row.weapons_gloves += 1;
    rows.set(key(hour, map.name, mode), row);
  }
}

const cols = ['hour_utc', 'map', 'mode', ...METRIC_COLS, 'build'];
const q = (v) => (typeof v === 'string' ? `'${v.replace(/'/g, "''")}'` : v === null ? 'NULL' : Number.isInteger(v) ? String(v) : v.toFixed(3));
const lines = [];
for (const r of rows.values()) {
  lines.push(`INSERT OR REPLACE INTO round_stats (${cols.join(', ')}) VALUES (${cols.map((c) => q(r[c])).join(', ')});`);
}
mkdirSync('.smoke', { recursive: true });
writeFileSync('.smoke/seed.sql', lines.join('\n') + '\n');
console.log(`wrote ${lines.length} rows to .smoke/seed.sql — applying to the LOCAL database…`);

const res = spawnSync(process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['wrangler', 'd1', 'execute', 'mecha-tag-stats', '--local', '--file', '.smoke/seed.sql'],
  { stdio: 'inherit', env: { ...process.env, WRANGLER_SEND_METRICS: 'false', CI: 'true' }, shell: process.platform === 'win32' });
process.exit(res.status ?? 1);
