import { configured, hashCode, json, readJSON, sign, writeJSON, PENDING_PATH, guard } from '../_lib/common.js';

const DAYS = 30;

export const POST = guard(async (req) => {
  if (!configured()) return json({ error: 'Login is not set up yet.' }, 503);
  const { email, code } = await req.json().catch(() => ({}));
  const e = String(email || '').trim().toLowerCase();
  const c = String(code || '').replace(/\D/g, '');

  const p = await readJSON(PENDING_PATH, null);
  if (!p || p.email !== e || !p.hash || p.exp < Date.now()) {
    return json({ error: 'This code has expired. Ask for a new code.' }, 400);
  }
  if (p.tries >= 5) return json({ error: 'Too many wrong tries. Ask for a new code.' }, 429);
  if (hashCode(e, c) !== p.hash) {
    await writeJSON(PENDING_PATH, { ...p, tries: (p.tries || 0) + 1 });
    return json({ error: 'That code is not right. Check the newest email and try again.' }, 400);
  }

  await writeJSON(PENDING_PATH, { used: Date.now() });
  const token = sign({ t: 's', email: e, exp: Date.now() + DAYS * 86_400_000 });
  return json({ ok: true, email: e }, 200, {
    'set-cookie': `hk_session=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${DAYS * 86_400}`,
  });
}, { write: true });
