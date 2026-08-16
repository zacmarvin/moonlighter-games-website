import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { normalizeRound, hourBucket, UPSERT_SQL, upsertBindings, cleanText } from '../src/ingest.js';
import { METRIC_COLS, RULE_SCALES, RULE_FLAGS, WEAPON_COLS, LIMITS } from '../src/schema.js';

const here = dirname(fileURLToPath(import.meta.url));

const goodRound = () => ({
  map: 'Sinti City', mode: 'infectious', outcome: 'hunters', players: 7, survivors: 0, seconds: 183.4,
  chaseSeconds: 240, headStart: 1, painterHP: 1, hunterSpeed: 1, hunterJump: 1, pellets: 1, range: 1,
  paintSupply: 1, paintRegen: 1, groundedHeight: 1, fallDamage: 1, painterPaintBoost: 1, hunterPaintSlow: 1,
  gloveLaunch: 1, roundsPerLobby: 1, grounded: false, infinitePaint: false, wallJump: true, weapons: 'both',
  build: '0.0.14+p8',
});

test('a normal round becomes one decided-round delta', () => {
  const r = normalizeRound(goodRound());
  assert.equal(r.ok, true);
  assert.deepEqual(r.key, { map: 'Sinti City', mode: 'infectious' });
  assert.equal(r.delta.rounds, 1);
  assert.equal(r.delta.hunter_wins, 1);
  assert.equal(r.delta.painter_wins, 0);
  assert.equal(r.delta.abandoned, 0);
  assert.equal(r.delta.players_sum, 7);
  assert.equal(r.delta.players_max, 7);
  assert.equal(r.delta.seconds_sum, 183.4);
  assert.equal(r.delta.chase_seconds_sum, 240);
  assert.equal(r.delta.wall_jump_rounds, 1);
  assert.equal(r.delta.grounded_rounds, 0);
  assert.equal(r.delta.weapons_both, 1);
  assert.equal(r.delta.weapons_gloves, 0);
  assert.equal(r.build, '0.0.14+p8');
});

test('painter wins carry survivors; hunter wins do not', () => {
  const p = normalizeRound({ ...goodRound(), outcome: 'painters', survivors: 3 });
  assert.equal(p.delta.painter_wins, 1);
  assert.equal(p.delta.survivors_sum, 3);
  const h = normalizeRound({ ...goodRound(), outcome: 'hunters', survivors: 3 });
  assert.equal(h.delta.survivors_sum, 0);
});

test('abandoned rounds are counted and ONLY counted', () => {
  const r = normalizeRound({ ...goodRound(), outcome: 'abandoned', players: 9, seconds: 40 });
  assert.equal(r.ok, true);
  assert.equal(r.delta.abandoned, 1);
  for (const col of METRIC_COLS) if (col !== 'abandoned') assert.equal(r.delta[col], 0, col);
});

test('garbage is clamped, never stored raw', () => {
  const r = normalizeRound({
    ...goodRound(), players: 999, seconds: -50, survivors: 500, hunterSpeed: 50, headStart: -3,
    chaseSeconds: 1e9, roundsPerLobby: 0.2, fallDamage: 'NaN',
  });
  assert.equal(r.ok, true);
  assert.equal(r.delta.players_sum, LIMITS.players.max);
  assert.equal(r.delta.seconds_sum, 0);
  assert.equal(r.delta.survivors_sum, 0); // hunters won → survivors ignored anyway
  assert.equal(r.delta.hunter_speed_sum, 1.25);
  assert.equal(r.delta.head_start_sum, 0);
  assert.equal(r.delta.chase_seconds_sum, 600);
  assert.equal(r.delta.rounds_per_lobby_sum, 1);
  assert.equal(r.delta.fall_damage_sum, 1); // unparsable → stock default
});

test('map names are sanitized and truncated; unknown mode/weapons degrade', () => {
  const r = normalizeRound({
    ...goodRound(),
    map: '  Very\tLong\u0000Map ' + 'x'.repeat(100),
    mode: 'Blaster Mode', weapons: 'lasers',
  });
  assert.equal(r.ok, true);
  assert.equal(r.key.map.length, LIMITS.mapMaxLen);
  assert.ok(!/\u0000|\t/.test(r.key.map));
  assert.ok(r.key.map.startsWith('Very Long Map x'));
  assert.equal(r.key.mode, 'other');
  assert.equal(r.delta.weapons_both + r.delta.weapons_shotgun + r.delta.weapons_gloves, 0);
});

test('missing map/build fall back; missing rules use stock', () => {
  const r = normalizeRound({ outcome: 'painters', players: 4, seconds: 250 });
  assert.equal(r.ok, true);
  assert.equal(r.key.map, 'unknown');
  assert.equal(r.build, null);
  for (const s of RULE_SCALES) assert.equal(r.delta[s.col], s.def, s.col);
  for (const f of RULE_FLAGS) assert.equal(r.delta[f.col], f.def ? 1 : 0, f.col);
});

test('rejects: bad outcome, missing players/seconds, non-object body', () => {
  assert.equal(normalizeRound({ ...goodRound(), outcome: 'banana' }).ok, false);
  assert.equal(normalizeRound({ ...goodRound(), players: 'lots' }).ok, false);
  assert.equal(normalizeRound({ ...goodRound(), seconds: undefined }).ok, false);
  assert.equal(normalizeRound(null).ok, false);
  assert.equal(normalizeRound([1, 2]).ok, false);
  assert.equal(normalizeRound('{}').ok, false);
});

test('hourBucket is the UTC hour string', () => {
  assert.equal(hourBucket(new Date('2026-08-15T14:59:59.999Z')), '2026-08-15T14');
  assert.equal(hourBucket(new Date('2026-08-15T15:00:00.000Z')), '2026-08-15T15');
});

test('UPSERT is one statement, add-on-conflict, MAX for players_max, bindings line up', () => {
  assert.match(UPSERT_SQL, /^INSERT INTO round_stats \(hour_utc, map, mode, /);
  assert.match(UPSERT_SQL, /ON CONFLICT\(hour_utc, map, mode\) DO UPDATE SET/);
  assert.match(UPSERT_SQL, /rounds = rounds \+ excluded\.rounds/);
  assert.match(UPSERT_SQL, /players_max = MAX\(players_max, excluded\.players_max\)/);
  assert.match(UPSERT_SQL, /build = COALESCE\(excluded\.build, build\)/);
  const placeholders = UPSERT_SQL.match(/\?\d+/g).length;
  const binds = upsertBindings('2026-08-15T14', normalizeRound(goodRound()));
  assert.equal(placeholders, binds.length);
  assert.equal(binds.length, 3 + METRIC_COLS.length + 1);
});

test('the migration declares every column the schema knows about', () => {
  const sql = readFileSync(join(here, '..', 'migrations', '0001_round_stats.sql'), 'utf8');
  for (const col of [...METRIC_COLS, 'hour_utc', 'map', 'mode', 'build']) {
    assert.match(sql, new RegExp(`\\b${col}\\b`), `migration is missing column ${col}`);
  }
  for (const col of Object.values(WEAPON_COLS)) assert.match(sql, new RegExp(`\\b${col}\\b`));
});

test('cleanText collapses whitespace and strips control chars', () => {
  assert.equal(cleanText('  a \n\n b\u0007c ', 40), 'a b c');
  assert.equal(cleanText(42, 40), '');
  assert.equal(cleanText('abcdef', 3), 'abc');
});
