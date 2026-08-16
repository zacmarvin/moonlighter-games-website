// Mecha Tag round telemetry — Cloudflare Worker + D1.
//
//   POST /r                    ingest one completed round (X-Key shared secret)  → 204
//   GET  /                     the dashboard (Google sign-in, allow-listed e-mails)
//   GET  /api/stats            the dashboard's aggregates as JSON      (same auth)
//   GET  /api/rows.json|.csv   raw hour/map/mode rows for export       (same auth)
//   GET  /auth/login|callback|logout
//   GET  /healthz              200 "ok" — no auth, reveals nothing
//
// Everything else → 404. See README.md for setup, and ../analytics design
// notes in the game repo (Mecha Doh/analytics.md).

import { handleIngest } from './ingest.js';
import { authConfigured, getSession, handleCallback, handleLogin, handleLogout } from './auth.js';
import { renderDashboard } from './dashboard.js';
import { signInPage } from './pages.js';
import { loadRows, loadStats, parseFilters, rowsToCsv } from './stats.js';

const json = (obj, status = 200) => new Response(JSON.stringify(obj), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
});

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (path === '/r') {
        if (request.method !== 'POST') return new Response('method not allowed', { status: 405, headers: { Allow: 'POST' } });
        return await handleIngest(request, env);
      }
      if (path === '/healthz') return new Response('ok', { status: 200 });

      if (request.method !== 'GET' && request.method !== 'HEAD') {
        return new Response('method not allowed', { status: 405 });
      }

      if (path === '/auth/login') return handleLogin(request, env);
      if (path === '/auth/callback') return await handleCallback(request, env);
      if (path === '/auth/logout') return handleLogout(request);

      // Everything below is for signed-in, allow-listed viewers only.
      if (path === '/' || path.startsWith('/api/')) {
        const session = await getSession(request, env);
        if (!session) {
          if (path.startsWith('/api/')) return json({ error: 'unauthorized' }, 401);
          return signInPage({ configured: authConfigured(env) });
        }
        const filters = parseFilters(url);

        if (path === '/') return renderDashboard(await loadStats(env.DB, filters), session);
        if (path === '/api/stats') return json(await loadStats(env.DB, filters));
        if (path === '/api/rows.json') return json(await loadRows(env.DB, filters));
        if (path === '/api/rows.csv') {
          const csv = rowsToCsv(await loadRows(env.DB, filters));
          return new Response(csv, {
            headers: {
              'Content-Type': 'text/csv; charset=utf-8',
              'Content-Disposition': `attachment; filename="mecha-tag-rounds-${filters.range}.csv"`,
              'Cache-Control': 'no-store',
            },
          });
        }
      }

      return new Response('not found', { status: 404 });
    } catch (err) {
      // Never leak stack traces; the Cloudflare log has them.
      console.error('unhandled', err && err.stack ? err.stack : err);
      return new Response('internal error', { status: 500 });
    }
  },
};
