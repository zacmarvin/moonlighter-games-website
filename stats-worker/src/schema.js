// The one place that knows what a round_stats row looks like.
//
// One row per (hour_utc, map, mode). Every metric is a SUM or a COUNT, never
// a pre-computed average — sum ÷ rounds gives a correct mean over any window
// you slice later, and averaging averages does not.
//
// Adding a metric = one entry here + one `ALTER TABLE … ADD COLUMN … DEFAULT 0`
// migration (see migrations/). The ingest upsert, the dashboard queries and the
// CSV export all derive their column lists from this file.

export const MODES = ['infectious', 'classic', 'freeze'];
export const OUTCOMES = ['hunters', 'painters', 'abandoned'];
export const WEAPONS = ['both', 'shotgun', 'gloves'];

/** How the client's `mode` string maps to a stored value. Unknown → 'other'. */
export const MODE_LABELS = {
  infectious: 'Infectious',
  classic: 'Classic',
  freeze: 'Freeze Tag',
  other: 'Other',
};

/**
 * Numeric round rules the host chose (RoundModifiers in Unity), summed per
 * row. `min`/`max` mirror the Inspector [Range] on each RoundModifiers field —
 * the Worker clamps to the same band the panel allows, so a garbage payload
 * can never drag an average outside the range a real round could have used.
 * `def` is the stock (neutral) value: used when an older client omits the field,
 * and what the dashboard compares the played average against.
 * `col` ÷ rounds = the average setting people actually played.
 */
export const RULE_SCALES = [
  { key: 'chaseSeconds',    col: 'chase_seconds_sum',     min: 60,   max: 600, def: 240, label: 'Chase length',           unit: 's' },
  { key: 'headStart',       col: 'head_start_sum',        min: 0,    max: 3,   def: 1,   label: 'Head start scale',       unit: '×' },
  { key: 'painterHP',       col: 'painter_hp_sum',        min: 0.01, max: 2,   def: 1,   label: 'Painter HP scale',       unit: '×' },
  { key: 'hunterSpeed',     col: 'hunter_speed_sum',      min: 0.9,  max: 1.25, def: 1,  label: 'Hunter speed scale',     unit: '×' },
  { key: 'hunterJump',      col: 'hunter_jump_sum',       min: 0.85, max: 1.4, def: 1,   label: 'Hunter jump scale',      unit: '×' },
  { key: 'pellets',         col: 'pellet_sum',            min: 0.1,  max: 2.5, def: 1,   label: 'Shotgun pellet scale',   unit: '×' },
  { key: 'range',           col: 'range_sum',             min: 0.3,  max: 2.5, def: 1,   label: 'Shotgun range scale',    unit: '×' },
  { key: 'paintSupply',     col: 'paint_supply_sum',      min: 0.5,  max: 3,   def: 1,   label: 'Paint supply scale',     unit: '×' },
  { key: 'paintRegen',      col: 'paint_regen_sum',       min: 0.25, max: 4,   def: 1,   label: 'Paint regen scale',      unit: '×' },
  { key: 'groundedHeight',  col: 'grounded_height_sum',   min: 0.25, max: 2.5, def: 1,   label: 'Grounded start height',  unit: '×' },
  { key: 'fallDamage',      col: 'fall_damage_sum',       min: 0,    max: 1,   def: 1,   label: 'Fall damage scale',      unit: '×' },
  { key: 'painterPaintBoost', col: 'painter_paint_boost_sum', min: 0, max: 2,  def: 1,   label: 'Painter on-paint boost', unit: '×' },
  { key: 'hunterPaintSlow', col: 'hunter_paint_slow_sum', min: 0,    max: 2,   def: 1,   label: 'Hunter on-paint slow',   unit: '×' },
  { key: 'gloveLaunch',     col: 'glove_launch_sum',      min: 0,    max: 2,   def: 1,   label: 'Glove launch scale',     unit: '×' },
  { key: 'roundsPerLobby',  col: 'rounds_per_lobby_sum',  min: 1,    max: 5,   def: 1,   label: 'Rounds per lobby visit', unit: '' },
];

/** Boolean round rules, stored as "how many rounds had this on". */
export const RULE_FLAGS = [
  { key: 'grounded',      col: 'grounded_rounds',       def: false, label: 'Grounded strokes' },
  { key: 'infinitePaint', col: 'infinite_paint_rounds', def: false, label: 'Infinite paint' },
  { key: 'wallJump',      col: 'wall_jump_rounds',      def: true,  label: 'Wall jump allowed' },
];

/** Hunter weapon rule, stored as one counter per option. */
export const WEAPON_COLS = {
  both: 'weapons_both',
  shotgun: 'weapons_shotgun',
  gloves: 'weapons_gloves',
};

/** Fixed metric columns, in table order. */
export const CORE_COLS = [
  'rounds',        // decided rounds (hunters or painters won)
  'hunter_wins',
  'painter_wins',
  'abandoned',     // ended because the last painter left — NOT counted in rounds or any sum
  'players_sum',   // ÷ rounds = average lobby size (players at round start)
  'players_max',   // MAX, not a sum: biggest lobby seen in the bucket
  'survivors_sum', // ÷ painter_wins = average painters still in when the clock ran out
  'seconds_sum',   // ÷ rounds = average round length (head start + chase, until it ended)
];

/** Every metric column the upsert touches, in a stable order. */
export const METRIC_COLS = [
  ...CORE_COLS,
  ...RULE_SCALES.map((s) => s.col),
  ...RULE_FLAGS.map((f) => f.col),
  ...Object.values(WEAPON_COLS),
];

/** Columns whose upsert is MAX(old, new) instead of old + new. */
export const MAX_COLS = new Set(['players_max']);

/** Server-side clamps on the round facts themselves. */
export const LIMITS = {
  players: { min: 1, max: 32 },
  seconds: { min: 0, max: 3600 },
  mapMaxLen: 40,
  buildMaxLen: 32,
  bodyMaxBytes: 8 * 1024,
};
