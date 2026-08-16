// "Sign in with Google" for the dashboard, done the plain way:
//
//   /auth/login     → redirect to Google (OAuth 2.0 authorization-code flow,
//                     state + nonce in a short-lived cookie)
//   /auth/callback  → exchange the code for an ID token, check its claims,
//                     check the e-mail against ALLOWED_EMAILS, set a signed
//                     session cookie
//   /auth/logout    → clear the session cookie
//
// The ID token arrives straight from Google's token endpoint over TLS in a
// server-to-server call, so per OpenID Connect Core §3.1.3.7 the TLS channel
// authenticates the issuer and no JWS signature check is required — we still
// verify iss / aud / exp / nonce / email_verified. Sessions are an HMAC-SHA256
// signed cookie (WebCrypto), so there is no session store to run.
//
// Config (wrangler secrets / vars):
//   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET  — the OAuth client (Web application)
//   SESSION_SECRET                          — long random string; rotate to log everyone out
//   ALLOWED_EMAILS                          — comma-separated allow list
//   SESSION_TTL_SECONDS                     — optional, default 30 days
//   GOOGLE_TOKEN_URL                        — tests only: point the code exchange at a fake

import { errorPage } from './pages.js';
import { b64urlDecode, b64urlEncode, randomHex, safeEqual, utf8 } from './util.js';

export const SESSION_COOKIE = 'mt_session';
export const OAUTH_COOKIE = 'mt_oauth';
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_ISSUERS = new Set(['https://accounts.google.com', 'accounts.google.com']);
const DEFAULT_TTL_SECONDS = 30 * 24 * 3600;
const OAUTH_STATE_TTL_SECONDS = 600;

// ---------- cookies ----------

export function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i <= 0) continue;
    const k = part.slice(0, i).trim();
    if (k) out[k] = part.slice(i + 1).trim();
  }
  return out;
}

export function serializeCookie(name, value, { maxAge, path = '/', secure = true, sameSite = 'Lax' } = {}) {
  let s = `${name}=${value}; Path=${path}; HttpOnly; SameSite=${sameSite}`;
  if (secure) s += '; Secure';
  if (typeof maxAge === 'number') s += `; Max-Age=${maxAge}`;
  return s;
}

/** `Secure` cookies only make sense over https; local `wrangler dev` is http. */
export const isSecureUrl = (url) => url.protocol === 'https:';

// ---------- session tokens ----------

async function hmacKey(secret) {
  return crypto.subtle.importKey('raw', utf8.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

/** `<base64url(json)>.<base64url(hmac)>` */
export async function signSession(secret, payload) {
  const body = b64urlEncode(utf8.encode(JSON.stringify(payload)));
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(secret), utf8.encode(body));
  return `${body}.${b64urlEncode(new Uint8Array(sig))}`;
}

/** Payload if the signature and expiry check out, else null. */
export async function verifySession(secret, token, nowMs = Date.now()) {
  if (typeof token !== 'string' || !secret) return null;
  const dot = token.indexOf('.');
  if (dot <= 0 || dot === token.length - 1) return null;
  const body = token.slice(0, dot);
  let sig;
  try {
    sig = b64urlDecode(token.slice(dot + 1));
  } catch {
    return null;
  }
  const ok = await crypto.subtle.verify('HMAC', await hmacKey(secret), sig, utf8.encode(body));
  if (!ok) return null;
  let payload;
  try {
    payload = JSON.parse(utf8.decode(b64urlDecode(body)));
  } catch {
    return null;
  }
  if (!payload || typeof payload.email !== 'string' || typeof payload.exp !== 'number') return null;
  if (payload.exp * 1000 <= nowMs) return null;
  return payload;
}

// ---------- Google ID token ----------

/** Payload of a JWT, WITHOUT signature verification (see header comment). */
export function decodeJwtPayload(jwt) {
  const parts = typeof jwt === 'string' ? jwt.split('.') : [];
  if (parts.length !== 3) return null;
  try {
    return JSON.parse(utf8.decode(b64urlDecode(parts[1])));
  } catch {
    return null;
  }
}

/** Null when the claims are acceptable, else a short reason. */
export function validateIdClaims(claims, { clientId, nonce, nowMs = Date.now() }) {
  if (!claims || typeof claims !== 'object') return 'no claims';
  if (!GOOGLE_ISSUERS.has(claims.iss)) return 'bad issuer';
  if (claims.aud !== clientId) return 'bad audience';
  if (typeof claims.exp !== 'number' || claims.exp * 1000 <= nowMs) return 'expired';
  if (nonce && claims.nonce !== nonce) return 'nonce mismatch';
  if (typeof claims.email !== 'string' || !claims.email) return 'no email';
  if (claims.email_verified !== true && claims.email_verified !== 'true') return 'email not verified';
  return null;
}

export function emailAllowed(email, allowedCsv) {
  const e = String(email || '').trim().toLowerCase();
  if (!e) return false;
  return String(allowedCsv || '')
    .split(/[,\s]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .includes(e);
}

export const redirectUri = (url) => `${url.origin}/auth/callback`;

export const authConfigured = (env) => Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.SESSION_SECRET);

// ---------- handlers ----------

/** The signed-in viewer ({email, iat, exp}) or null. */
export async function getSession(request, env) {
  if (!env.SESSION_SECRET) return null;
  const token = parseCookies(request.headers.get('Cookie'))[SESSION_COOKIE];
  if (!token) return null;
  const session = await verifySession(env.SESSION_SECRET, token);
  if (!session) return null;
  // Revocation by config: drop an e-mail from ALLOWED_EMAILS and its
  // existing cookie stops working on the next request.
  if (!emailAllowed(session.email, env.ALLOWED_EMAILS)) return null;
  return session;
}

export function handleLogin(request, env) {
  const url = new URL(request.url);
  if (!authConfigured(env)) {
    return errorPage(503, 'Sign-in not configured',
      'Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and SESSION_SECRET on the Worker (see README).');
  }
  const state = randomHex(16);
  const nonce = randomHex(16);
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri(url),
    response_type: 'code',
    scope: 'openid email',
    state,
    nonce,
    prompt: 'select_account',
    access_type: 'online',
  });
  const headers = new Headers({ Location: `${GOOGLE_AUTH_URL}?${params}`, 'Cache-Control': 'no-store' });
  headers.append('Set-Cookie', serializeCookie(OAUTH_COOKIE, `${state}.${nonce}`, {
    maxAge: OAUTH_STATE_TTL_SECONDS, path: '/auth', secure: isSecureUrl(url),
  }));
  return new Response(null, { status: 302, headers });
}

export async function handleCallback(request, env) {
  const url = new URL(request.url);
  const secure = isSecureUrl(url);
  const clearOauth = serializeCookie(OAUTH_COOKIE, '', { maxAge: 0, path: '/auth', secure });

  if (url.searchParams.get('error')) {
    return errorPage(400, 'Sign-in cancelled', `Google reported: ${url.searchParams.get('error')}.`, [clearOauth]);
  }
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const [cookieState, cookieNonce] = (parseCookies(request.headers.get('Cookie'))[OAUTH_COOKIE] || '').split('.');
  if (!code || !state || !cookieState || !safeEqual(state, cookieState)) {
    return errorPage(400, 'Sign-in state mismatch',
      'The sign-in attempt did not match this browser (expired or reused link). Start again.', [clearOauth]);
  }
  if (!authConfigured(env)) {
    return errorPage(503, 'Sign-in not configured',
      'Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and SESSION_SECRET on the Worker (see README).', [clearOauth]);
  }

  let tokenRes;
  try {
    tokenRes = await fetch(env.GOOGLE_TOKEN_URL || GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri(url),
        grant_type: 'authorization_code',
      }),
    });
  } catch {
    return errorPage(502, 'Could not reach Google', 'The token exchange failed to connect. Try again.', [clearOauth]);
  }
  if (!tokenRes.ok) {
    return errorPage(502, 'Google rejected the sign-in',
      `The token endpoint answered ${tokenRes.status}. The usual cause is a redirect-URI mismatch: ` +
      `the OAuth client must list ${redirectUri(url)} under "Authorized redirect URIs".`, [clearOauth]);
  }
  const tokens = await tokenRes.json().catch(() => null);
  const claims = decodeJwtPayload(tokens && tokens.id_token);
  const problem = validateIdClaims(claims, { clientId: env.GOOGLE_CLIENT_ID, nonce: cookieNonce });
  if (problem) return errorPage(401, 'Sign-in failed', `ID token check failed: ${problem}.`, [clearOauth]);

  const email = claims.email.trim().toLowerCase();
  if (!emailAllowed(email, env.ALLOWED_EMAILS)) {
    return errorPage(403, 'Not on the list', `${email} is not allowed to view this dashboard.`, [clearOauth],
      { showSignOut: true });
  }

  const ttl = Number(env.SESSION_TTL_SECONDS) > 0 ? Number(env.SESSION_TTL_SECONDS) : DEFAULT_TTL_SECONDS;
  const now = Math.floor(Date.now() / 1000);
  const token = await signSession(env.SESSION_SECRET, { email, iat: now, exp: now + ttl });
  const headers = new Headers({ Location: '/', 'Cache-Control': 'no-store' });
  headers.append('Set-Cookie', serializeCookie(SESSION_COOKIE, token, { maxAge: ttl, path: '/', secure }));
  headers.append('Set-Cookie', clearOauth);
  return new Response(null, { status: 302, headers });
}

export function handleLogout(request) {
  const url = new URL(request.url);
  const headers = new Headers({ Location: '/', 'Cache-Control': 'no-store' });
  headers.append('Set-Cookie', serializeCookie(SESSION_COOKIE, '', { maxAge: 0, path: '/', secure: isSecureUrl(url) }));
  return new Response(null, { status: 302, headers });
}
