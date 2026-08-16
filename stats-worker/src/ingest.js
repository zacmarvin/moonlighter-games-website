// POST /r — one round-completion → one atomic upsert.
//
// Everything the client sends is treated as untrusted: strings are sanitized
// and truncated, numbers are clamped to the band a real round could have used
// (schema.js mirrors the Inspector ranges), enums fall back or reject. Nothing
// is stored raw. The hour bucket comes from the Worker's clock, never from the
// payload, so a machine with a wrong clock cannot write into the wrong hour.

import {
  CORE_COLS, LIMITS, MAX_COLS, METRIC_COLS, MODES, OUTCOMES,
  RULE_FLAGS, RULE_SCALES, WEAPON_COLS,
} from './schema.js';
import { safeEqual } from './util.js';

const clamp = (v, min, max) => (v < min ? min : v > max ? max : v);

// C0 control characters + DEL. Written with escapes on purpose — a literal
// control byte in the source is invisible and easy to mangle.
const CONTROL_CHARS = new RegExp('[\\u0000-\\u001f\\u007f]', 'g');

/** Trim, collapse whitespace, drop control chars, cap length. */
export function cleanText(value, maxLen) {
  if (typeof value !== 'string') return '';
  const s = value.replace(CONTROL_CHARS, ' ').replace(/\s+/g, ' ').trim();
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

function num(value) {
  const n = typeof value === 'number' ? value
    : typeof value === 'string' && value.trim() !== '' ? Number(value)
    : NaN;
  return Number.isFinite(n) ? n : NaN;
}

function bool(value, def) {
  if (typeof value === 'boolean') return value;
  if (value === 1 || value === 'true' || value === '1') return true;
  if (value === 0 || value === 'false' || value === '0') return false;
  return def;
}

/**
 * Validate + clamp one round payload into a row of metric deltas.
 * Pure: no clock, no I/O — unit-testable.
 *
 * @returns {{ ok: true, key: {map, mode}, delta: Record<string, number>, build: string|null }
 *         | { ok: false, error: string }}
 */
export function normalizeRound(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, error: 'body must be a JSON object' };
  }

  const outcome = typeof body.outcome === 'string' ? body.outcome.trim().toLowerCase() : '';
  if (!OUTCOMES.includes(outcome)) {
    return { ok: false, error: `outcome must be one of ${OUTCOMES.join('|')}` };
  }

  const map = cleanText(body.map, LIMITS.mapMaxLen) || 'unknown';
  const modeRaw = typeof body.mode === 'string' ? body.mode.trim().toLowerCase() : '';
  const mode = MODES.includes(modeRaw) ? modeRaw : 'other';
  const build = cleanText(body.build, LIMITS.buildMaxLen) || null;

  const delta = {};
  for (const col of METRIC_COLS) delta[col] = 0;

  if (outcome === 'abandoned') {
    // A round that fell apart because everyone left is not a balance signal.
    // It is counted, and only counted — no sums, so every ÷ rounds stays honest.
    delta.abandoned = 1;
    return { ok: true, key: { map, mode }, delta, build };
  }

  const players = num(body.players);
  if (Number.isNaN(players)) return { ok: false, error: 'players must be a number' };
  const seconds = num(body.seconds);
  if (Number.isNaN(seconds)) return { ok: false, error: 'seconds must be a number' };

  const p = Math.round(clamp(players, LIMITS.players.min, LIMITS.players.max));
  const survivorsRaw = num(body.survivors);
  const survivors = Number.isNaN(survivorsRaw) ? 0 : Math.round(clamp(survivorsRaw, 0, p));

  delta.rounds = 1;
  delta.hunter_wins = outcome === 'hunters' ? 1 : 0;
  delta.painter_wins = outcome === 'painters' ? 1 : 0;
  delta.players_sum = p;
  delta.players_max = p;
  delta.survivors_sum = outcome === 'painters' ? survivors : 0;
  delta.seconds_sum = clamp(seconds, LIMITS.seconds.min, LIMITS.seconds.max);

  for (const rule of RULE_SCALES) {
    const raw = num(body[rule.key]);
    delta[rule.col] = clamp(Number.isNaN(raw) ? rule.def : raw, rule.min, rule.max);
  }
  for (const flag of RULE_FLAGS) {
    delta[flag.col] = bool(body[flag.key], flag.def) ? 1 : 0;
  }
  const weapons = typeof body.weapons === 'string' ? body.weapons.trim().toLowerCase() : '';
  if (WEAPON_COLS[weapons]) delta[WEAPON_COLS[weapons]] = 1;

  return { ok: true, key: { map, mode }, delta, build };
}

/** '2026-08-15T14' from a Date — the row's hour bucket. */
export function hourBucket(date) {
  return date.toISOString().slice(0, 13);
}

/**
 * The single upsert statement. Every counter is `col = col + excluded.col`
 * (players_max is MAX) — no read-modify-write, so two rounds finishing in
 * the same instant can never lose each other.
 */
export const UPSERT_SQL = (() => {
  const cols = ['hour_utc', 'map', 'mode', ...METRIC_COLS, 'build'];
  const placeholders = cols.map((_, i) => `?${i + 1}`).join(', ');
  const updates = METRIC_COLS.map((c) =>
    MAX_COLS.has(c) ? `${c} = MAX(${c}, excluded.${c})` : `${c} = ${c} + excluded.${c}`,
  );
  updates.push('build = COALESCE(excluded.build, build)');
  return `INSERT INTO round_stats (${cols.join(', ')}) VALUES (${placeholders})\n` +
    `ON CONFLICT(hour_utc, map, mode) DO UPDATE SET\n  ${updates.join(',\n  ')}`;
})();

/** Bind values in UPSERT_SQL's column order. */
export function upsertBindings(hour, normalized) {
  return [
    hour,
    normalized.key.map,
    normalized.key.mode,
    ...METRIC_COLS.map((c) => normalized.delta[c]),
    normalized.build,
  ];
}

/** Route handler for POST /r. */
export async function handleIngest(request, env) {
  if (!env.INGEST_KEY) {
    // Fail closed: an unconfigured endpoint accepts nothing.
    return new Response('ingest key not configured', { status: 503 });
  }
  if (!safeEqual(request.headers.get('X-Key') || '', env.INGEST_KEY)) {
    return new Response('unauthorized', { status: 401 });
  }

  const declared = Number(request.headers.get('Content-Length') || 0);
  if (declared > LIMITS.bodyMaxBytes) return new Response('payload too large', { status: 413 });

  let text;
  try {
    text = await request.text();
  } catch {
    return new Response('unreadable body', { status: 400 });
  }
  if (text.length > LIMITS.bodyMaxBytes) return new Response('payload too large', { status: 413 });

  let body;
  try {
    body = JSON.parse(text);
  } catch {
    return new Response('invalid JSON', { status: 400 });
  }

  const normalized = normalizeRound(body);
  if (!normalized.ok) return new Response(normalized.error, { status: 400 });

  const hour = hourBucket(new Date());
  await env.DB.prepare(UPSERT_SQL).bind(...upsertBindings(hour, normalized)).run();

  // 204: nothing for a client to parse — the game fires and forgets.
  return new Response(null, { status: 204 });
}

// Re-exported for tests that want to assert the column list.
export { CORE_COLS };
