import test from 'node:test';
import assert from 'node:assert/strict';

import { parseFilters, rowsToCsv, RANGES, loadStats } from '../src/stats.js';
import { renderDashboard } from '../src/dashboard.js';
import { METRIC_COLS } from '../src/schema.js';

test('filters: unknown values fall back, known values pass', () => {
  const f = parseFilters(new URL('https://x.test/?range=30d&mode=Classic&map=Sinti%20City'));
  assert.deepEqual(f, { range: '30d', mode: 'classic', map: 'Sinti City' });
  const g = parseFilters(new URL('https://x.test/?range=1y&mode=blaster'));
  assert.deepEqual(g, { range: '7d', mode: '', map: '' });
  assert.ok(RANGES[g.range]);
});

test('CSV: header from schema, quoting for commas/quotes/newlines', () => {
  const csv = rowsToCsv([{ hour_utc: '2026-08-15T14', map: 'A, "B"', mode: 'classic', rounds: 2, build: null }]);
  const [head, row] = csv.split('\r\n');
  assert.equal(head.split(',').length, 3 + METRIC_COLS.length + 1);
  assert.ok(row.startsWith('2026-08-15T14,"A, ""B""",classic,2,'));
  assert.ok(row.endsWith(','), 'null build → empty last cell');
});

/** A minimal fake of D1's prepare/bind/batch/all that answers from canned rows. */
function fakeDb(answers) {
  let i = 0;
  const stmt = () => ({ bind: () => stmt(), all: async () => ({ results: answers[i++] || [] }) });
  return {
    prepare: () => stmt(),
    batch: async (stmts) => stmts.map(() => ({ results: answers[i++] || [] })),
  };
}

test('loadStats + renderDashboard: numbers land in the page, untrusted names are escaped', async () => {
  const series = [{ bucket: '2026-08-15T14', rounds: 3, hunter_wins: 2, painter_wins: 1, abandoned: 0, players_sum: 21, seconds_sum: 540, survivors_sum: 2, players_max: 8 }];
  const byMap = [{ map: '<img src=x onerror=alert(1)>', rounds: 3, hunter_wins: 2, painter_wins: 1, abandoned: 1, players_sum: 21, seconds_sum: 540, survivors_sum: 2, players_max: 8 }];
  const byMode = [{ mode: 'infectious', rounds: 3, hunter_wins: 2, painter_wins: 1, abandoned: 1, players_sum: 21, seconds_sum: 540, survivors_sum: 2, players_max: 8 }];
  const byMapMode = [{ map: '<img src=x onerror=alert(1)>', mode: 'infectious', rounds: 3, hunter_wins: 2, painter_wins: 1, abandoned: 1, players_sum: 21, seconds_sum: 540, survivors_sum: 2, players_max: 8 }];
  const totals = [{ rounds: 3, hunter_wins: 2, painter_wins: 1, abandoned: 1, players_sum: 21, players_max: 8, survivors_sum: 2, seconds_sum: 540, chase_seconds_sum: 720, head_start_sum: 3, wall_jump_rounds: 3, weapons_both: 3, row_count: 1, first_hour: '2026-08-15T14', last_hour: '2026-08-15T14', build: '0.0.14' }];
  const maps = [{ map: '<img src=x onerror=alert(1)>' }];
  const db = fakeDb([series, byMap, byMode, byMapMode, totals, maps]);

  const data = await loadStats(db, { range: '7d', mode: '', map: '' }, Date.parse('2026-08-15T15:00:00Z'));
  assert.equal(data.totals.rounds, 3);
  assert.equal(data.totals.hunter_wins, 2);
  assert.equal(data.totals.pellet_sum, 0, 'missing sums coerce to 0');
  assert.equal(data.bucket, 'hour');

  const res = renderDashboard(data, { email: 'info@moonlightergames.com' });
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.ok(html.includes('Mecha Tag round stats'));
  assert.ok(html.includes('info@moonlightergames.com'));
  assert.ok(html.includes('67%'), 'hunter win rate 2/3');
  assert.ok(html.includes('7.0'), 'avg lobby 21/3');
  assert.ok(html.includes('3:00'), 'avg round 540/3 = 3:00');
  assert.ok(!html.includes('<img src=x'), 'map name is escaped');
  assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
  assert.ok(html.includes('id="data" type="application/json"'));
  assert.ok(html.includes('Content-Security-Policy') === false, 'CSP is a header, not markup');
  assert.match(res.headers.get('content-security-policy'), /default-src 'none'/);
  assert.equal(res.headers.get('cache-control'), 'no-store');
});

test('renderDashboard: empty slice shows the empty state and no NaN anywhere', async () => {
  const db = fakeDb([[], [], [], [], [{}], []]);
  const data = await loadStats(db, { range: 'all', mode: '', map: '' });
  const html = await renderDashboard(data, { email: 'x@y.z' }).text();
  assert.ok(html.includes('No rounds in this range yet'));
  const markup = html.replace(/<script[\s\S]*?<\/script>/g, '');
  assert.ok(!/\bNaN\b/.test(markup));
  assert.ok(!/\bundefined\b/.test(markup));
  assert.ok(!/\bnull\b/.test(markup));
});
