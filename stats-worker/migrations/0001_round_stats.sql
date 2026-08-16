-- Mecha Tag round telemetry — one row per (UTC hour, map, game mode).
-- Everything is a SUM or a COUNT; averages are computed at read time
-- (sum ÷ rounds), never stored. Column list mirrors src/schema.js.
CREATE TABLE IF NOT EXISTS round_stats (
  hour_utc      TEXT    NOT NULL,            -- '2026-08-15T14' (Worker clock, never the client's)
  map           TEXT    NOT NULL,            -- level DisplayName, sanitized + truncated
  mode          TEXT    NOT NULL,            -- 'infectious' | 'classic' | 'freeze' | 'other'

  rounds        INTEGER NOT NULL DEFAULT 0,  -- decided rounds
  hunter_wins   INTEGER NOT NULL DEFAULT 0,
  painter_wins  INTEGER NOT NULL DEFAULT 0,
  abandoned     INTEGER NOT NULL DEFAULT 0,  -- last painter left; excluded from rounds + all sums
  players_sum   INTEGER NOT NULL DEFAULT 0,  -- ÷ rounds = avg lobby size
  players_max   INTEGER NOT NULL DEFAULT 0,  -- biggest lobby seen
  survivors_sum INTEGER NOT NULL DEFAULT 0,  -- ÷ painter_wins = avg painters left standing
  seconds_sum   REAL    NOT NULL DEFAULT 0,  -- ÷ rounds = avg round length

  -- round-rule sums (÷ rounds = the average setting people actually played)
  chase_seconds_sum       REAL NOT NULL DEFAULT 0,
  head_start_sum          REAL NOT NULL DEFAULT 0,
  painter_hp_sum          REAL NOT NULL DEFAULT 0,
  hunter_speed_sum        REAL NOT NULL DEFAULT 0,
  hunter_jump_sum         REAL NOT NULL DEFAULT 0,
  pellet_sum              REAL NOT NULL DEFAULT 0,
  range_sum               REAL NOT NULL DEFAULT 0,
  paint_supply_sum        REAL NOT NULL DEFAULT 0,
  paint_regen_sum         REAL NOT NULL DEFAULT 0,
  grounded_height_sum     REAL NOT NULL DEFAULT 0,
  fall_damage_sum         REAL NOT NULL DEFAULT 0,
  painter_paint_boost_sum REAL NOT NULL DEFAULT 0,
  hunter_paint_slow_sum   REAL NOT NULL DEFAULT 0,
  glove_launch_sum        REAL NOT NULL DEFAULT 0,
  rounds_per_lobby_sum    REAL NOT NULL DEFAULT 0,

  -- rule toggles as counts of rounds that used them
  grounded_rounds       INTEGER NOT NULL DEFAULT 0,
  infinite_paint_rounds INTEGER NOT NULL DEFAULT 0,
  wall_jump_rounds      INTEGER NOT NULL DEFAULT 0,
  weapons_both          INTEGER NOT NULL DEFAULT 0,
  weapons_shotgun       INTEGER NOT NULL DEFAULT 0,
  weapons_gloves        INTEGER NOT NULL DEFAULT 0,

  build         TEXT,                        -- last game version seen in this bucket
  PRIMARY KEY (hour_utc, map, mode)
);

-- The dashboard's time-range scans walk hour_utc; the primary key already
-- leads with it, so no extra index is needed for that. This one serves the
-- per-map / per-mode roll-ups over a range.
CREATE INDEX IF NOT EXISTS round_stats_map_mode ON round_stats (map, mode, hour_utc);
