// The dashboard page. Server-rendered HTML for everything that is a number or
// a table (KPIs, per-map / per-mode share bars, the map×mode matrix, the
// settings averages, every chart's table twin) — the page is fully readable
// with scripts off. A small inline script then adds what needs the viewer's
// browser: the SVG rounds-over-time chart (sized to the container, hour
// buckets shown in LOCAL time), hover tooltips, table toggles, and
// auto-submitting filters.
//
// Palette: two categorical series only — painters (slot 1, blue) and hunters
// (slot 2, orange), validated for both light and dark surfaces. Text never
// wears a series color; identity comes from the swatch beside it.

import { HTML_HEAD, HTML_TAIL, BASE_CSS, htmlResponse } from './pages.js';
import { escapeHtml as esc } from './util.js';
import { MODE_LABELS, RULE_FLAGS, RULE_SCALES, WEAPON_COLS } from './schema.js';
import { RANGES } from './stats.js';

// ---------- formatting (server side) ----------

const fmtInt = (n) => Math.round(Number(n) || 0).toLocaleString('en-US');
const pct = (num, den) => (den > 0 ? (100 * num) / den : null);
const fmtPct = (p, digits = 0) => (p === null || p === undefined || Number.isNaN(p) ? '—' : `${p.toFixed(digits)}%`);
const avg = (sum, n) => (n > 0 ? sum / n : null);
const fmtAvg = (v, digits = 1) => (v === null || v === undefined || Number.isNaN(v) ? '—' : v.toFixed(digits));
function fmtDur(seconds) {
  if (seconds === null || seconds === undefined || Number.isNaN(seconds)) return '—';
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
const modeLabel = (m) => MODE_LABELS[m] || (m ? m : '—');
const winRate = (r) => pct(r.hunter_wins, r.hunter_wins + r.painter_wins);
const decided = (r) => r.hunter_wins + r.painter_wins;

// ---------- pieces ----------

function filterForm(data) {
  const { filters, maps } = data;
  const rangeOpts = Object.entries(RANGES)
    .map(([k, r]) => `<option value="${k}"${k === filters.range ? ' selected' : ''}>${esc(r.label)}</option>`)
    .join('');
  const modeOpts = ['', 'infectious', 'classic', 'freeze', 'other']
    .map((m) => `<option value="${m}"${m === filters.mode ? ' selected' : ''}>${m ? esc(modeLabel(m)) : 'All modes'}</option>`)
    .join('');
  const mapSet = new Set(maps);
  if (filters.map) mapSet.add(filters.map);
  const mapOpts = ['', ...mapSet]
    .map((m) => `<option value="${esc(m)}"${m === filters.map ? ' selected' : ''}>${m ? esc(m) : 'All maps'}</option>`)
    .join('');
  return `<form class="filters" method="get" action="/" id="filters">
    <label>Range <select name="range">${rangeOpts}</select></label>
    <label>Mode <select name="mode">${modeOpts}</select></label>
    <label>Map <select name="map">${mapOpts}</select></label>
    <button class="btn ghost" type="submit">Apply</button>
  </form>`;
}

function kpis(data) {
  const t = data.totals;
  const dec = decided(t);
  const tile = (label, value, note = '') =>
    `<div class="tile"><div class="tile-label">${esc(label)}</div><div class="tile-value">${value}</div>${note ? `<div class="tile-note">${note}</div>` : ''}</div>`;
  const wr = winRate(t);
  return `<div class="kpis">
    ${tile('Rounds played', fmtInt(t.rounds), t.abandoned ? `${fmtInt(t.abandoned)} abandoned` : '')}
    ${tile('Hunter win rate', fmtPct(wr), dec ? `over ${fmtInt(dec)} decided rounds` : 'no decided rounds')}
    ${tile('Painter win rate', fmtPct(wr === null ? null : 100 - wr), dec ? `<span class="swatch p"></span> painters vs <span class="swatch h"></span> hunters` : '')}
    ${tile('Average lobby', fmtAvg(avg(t.players_sum, t.rounds)), t.rounds ? `players at round start · biggest ${fmtInt(t.players_max)}` : '')}
    ${tile('Average round', fmtDur(avg(t.seconds_sum, t.rounds)), t.rounds ? 'head start + chase, m:ss' : '')}
    ${tile('Painters left standing', fmtAvg(avg(t.survivors_sum, t.painter_wins)), t.painter_wins ? 'average, when painters won' : 'no painter wins yet')}
  </div>`;
}

const legend = () => `<div class="legend" aria-hidden="true">
  <span><i class="swatch p"></i>Painter wins</span><span><i class="swatch h"></i>Hunter wins</span></div>`;

function tableToggle(id) {
  return `<button type="button" class="link" data-toggle="${id}" aria-expanded="false" aria-controls="${id}">Table</button>`;
}

function timeCard(data) {
  const kind = data.bucket;
  const rows = data.series.map((r) => `<tr>
      <td data-bucket="${esc(r.bucket)}" data-kind="${kind}">${esc(r.bucket)}</td>
      <td class="num">${fmtInt(r.rounds)}</td><td class="num">${fmtInt(r.hunter_wins)}</td><td class="num">${fmtInt(r.painter_wins)}</td>
      <td class="num">${fmtPct(winRate(r))}</td><td class="num">${fmtInt(r.abandoned)}</td>
      <td class="num">${fmtAvg(avg(r.players_sum, r.rounds))}</td><td class="num">${fmtDur(avg(r.seconds_sum, r.rounds))}</td>
    </tr>`).join('');
  const unit = kind === 'hour' ? 'hour' : 'day';
  const note = kind === 'hour'
    ? 'Hours are bucketed in UTC on the server and shown here in your local time.'
    : 'Daily buckets are UTC days.';
  return `<section class="card">
    <div class="card-head"><h2>Rounds per ${unit}</h2>${legend()}${tableToggle('t-time')}</div>
    <div id="timechart" class="chart" role="img" aria-label="Stacked columns of painter and hunter wins per ${unit}"></div>
    <p class="note muted">${note}</p>
    <div id="t-time" class="twin" hidden><table>
      <thead><tr><th>${unit === 'hour' ? 'Hour' : 'Day (UTC)'}</th><th class="num">Rounds</th><th class="num">Hunter wins</th><th class="num">Painter wins</th><th class="num">Hunter win %</th><th class="num">Abandoned</th><th class="num">Avg lobby</th><th class="num">Avg length</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="8" class="muted">No rounds in this range.</td></tr>'}</tbody></table></div>
  </section>`;
}

/** One horizontal 100%-stacked bar: painter share (left) | hunter share (right). */
function shareRow(label, r) {
  const dec = decided(r);
  if (dec === 0) {
    return `<div class="share"><div class="share-label">${esc(label)}</div>
      <div class="share-bar"></div>
      <div class="share-val muted">${r.abandoned ? `${fmtInt(r.abandoned)} abandoned, ` : ''}no decided rounds</div></div>`;
  }
  const h = (100 * r.hunter_wins) / dec;
  const p = 100 - h;
  const segs = [];
  if (p > 0) segs.push(`<span class="seg p${h > 0 ? '' : ' end'}" style="width:${p.toFixed(2)}%"></span>`);
  if (h > 0) segs.push(`<span class="seg h end" style="width:${h.toFixed(2)}%"></span>`);
  return `<div class="share" tabindex="0" data-label="${esc(label)}" data-h="${r.hunter_wins}" data-p="${r.painter_wins}" data-a="${r.abandoned}" data-players="${fmtAvg(avg(r.players_sum, r.rounds))}" data-len="${fmtDur(avg(r.seconds_sum, r.rounds))}">
    <div class="share-label">${esc(label)}</div>
    <div class="share-bar">${segs.join('')}</div>
    <div class="share-val"><b>${fmtPct(h)}</b> hunters <span class="muted">· ${fmtInt(dec)} round${dec === 1 ? '' : 's'}</span></div>
  </div>`;
}

function shareTable(id, keyLabel, rows, labelOf) {
  const body = rows.map((r) => `<tr><td>${esc(labelOf(r))}</td>
    <td class="num">${fmtInt(r.rounds)}</td><td class="num">${fmtInt(r.hunter_wins)}</td><td class="num">${fmtInt(r.painter_wins)}</td>
    <td class="num">${fmtPct(winRate(r))}</td><td class="num">${fmtInt(r.abandoned)}</td>
    <td class="num">${fmtAvg(avg(r.players_sum, r.rounds))}</td><td class="num">${fmtInt(r.players_max)}</td><td class="num">${fmtDur(avg(r.seconds_sum, r.rounds))}</td></tr>`).join('');
  return `<div id="${id}" class="twin" hidden><table>
    <thead><tr><th>${esc(keyLabel)}</th><th class="num">Rounds</th><th class="num">Hunter wins</th><th class="num">Painter wins</th><th class="num">Hunter win %</th><th class="num">Abandoned</th><th class="num">Avg lobby</th><th class="num">Biggest lobby</th><th class="num">Avg length</th></tr></thead>
    <tbody>${body || `<tr><td colspan="9" class="muted">No rounds in this range.</td></tr>`}</tbody></table></div>`;
}

function shareCard(title, id, rows, labelOf, keyLabel, hint) {
  const bars = rows.map((r) => shareRow(labelOf(r), r)).join('');
  return `<section class="card">
    <div class="card-head"><h2>${esc(title)}</h2>${legend()}${tableToggle(id)}</div>
    ${hint ? `<p class="note muted" style="margin-top:0">${hint}</p>` : ''}
    <div class="shares">${bars || '<p class="muted">No rounds in this range.</p>'}</div>
    ${shareTable(id, keyLabel, rows, labelOf)}
  </section>`;
}

function matrixCard(data) {
  const rows = data.byMapMode.filter((r) => r.rounds > 0 || r.abandoned > 0);
  const body = rows.map((r) => `<tr><td>${esc(r.map)}</td><td>${esc(modeLabel(r.mode))}</td>
    <td class="num">${fmtInt(r.rounds)}</td><td class="num">${fmtPct(winRate(r))}</td>
    <td class="num">${fmtAvg(avg(r.players_sum, r.rounds))}</td><td class="num">${fmtDur(avg(r.seconds_sum, r.rounds))}</td>
    <td class="num">${fmtAvg(avg(r.survivors_sum, r.painter_wins))}</td><td class="num">${fmtInt(r.abandoned)}</td></tr>`).join('');
  return `<section class="card">
    <div class="card-head"><h2>Map × mode</h2></div>
    <p class="note muted" style="margin-top:0">The balance table: win rate per map per mode, with the sample size next to it — a 90% number over 3 rounds is noise, over 300 it's a problem.</p>
    <div class="twin"><table>
      <thead><tr><th>Map</th><th>Mode</th><th class="num">Rounds</th><th class="num">Hunter win %</th><th class="num">Avg lobby</th><th class="num">Avg length</th><th class="num">Painters left (painter wins)</th><th class="num">Abandoned</th></tr></thead>
      <tbody>${body || '<tr><td colspan="8" class="muted">No rounds in this range.</td></tr>'}</tbody></table></div>
  </section>`;
}

function settingsCard(data) {
  const t = data.totals;
  const n = t.rounds;
  const scaleRows = RULE_SCALES.map((s) => {
    const a = avg(t[s.col], n);
    let delta = '';
    if (a !== null) {
      const d = a - s.def;
      const rel = s.def !== 0 ? (100 * d) / s.def : 0;
      delta = Math.abs(rel) < 0.5 ? '<span class="muted">= stock</span>'
        : `<span class="${rel > 0 ? 'up' : 'down'}">${rel > 0 ? '+' : ''}${rel.toFixed(0)}% vs stock</span>`;
    }
    const digits = s.unit === 's' ? 0 : 2;
    return `<tr><td>${esc(s.label)}</td><td class="num">${a === null ? '—' : `${a.toFixed(digits)}${s.unit === '×' ? '×' : s.unit === 's' ? ' s' : ''}`}</td>
      <td class="num muted">${s.def}${s.unit === '×' ? '×' : s.unit === 's' ? ' s' : ''}</td><td>${delta}</td></tr>`;
  }).join('');
  const flagRows = RULE_FLAGS.map((f) =>
    `<tr><td>${esc(f.label)}</td><td class="num">${fmtPct(pct(t[f.col], n))}</td><td class="muted">${f.def ? 'on' : 'off'} by default</td></tr>`).join('');
  const weaponRows = Object.entries(WEAPON_COLS).map(([k, col]) =>
    `<tr><td>${k === 'both' ? 'Shotgun + gloves' : k === 'shotgun' ? 'Shotgun only' : 'Gloves only'}</td><td class="num">${fmtPct(pct(t[col], n))}</td><td class="muted">${k === 'both' ? 'default' : ''}</td></tr>`).join('');
  return `<section class="card">
    <div class="card-head"><h2>Settings people actually played</h2></div>
    <p class="note muted" style="margin-top:0">Averaged over ${fmtInt(n)} decided round${n === 1 ? '' : 's'} in this slice — the host's round-setup panel as it was really used, not as it was designed.</p>
    <div class="grid2">
      <div class="twin"><table>
        <thead><tr><th>Setting</th><th class="num">Average played</th><th class="num">Stock</th><th></th></tr></thead>
        <tbody>${scaleRows}</tbody></table></div>
      <div>
        <div class="twin"><table>
          <thead><tr><th>Toggle</th><th class="num">Rounds on</th><th></th></tr></thead>
          <tbody>${flagRows}</tbody></table></div>
        <div class="twin" style="margin-top:14px"><table>
          <thead><tr><th>Hunter loadout</th><th class="num">Rounds</th><th></th></tr></thead>
          <tbody>${weaponRows}</tbody></table></div>
      </div>
    </div>
  </section>`;
}

// ---------- page ----------

const DASH_CSS = `
.top { display:flex; align-items:baseline; justify-content:space-between; gap:16px; flex-wrap:wrap; margin-bottom:14px; }
.top .who { color: var(--ink-2); font-size: 13px; }
.top .who a { margin-left: 10px; }
.filters { display:flex; gap:12px; align-items:end; flex-wrap:wrap; margin: 0 0 18px; }
.filters label { display:flex; flex-direction:column; gap:4px; font-size:12px; color: var(--ink-2); }
.filters select { font: inherit; padding: 6px 8px; border-radius: 8px; border: 1px solid var(--axis); background: var(--surface); color: var(--ink); min-width: 150px; }
.filters .btn { padding: 7px 12px; }
.kpis { display:grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin-bottom: 16px; }
.tile { background: var(--surface); border: 1px solid var(--ring); border-radius: 12px; padding: 14px 16px; }
.tile-label { font-size: 12px; color: var(--ink-2); }
.tile-value { font-size: 30px; font-weight: 600; letter-spacing: -0.02em; line-height: 1.15; margin-top: 4px; }
.tile-note { font-size: 12px; color: var(--muted); margin-top: 4px; }
section.card { margin-bottom: 16px; }
.card-head { display:flex; align-items:center; gap: 14px; margin-bottom: 8px; }
.card-head h2 { margin: 0; flex: 1 1 auto; }
.legend { display:flex; gap: 14px; font-size: 12px; color: var(--ink-2); }
.legend span { display:inline-flex; align-items:center; gap: 6px; }
.swatch { display:inline-block; width: 12px; height: 12px; border-radius: 3px; vertical-align: -1px; }
.swatch.p { background: var(--series-1); } .swatch.h { background: var(--series-2); }
.link { background: none; border: 0; padding: 4px 6px; font: inherit; font-size: 13px; color: var(--ink-2); cursor: pointer; text-decoration: underline; text-underline-offset: 3px; border-radius: 6px; }
.link[aria-expanded="true"] { color: var(--ink); }
.chart { width: 100%; height: 260px; }
.chart svg { display:block; width: 100%; height: 100%; }
.chart text { font: 12px system-ui, -apple-system, "Segoe UI", sans-serif; fill: var(--muted); font-variant-numeric: tabular-nums; }
.chart .grid { stroke: var(--grid); stroke-width: 1; shape-rendering: crispEdges; }
.chart .base { stroke: var(--axis); stroke-width: 1; shape-rendering: crispEdges; }
.chart .p { fill: var(--series-1); } .chart .h { fill: var(--series-2); }
.chart .hit { fill: transparent; }
.chart .slot.hot .p, .chart .slot.hot .h { filter: brightness(1.12); }
.chart .empty { fill: var(--muted); font-size: 13px; }
.note { font-size: 12px; margin: 8px 0 0; }
.shares { display:flex; flex-direction:column; gap: 8px; }
.share { display:grid; grid-template-columns: minmax(90px, 160px) 1fr minmax(150px, auto); gap: 12px; align-items:center; padding: 4px 6px; border-radius: 8px; outline: none; }
.share:hover, .share:focus-visible { background: var(--accent-soft); }
.share-label { font-size: 13px; color: var(--ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.share-bar { display:flex; gap: 2px; height: 14px; }
.seg { display:block; height: 100%; }
.seg.p { background: var(--series-1); } .seg.h { background: var(--series-2); }
.seg.end { border-radius: 0 4px 4px 0; }
.share-val { font-size: 13px; color: var(--ink-2); font-variant-numeric: tabular-nums; }
.share-val b { color: var(--ink); font-weight: 600; }
.twin table { width: 100%; border-collapse: collapse; font-size: 13px; }
.twin th { text-align: left; font-weight: 600; color: var(--ink-2); font-size: 12px; padding: 6px 8px; border-bottom: 1px solid var(--axis); white-space: nowrap; }
.twin td { padding: 6px 8px; border-bottom: 1px solid var(--grid); vertical-align: top; }
.twin td.num, .twin th.num { text-align: right; font-variant-numeric: tabular-nums; }
.twin { overflow-x: auto; margin-top: 10px; }
.grid2 { display:grid; grid-template-columns: 1fr 1fr; gap: 20px; }
@media (max-width: 760px) { .grid2 { grid-template-columns: 1fr; } .share { grid-template-columns: 1fr; gap: 4px; } }
.up { color: var(--ink); } .down { color: var(--ink); }
.tip { position: fixed; z-index: 10; pointer-events: none; background: var(--surface); color: var(--ink); border: 1px solid var(--ring); box-shadow: 0 6px 18px rgba(0,0,0,0.12); border-radius: 8px; padding: 8px 10px; font-size: 12px; min-width: 150px; display: none; }
.tip .t { color: var(--ink-2); margin-bottom: 4px; }
.tip .row { display:flex; justify-content:space-between; gap: 14px; }
.tip .row b { font-variant-numeric: tabular-nums; }
.tip .k { display:inline-block; width: 12px; height: 2px; vertical-align: middle; margin-right: 6px; border-radius: 1px; }
.tip .k.p { background: var(--series-1); } .tip .k.h { background: var(--series-2); } .tip .k.o { background: var(--other); }
.foot { font-size: 12px; color: var(--muted); margin-top: 20px; display:flex; gap: 14px; flex-wrap: wrap; }
`;

// NOTE: no template interpolation inside CLIENT_JS — it is emitted verbatim.
const CLIENT_JS = `
(function () {
  'use strict';
  var D = JSON.parse(document.getElementById('data').textContent);
  var svgNS = 'http://www.w3.org/2000/svg';

  function el(tag, attrs, parent) {
    var n = document.createElementNS(svgNS, tag);
    for (var k in attrs) if (attrs.hasOwnProperty(k)) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function h(tag, cls, text, parent) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = text;
    if (parent) parent.appendChild(n);
    return n;
  }
  function fmtInt(n) { return Math.round(n || 0).toLocaleString('en-US'); }
  function fmtDur(s) { if (s == null || isNaN(s)) return '\\u2014'; s = Math.max(0, Math.round(s)); var m = Math.floor(s / 60); return m + ':' + (s % 60 < 10 ? '0' : '') + (s % 60); }
  var dayFmt = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
  var hourFmt = new Intl.DateTimeFormat(undefined, { weekday: 'short', hour: 'numeric' });
  var hourFmtLong = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric' });
  function bucketDate(b, kind) { return kind === 'hour' ? new Date(b + ':00:00Z') : new Date(b + 'T00:00:00Z'); }
  function bucketLabel(b, kind, long) {
    if (kind === 'hour') return (long ? hourFmtLong : hourFmt).format(bucketDate(b, kind));
    // Day buckets are UTC days: label with the UTC date, not the local one.
    var d = bucketDate(b, kind);
    return dayFmt.format(new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())) + (long ? ' (UTC)' : '');
  }
  // Whole-number gridlines: the smallest 1/2/5×10^k step that needs ≤ 6 ticks.
  function niceScale(maxV) {
    if (maxV <= 0) return { step: 1, ticks: 1, max: 1 };
    var steps = [1, 2, 5];
    for (var p = 1; p < 1e9; p *= 10) {
      for (var i = 0; i < steps.length; i++) {
        var step = steps[i] * p;
        var ticks = Math.ceil(maxV / step);
        if (ticks <= 6) return { step: step, ticks: Math.max(1, ticks), max: Math.max(1, ticks) * step };
      }
    }
    return { step: maxV, ticks: 1, max: maxV };
  }
  function topRoundedRect(x, y, w, hgt, r) {
    r = Math.min(r, w / 2, hgt);
    if (hgt <= 0) return '';
    return 'M' + x + ' ' + (y + hgt) + 'V' + (y + r) + 'Q' + x + ' ' + y + ' ' + (x + r) + ' ' + y +
      'H' + (x + w - r) + 'Q' + (x + w) + ' ' + y + ' ' + (x + w) + ' ' + (y + r) + 'V' + (y + hgt) + 'Z';
  }

  // ---- tooltip (one for the page) ----
  var tip = h('div', 'tip', null, document.body);
  function showTip(x, y, title, rows) {
    tip.textContent = '';
    h('div', 't', title, tip);
    rows.forEach(function (r) {
      var row = h('div', 'row', null, tip);
      var left = h('span', null, null, row);
      if (r.key) h('i', 'k ' + r.key, null, left);
      left.appendChild(document.createTextNode(r.label));
      h('b', null, r.value, row);
    });
    tip.style.display = 'block';
    moveTip(x, y);
  }
  function moveTip(x, y) {
    var w = tip.offsetWidth, hh = tip.offsetHeight;
    var left = x + 14, top = y + 14;
    if (left + w > window.innerWidth - 8) left = x - w - 14;
    if (top + hh > window.innerHeight - 8) top = y - hh - 14;
    tip.style.left = Math.max(4, left) + 'px'; tip.style.top = Math.max(4, top) + 'px';
  }
  function hideTip() { tip.style.display = 'none'; }

  // ---- rounds over time: stacked columns ----
  var chartBox = document.getElementById('timechart');
  function drawTime() {
    if (!chartBox) return;
    chartBox.textContent = '';
    var W = chartBox.clientWidth || 800, H = chartBox.clientHeight || 260;
    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, width: W, height: H }, chartBox);
    var S = D.series, kind = D.bucket;
    if (!S.length) { var t = el('text', { x: W / 2, y: H / 2, 'text-anchor': 'middle', 'class': 'empty' }, svg); t.textContent = 'No rounds in this range yet.'; return; }
    var mL = 44, mR = 12, mT = 12, mB = 28;
    var pw = W - mL - mR, ph = H - mT - mB;
    var maxV = 0;
    S.forEach(function (r) { maxV = Math.max(maxV, r.rounds); });
    var scale = niceScale(maxV);
    var yMax = scale.max, ticks = scale.ticks;
    for (var i = 0; i <= ticks; i++) {
      var yy = mT + ph - (ph * i / ticks);
      el('line', { x1: mL, x2: W - mR, y1: yy, y2: yy, 'class': i === 0 ? 'base' : 'grid' }, svg);
      var lab = el('text', { x: mL - 8, y: yy + 4, 'text-anchor': 'end' }, svg);
      lab.textContent = fmtInt(scale.step * i);
    }
    var n = S.length, slot = pw / n;
    var bw = Math.max(2, Math.min(24, slot - 2));
    var every = Math.max(1, Math.ceil(n / Math.max(3, Math.floor(pw / 90))));
    S.forEach(function (r, idx) {
      var x0 = mL + slot * idx, x = x0 + (slot - bw) / 2;
      var g = el('g', { 'class': 'slot' }, svg);
      var hp = ph * r.painter_wins / yMax, hh = ph * r.hunter_wins / yMax;
      var base = mT + ph;
      if (hp > 0) {
        if (hh > 0) el('rect', { x: x, y: base - hp, width: bw, height: hp, 'class': 'p' }, g);
        else el('path', { d: topRoundedRect(x, base - hp, bw, hp, 4), 'class': 'p' }, g);
      }
      if (hh > 0) {
        var gap = hp > 0 ? 2 : 0;
        var y = base - hp - gap - hh;
        el('path', { d: topRoundedRect(x, y, bw, hh, 4), 'class': 'h' }, g);
      }
      if (idx % every === 0) {
        var xl = el('text', { x: x0 + slot / 2, y: H - 8, 'text-anchor': 'middle' }, svg);
        xl.textContent = bucketLabel(r.bucket, kind, false);
      }
      var hit = el('rect', { x: x0, y: mT, width: slot, height: ph, 'class': 'hit' }, g);
      function over(e) {
        g.classList.add('hot');
        var dec = r.hunter_wins + r.painter_wins;
        var rows = [
          { key: 'h', label: 'Hunter wins', value: fmtInt(r.hunter_wins) },
          { key: 'p', label: 'Painter wins', value: fmtInt(r.painter_wins) },
          { label: 'Hunter win rate', value: dec ? Math.round(100 * r.hunter_wins / dec) + '%' : '\\u2014' },
          { label: 'Avg lobby', value: r.rounds ? (r.players_sum / r.rounds).toFixed(1) : '\\u2014' },
          { label: 'Avg length', value: r.rounds ? fmtDur(r.seconds_sum / r.rounds) : '\\u2014' }
        ];
        if (r.abandoned) rows.push({ key: 'o', label: 'Abandoned', value: fmtInt(r.abandoned) });
        showTip(e.clientX, e.clientY, bucketLabel(r.bucket, kind, true), rows);
      }
      hit.addEventListener('pointerenter', over);
      hit.addEventListener('pointermove', function (e) { moveTip(e.clientX, e.clientY); });
      hit.addEventListener('pointerleave', function () { g.classList.remove('hot'); hideTip(); });
    });
  }
  drawTime();
  var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(drawTime, 120); });

  // ---- local-time labels in the time table ----
  Array.prototype.forEach.call(document.querySelectorAll('td[data-bucket]'), function (td) {
    td.textContent = bucketLabel(td.getAttribute('data-bucket'), td.getAttribute('data-kind'), true);
  });

  // ---- share bars: hover / focus tooltip ----
  Array.prototype.forEach.call(document.querySelectorAll('.share[data-label]'), function (row) {
    function rows() {
      var hw = +row.getAttribute('data-h'), pw = +row.getAttribute('data-p'), ab = +row.getAttribute('data-a');
      var out = [
        { key: 'h', label: 'Hunter wins', value: fmtInt(hw) },
        { key: 'p', label: 'Painter wins', value: fmtInt(pw) },
        { label: 'Avg lobby', value: row.getAttribute('data-players') },
        { label: 'Avg length', value: row.getAttribute('data-len') }
      ];
      if (ab) out.push({ key: 'o', label: 'Abandoned', value: fmtInt(ab) });
      return out;
    }
    row.addEventListener('pointerenter', function (e) { showTip(e.clientX, e.clientY, row.getAttribute('data-label'), rows()); });
    row.addEventListener('pointermove', function (e) { moveTip(e.clientX, e.clientY); });
    row.addEventListener('pointerleave', hideTip);
    row.addEventListener('focus', function () { var b = row.getBoundingClientRect(); showTip(b.left + 40, b.top + b.height, row.getAttribute('data-label'), rows()); });
    row.addEventListener('blur', hideTip);
  });

  // ---- table toggles ----
  Array.prototype.forEach.call(document.querySelectorAll('[data-toggle]'), function (btn) {
    btn.addEventListener('click', function () {
      var target = document.getElementById(btn.getAttribute('data-toggle'));
      if (!target) return;
      var open = target.hasAttribute('hidden');
      if (open) target.removeAttribute('hidden'); else target.setAttribute('hidden', '');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.textContent = open ? 'Hide table' : 'Table';
    });
  });

  // ---- filters submit on change ----
  var form = document.getElementById('filters');
  if (form) Array.prototype.forEach.call(form.querySelectorAll('select'), function (s) {
    s.addEventListener('change', function () { form.submit(); });
  });
})();
`;

export function renderDashboard(data, session) {
  const t = data.totals;
  const qs = new URLSearchParams({ range: data.filters.range });
  if (data.filters.mode) qs.set('mode', data.filters.mode);
  if (data.filters.map) qs.set('map', data.filters.map);
  const empty = t.rounds === 0 && t.abandoned === 0;

  const body = `${HTML_HEAD('Mecha Tag — round stats')}
<style>${DASH_CSS}</style>
<div class="wrap">
  <div class="top">
    <div><h1>Mecha Tag round stats</h1><div class="muted" style="font-size:13px">${esc(RANGES[data.filters.range].label)}${data.filters.mode ? ` · ${esc(modeLabel(data.filters.mode))}` : ''}${data.filters.map ? ` · ${esc(data.filters.map)}` : ''}${t.build ? ` · latest build seen ${esc(t.build)}` : ''}</div></div>
    <div class="who">${esc(session.email)} <a href="/auth/logout">Sign out</a></div>
  </div>
  ${filterForm(data)}
  ${empty ? `<section class="card"><h2>No rounds in this range yet</h2><p class="sub" style="margin:0">Rounds show up here as soon as a host finishes one with analytics enabled. Try a wider range, or check the Unity side: <code>AnalyticsConfig</code> on the scene settings object needs the endpoint URL and key, and editor sessions only send with <code>sendFromEditor</code> on.</p></section>` : ''}
  ${kpis(data)}
  ${timeCard(data)}
  ${shareCard('Win rate by map', 't-maps', data.byMap, (r) => r.map, 'Map',
    'Painter share left, hunter share right — the split point is the hunter win rate. Sorted by rounds played.')}
  ${shareCard('Win rate by mode', 't-modes', data.byMode, (r) => modeLabel(r.mode), 'Mode', '')}
  ${matrixCard(data)}
  ${settingsCard(data)}
  <div class="foot">
    <span>Export: <a href="/api/rows.csv?${qs}">CSV</a> · <a href="/api/rows.json?${qs}">JSON rows</a> · <a href="/api/stats?${qs}">JSON aggregates</a></span>
    <span>${t.first_hour ? `Data from ${esc(t.first_hour)}Z to ${esc(t.last_hour)}Z (${fmtInt(t.row_count)} hour/map/mode rows)` : 'No data rows in this slice'}</span>
    <span>Generated ${esc(data.generatedAt)}</span>
  </div>
</div>
<script id="data" type="application/json">${JSON.stringify({ series: data.series, bucket: data.bucket }).replace(/</g, '\\u003c')}</script>
<script>${CLIENT_JS}</script>
${HTML_TAIL}`;
  return htmlResponse(body);
}

// BASE_CSS is inlined by HTML_HEAD; re-exported so tests can assert it exists.
export { BASE_CSS };
