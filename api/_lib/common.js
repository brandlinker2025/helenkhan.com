import crypto from 'node:crypto';
import { put, head } from '@vercel/blob';

// Who may log in: comma-separated list set in Vercel env (owner-controlled).
export const ADMINS = (process.env.ADMIN_EMAILS || '')
  .toLowerCase().split(',').map((s) => s.trim()).filter(Boolean);
const SECRET = process.env.AUTH_SECRET || '';

export const CATEGORIES = ['wedding', 'birthday', 'biker', 'food', 'showreel'];
export const MEDIA_PATH = 'data/media.json';
export const PENDING_PATH = 'auth/pending.json';

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...headers },
  });
}

export const configured = () => Boolean(SECRET && ADMINS.length && process.env.BLOB_READ_WRITE_TOKEN);

const hmac = (s) => crypto.createHmac('sha256', SECRET).update(s).digest('base64url');
export const hashCode = (email, code) => hmac(`code:${email}:${code}`);

export function sign(obj) {
  const p = Buffer.from(JSON.stringify(obj)).toString('base64url');
  return `${p}.${hmac(p)}`;
}

export function unsign(token) {
  if (!token || !SECRET) return null;
  const [p, s] = token.split('.');
  if (!p || !s) return null;
  const expected = hmac(p);
  if (expected.length !== s.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(s))) return null;
  try {
    const o = JSON.parse(Buffer.from(p, 'base64url').toString());
    return o.exp > Date.now() ? o : null;
  } catch { return null; }
}

function readCookie(req, name) {
  const c = req.headers.get('cookie') || '';
  const m = c.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}

// Returns the signed-in admin, or null. Removing an email from ADMIN_EMAILS revokes access at once.
export function session(req) {
  const o = unsign(readCookie(req, 'hk_session'));
  return o && o.t === 's' && ADMINS.includes(o.email) ? o : null;
}

export async function readJSON(path, fallback) {
  try {
    const h = await head(path);
    const r = await fetch(`${h.url}?t=${Date.now()}`, { cache: 'no-store' });
    return r.ok ? await r.json() : fallback;
  } catch { return fallback; }
}

export async function writeJSON(path, data) {
  await put(path, JSON.stringify(data), {
    access: 'public', addRandomSuffix: false, allowOverwrite: true,
    contentType: 'application/json', cacheControlMaxAge: 60,
  });
}

export const newId = () => crypto.randomBytes(6).toString('hex');

export function youtubeId(url) {
  const s = String(url || '').trim();
  const m = s.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([A-Za-z0-9_-]{11})/);
  if (m) return m[1];
  return /^[A-Za-z0-9_-]{11}$/.test(s) ? s : null;
}

export const clean = (t, n = 80) => String(t || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n);
