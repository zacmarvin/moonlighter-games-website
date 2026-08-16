// Tiny server-rendered pages that are not the dashboard: sign-in and errors.
// Self-contained HTML — no external assets, so nothing loads from a third
// party and the pages work behind any CSP.

import { escapeHtml } from './util.js';

/** Shared chrome: system sans, light/dark by OS preference, brand accents. */
export const BASE_CSS = `
:root {
  color-scheme: light;
  --page: #f9f9f7; --surface: #fcfcfb; --ink: #0b0b0b; --ink-2: #52514e; --muted: #898781;
  --grid: #e1e0d9; --axis: #c3c2b7; --ring: rgba(11,11,11,0.10);
  --accent: #2B5433; --accent-ink: #ffffff; --accent-soft: #e6efe4;
  --series-1: #2a78d6; --series-2: #eb6834; --other: #b8b7b0;
  --good-text: #006300;
}
@media (prefers-color-scheme: dark) {
  :root {
    color-scheme: dark;
    --page: #0d0d0d; --surface: #1a1a19; --ink: #ffffff; --ink-2: #c3c2b7; --muted: #898781;
    --grid: #2c2c2a; --axis: #383835; --ring: rgba(255,255,255,0.10);
    --accent: #8CBA6E; --accent-ink: #0d0d0d; --accent-soft: #223126;
    --series-1: #3987e5; --series-2: #d95926; --other: #5a5953;
    --good-text: #0ca30c;
  }
}
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  background: var(--page); color: var(--ink);
  font: 15px/1.45 system-ui, -apple-system, "Segoe UI", sans-serif;
  -webkit-font-smoothing: antialiased;
}
a { color: inherit; }
.wrap { max-width: 1120px; margin: 0 auto; padding: 24px 20px 48px; }
.card {
  background: var(--surface); border: 1px solid var(--ring); border-radius: 12px;
  padding: 18px 20px;
}
h1 { font-size: 22px; font-weight: 650; margin: 0 0 4px; letter-spacing: -0.01em; }
h2 { font-size: 15px; font-weight: 650; margin: 0 0 12px; color: var(--ink); }
.sub { color: var(--ink-2); margin: 0 0 20px; }
.btn {
  display: inline-block; padding: 10px 16px; border-radius: 8px; text-decoration: none;
  background: var(--accent); color: var(--accent-ink); font-weight: 600; border: 0; cursor: pointer;
  font: inherit; font-weight: 600;
}
.btn.ghost { background: transparent; color: var(--ink); border: 1px solid var(--axis); }
.muted { color: var(--muted); }
code { font: 13px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; background: var(--accent-soft); padding: 1px 5px; border-radius: 4px; }
`;

const HTML_HEAD = (title) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${escapeHtml(title)}</title>
<style>${BASE_CSS}</style></head><body>`;

const HTML_TAIL = `</body></html>`;

export function htmlResponse(body, status = 200, extraHeaders = []) {
  const headers = new Headers({
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'self'",
  });
  for (const [k, v] of extraHeaders) headers.append(k, v);
  return new Response(body, { status, headers });
}

/** The gate: what an unauthenticated visitor sees. */
export function signInPage({ configured, message } = {}) {
  const note = configured
    ? `<p class="sub">Sign in with the Google account that's on the allow list.</p>
       <a class="btn" href="/auth/login">Sign in with Google</a>`
    : `<p class="sub">Google sign-in isn't configured on this Worker yet — set
       <code>GOOGLE_CLIENT_ID</code>, <code>GOOGLE_CLIENT_SECRET</code> and
       <code>SESSION_SECRET</code> (see the README), then reload.</p>`;
  const msg = message ? `<p class="sub" style="color:var(--ink)">${escapeHtml(message)}</p>` : '';
  return htmlResponse(`${HTML_HEAD('Mecha Tag — round stats')}
<div class="wrap" style="max-width:520px;padding-top:12vh">
  <div class="card" style="padding:28px">
    <h1>Mecha Tag round stats</h1>
    ${msg}${note}
    <p class="muted" style="margin:22px 0 0;font-size:13px">Private dashboard — Moonlighter Games.</p>
  </div>
</div>${HTML_TAIL}`);
}

/** Uniform error page; `cookies` are Set-Cookie strings to attach (e.g. clearing state). */
export function errorPage(status, title, detail, cookies = [], { showSignOut = false } = {}) {
  const actions = showSignOut
    ? `<a class="btn" href="/auth/logout">Sign out and try another account</a>`
    : `<a class="btn" href="/auth/login">Try again</a>`;
  return htmlResponse(`${HTML_HEAD(title)}
<div class="wrap" style="max-width:520px;padding-top:12vh">
  <div class="card" style="padding:28px">
    <h1>${escapeHtml(title)}</h1>
    <p class="sub">${escapeHtml(detail)}</p>
    ${actions}
  </div>
</div>${HTML_TAIL}`, status, cookies.map((c) => ['Set-Cookie', c]));
}

export { HTML_HEAD, HTML_TAIL };
