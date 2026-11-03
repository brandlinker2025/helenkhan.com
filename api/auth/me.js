import { json, session } from '../_lib/common.js';

export function GET(req) {
  const s = session(req);
  return s ? json({ email: s.email }) : json({ error: 'Not signed in' }, 401);
}

export function DELETE() {
  return json({ ok: true }, 200, { 'set-cookie': 'hk_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0' });
}
