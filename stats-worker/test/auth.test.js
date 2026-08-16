import test from 'node:test';
import assert from 'node:assert/strict';

import {
  signSession, verifySession, decodeJwtPayload, validateIdClaims, emailAllowed,
  parseCookies, serializeCookie, getSession, SESSION_COOKIE,
} from '../src/auth.js';
import { b64urlEncode, b64urlDecode, safeEqual, escapeHtml, utf8 } from '../src/util.js';

const SECRET = 'unit-test-secret';

test('session round-trips and rejects tampering, wrong secret, expiry', async () => {
  const now = Math.floor(Date.now() / 1000);
  const token = await signSession(SECRET, { email: 'info@moonlightergames.com', iat: now, exp: now + 60 });
  assert.match(token, /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);

  const ok = await verifySession(SECRET, token);
  assert.equal(ok.email, 'info@moonlightergames.com');

  assert.equal(await verifySession('other-secret', token), null);
  assert.equal(await verifySession(SECRET, token.slice(0, -2) + 'AA'), null);
  // Flip a byte in the payload → signature no longer matches.
  const [body, sig] = token.split('.');
  const bytes = b64urlDecode(body);
  bytes[5] ^= 1;
  assert.equal(await verifySession(SECRET, `${b64urlEncode(bytes)}.${sig}`), null);
  // Expired.
  const old = await signSession(SECRET, { email: 'a@b.c', iat: now - 120, exp: now - 60 });
  assert.equal(await verifySession(SECRET, old), null);
  // Garbage.
  assert.equal(await verifySession(SECRET, 'nope'), null);
  assert.equal(await verifySession(SECRET, ''), null);
  assert.equal(await verifySession(SECRET, undefined), null);
  assert.equal(await verifySession('', token), null);
});

function fakeJwt(claims) {
  const enc = (o) => b64urlEncode(utf8.encode(JSON.stringify(o)));
  return `${enc({ alg: 'RS256', typ: 'JWT' })}.${enc(claims)}.${b64urlEncode(new Uint8Array([1, 2, 3]))}`;
}

test('ID token claims are checked: iss, aud, exp, nonce, email_verified', () => {
  const now = Date.now();
  const base = {
    iss: 'https://accounts.google.com', aud: 'client-1', exp: Math.floor(now / 1000) + 300,
    email: 'Info@MoonlighterGames.com', email_verified: true, nonce: 'n1',
  };
  const opts = { clientId: 'client-1', nonce: 'n1', nowMs: now };
  assert.equal(validateIdClaims(decodeJwtPayload(fakeJwt(base)), opts), null);
  assert.equal(validateIdClaims(decodeJwtPayload(fakeJwt({ ...base, iss: 'accounts.google.com' })), opts), null);
  assert.equal(validateIdClaims(decodeJwtPayload(fakeJwt({ ...base, iss: 'https://evil.example' })), opts), 'bad issuer');
  assert.equal(validateIdClaims(decodeJwtPayload(fakeJwt({ ...base, aud: 'client-2' })), opts), 'bad audience');
  assert.equal(validateIdClaims(decodeJwtPayload(fakeJwt({ ...base, exp: Math.floor(now / 1000) - 1 })), opts), 'expired');
  assert.equal(validateIdClaims(decodeJwtPayload(fakeJwt({ ...base, nonce: 'other' })), opts), 'nonce mismatch');
  assert.equal(validateIdClaims(decodeJwtPayload(fakeJwt({ ...base, email_verified: false })), opts), 'email not verified');
  assert.equal(validateIdClaims(decodeJwtPayload(fakeJwt({ ...base, email: '' })), opts), 'no email');
  assert.equal(validateIdClaims(null, opts), 'no claims');
  assert.equal(decodeJwtPayload('not.a.jwt.really'), null);
  assert.equal(decodeJwtPayload('two.parts'), null);
});

test('allow list is case-insensitive and tolerant of spacing', () => {
  assert.equal(emailAllowed('Info@MoonlighterGames.com', 'info@moonlightergames.com'), true);
  assert.equal(emailAllowed('info@moonlightergames.com', ' a@b.c ,  info@moonlightergames.com,x@y.z'), true);
  assert.equal(emailAllowed('someone@gmail.com', 'info@moonlightergames.com'), false);
  assert.equal(emailAllowed('', 'info@moonlightergames.com'), false);
  assert.equal(emailAllowed('info@moonlightergames.com', ''), false);
  assert.equal(emailAllowed('info@moonlightergames.com', undefined), false);
});

test('cookies parse and serialize', () => {
  assert.deepEqual(parseCookies('a=1; mt_session=x.y; empty=; =bad'), { a: '1', mt_session: 'x.y', empty: '' });
  assert.deepEqual(parseCookies(null), {});
  const c = serializeCookie('mt_session', 'v', { maxAge: 10, secure: true });
  assert.equal(c, 'mt_session=v; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=10');
  assert.equal(serializeCookie('x', '', { maxAge: 0, path: '/auth', secure: false }), 'x=; Path=/auth; HttpOnly; SameSite=Lax; Max-Age=0');
});

test('getSession requires a valid cookie AND an allow-listed e-mail', async () => {
  const now = Math.floor(Date.now() / 1000);
  const env = { SESSION_SECRET: SECRET, ALLOWED_EMAILS: 'info@moonlightergames.com' };
  const good = await signSession(SECRET, { email: 'info@moonlightergames.com', iat: now, exp: now + 60 });
  const req = (cookie) => new Request('https://x.test/', { headers: cookie ? { Cookie: cookie } : {} });
  assert.equal((await getSession(req(`${SESSION_COOKIE}=${good}`), env)).email, 'info@moonlightergames.com');
  assert.equal(await getSession(req(null), env), null);
  assert.equal(await getSession(req(`${SESSION_COOKIE}=garbage`), env), null);
  // Cookie is valid but the e-mail was removed from the list → revoked.
  assert.equal(await getSession(req(`${SESSION_COOKIE}=${good}`), { ...env, ALLOWED_EMAILS: 'other@x.y' }), null);
  // No secret configured → nobody is signed in.
  assert.equal(await getSession(req(`${SESSION_COOKIE}=${good}`), { ALLOWED_EMAILS: env.ALLOWED_EMAILS }), null);
});

test('helpers: safeEqual, escapeHtml, base64url', () => {
  assert.equal(safeEqual('abc', 'abc'), true);
  assert.equal(safeEqual('abc', 'abd'), false);
  assert.equal(safeEqual('abc', 'abcd'), false);
  assert.equal(safeEqual(undefined, 'abc'), false);
  assert.equal(escapeHtml(`<a href="x">'&`), '&lt;a href=&quot;x&quot;&gt;&#39;&amp;');
  const bytes = new Uint8Array([0, 255, 62, 63, 250, 1]);
  assert.deepEqual([...b64urlDecode(b64urlEncode(bytes))], [...bytes]);
  assert.ok(!/[+/=]/.test(b64urlEncode(bytes)));
});
