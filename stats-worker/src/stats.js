// Read side: turn round_stats rows into the aggregates the dashboard shows.
//
// Every number here is SUM(...) over rows, grouped in SQL, so the page never
// pulls raw rows for a chart — a 90-day view is a handful of tiny result sets
// no matter how many maps/modes exist. Averages are computed at the end
// (sum ÷ count) from those sums.

import { MAX_COLS, METRIC_COLS, MODES } from './schema.js';
import { hourBucket } from './ingest.js';

export const RANGES = {
  '24h': { label: 'Last 24 hours', ms: 24 * 3600e3, bucket: 'hour' },
  '7d':  { label: 'Last 7 days',   ms: 7 * 86400e3,  bucket: 'hour' },
  '30d': { label: 'Last 30 days',  ms: 30 * 86400e3, bucket: 'day' },
  '90d': { label: 'Last 90 days',  ms: 90 * 86400e3, bucket: 'day' },
  all:   { label: 'All time',      ms: null,          bucket: 'day' },
};
export const DEFAULT_RANGE = '7d';

/** Parse + sanitize the dashboard filters from a URL. */
export function parseFilters(url) {
  const range = RANGES[url.searchParams.get('range')] ? url.searchParams.get('range') : DEFAULT_RANGE;
  const modeRaw = (url.searchParams.get('mode') || '').toLowerCase();
  const mode = MODES.includes(modeRaw) || modeRaw === 'other' ? modeRaw : '';
  const map = (url.searchParams.get('map') || '').slice(0, 40);
  return { range, mode, map };
}

/** WHERE clause + bindings shared by every query. */
function whereFor(filters, now) {
  const clauses = [];
  const binds = [];
  const r = RANGES[filters.range];
  if (r.ms) {
    clauses.push('hour_utc >= ?');
    binds.push(hourBucket(new Date(now - r.ms)));
  }
  if (filters.mode) {
    clauses.push('mode = ?');
    binds.push(filters.mode);
  }
  if (filters.map) {
    clauses.push('map = ?');
    binds.push(filters.map);
  }
  return { sql: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', binds };
}

const SUMS_BASIC = `SUM(rounds) AS rounds, SUM(hunter_wins) AS hunter_wins, SUM(painter_wins) AS painter_wins,
  SUM(abandoned) AS abandoned, SUM(players_sum) AS players_sum, SUM(seconds_sum) AS seconds_sum,
  SUM(survivors_sum) AS survivors_sum, MAX(players_max) AS players_max`;

const SUMS_ALL = METRIC_COLS
  .map((c) => (MAX_COLS.has(c) ? `MAX(${c}) AS ${c}` : `SUM(${c}) AS ${c}`))
  .join(', ');

/** Run the dashboard's queries as one D1 batch. */
export async function loadStats(db, filters, now = Date.now()) {
  const where = whereFor(filters, now);
  const bucketLen = RANGES[filters.range].bucket === 'hour' ? 13 : 10;

  const stmts = [
    db.prepare(`SELECT substr(hour_utc, 1, ${bucketLen}) AS bucket, ${SUMS_BASIC}
      FROM round_stats ${where.sql} GROUP BY bucket ORDER BY bucket`).bind(...where.binds),
    db.prepare(`SELECT map, ${SUMS_BASIC} FROM round_stats ${where.sql}
      GROUP BY map ORDER BY rounds DESC, map`).bind(...where.binds),
    db.prepare(`SELECT mode, ${SUMS_BASIC} FROM round_stats ${where.sql}
      GROUP BY mode ORDER BY rounds DESC, mode`).bind(...where.binds),
    db.prepare(`SELECT map, mode, ${SUMS_BASIC} FROM round_stats ${where.sql}
      GROUP BY map, mode ORDER BY map, mode`).bind(...where.binds),
    db.prepare(`SELECT ${SUMS_ALL}, COUNT(*) AS row_count, MIN(hour_utc) AS first_hour, MAX(hour_utc) AS last_hour,
      MAX(build) AS build FROM round_stats ${where.sql}`).bind(...where.binds),
    db.prepare(`SELECT DISTINCT map FROM round_stats ORDER BY map`),
  ];
  const [series, byMap, byMode, byMapMode, totalsRes, maps] = await db.batch(stmts);

  const totals = (totalsRes.results && totalsRes.results[0]) || {};
  for (const c of METRIC_COLS) totals[c] = Number(totals[c]) || 0;

  return {
    filters,
    generatedAt: new Date(now).toISOString(),
    bucket: RANGES[filters.range].bucket,
    series: numeric(series.results),
    byMap: numeric(byMap.results),
    byMode: numeric(byMode.results),
    byMapMode: numeric(byMapMode.results),
    totals: {
      ...totals,
      row_count: Number(totals.row_count) || 0,
      first_hour: totals.first_hour || null,
      last_hour: totals.last_hour || null,
      build: totals.build || null,
    },
    maps: (maps.results || []).map((r) => r.map),
  };
}

/** D1 hands SUM() back as null on empty groups; make every metric a number. */
const SUM_KEYS = ['rounds', 'hunter_wins', 'painter_wins', 'abandoned', 'players_sum', 'seconds_sum', 'survivors_sum', 'players_max'];
function numeric(rows) {
  return (rows || []).map((row) => {
    const out = { ...row };
    for (const k of SUM_KEYS) if (k in out) out[k] = Number(out[k]) || 0;
    return out;
  });
}

/** Raw rows for export (JSON or CSV), same filters. */
export async function loadRows(db, filters, now = Date.now()) {
  const where = whereFor(filters, now);
  const res = await db.prepare(`SELECT hour_utc, map, mode, ${METRIC_COLS.join(', ')}, build FROM round_stats ${where.sql}
    ORDER BY hour_utc, map, mode`).bind(...where.binds).all();
  return res.results || [];
}

export function rowsToCsv(rows) {
  const cols = ['hour_utc', 'map', 'mode', ...METRIC_COLS, 'build'];
  const cell = (v) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [cols.join(',')];
  for (const r of rows) lines.push(cols.map((c) => cell(r[c])).join(','));
  return lines.join('\r\n') + '\r\n';
}
