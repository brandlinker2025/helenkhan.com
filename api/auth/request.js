import crypto from 'node:crypto';
import { ADMINS, configured, hashCode, json, readJSON, writeJSON, PENDING_PATH } from '../_lib/common.js';

export async function POST(req) {
  if (!configured() || !process.env.RESEND_API_KEY) return json({ error: 'Login is not set up yet. Please contact the site owner.' }, 503);
  const { email } = await req.json().catch(() => ({}));
  const e = String(email || '').trim().toLowerCase();
  // Same answer for unknown emails, so the page never reveals who is allowed.
  if (!ADMINS.includes(e)) return json({ ok: true });

  const prev = await readJSON(PENDING_PATH, null);
  if (prev && prev.email === e && prev.sent && Date.now() - prev.sent < 60_000) {
    return json({ error: 'A code was just sent. Please wait one minute before asking again.' }, 429);
  }

  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
  await writeJSON(PENDING_PATH, { email: e, hash: hashCode(e, code), exp: Date.now() + 10 * 60_000, tries: 0, sent: Date.now() });

  const from = process.env.MAIL_FROM || 'Helena Khan Studio <studio@helenkhan.com>';
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from, to: [e],
      subject: `Your login code: ${code}`,
      text: `Your Helena Khan Studio login code is ${code}\n\nIt works for 10 minutes. If you did not ask for this, you can ignore this email.`,
      html: `<div style="font-family:Arial,sans-serif;max-width:420px;padding:24px;color:#1a1206">
        <p style="margin:0 0 8px;font-size:13px;letter-spacing:.1em;text-transform:uppercase;color:#9c6a1e">Helena Khan Studio</p>
        <p style="margin:0 0 16px">Your login code:</p>
        <p style="font-size:34px;font-weight:700;letter-spacing:.3em;margin:0 0 16px">${code}</p>
        <p style="margin:0;color:#6b6257;font-size:13px">It works for 10 minutes. If you did not ask for this, ignore this email.</p></div>`,
    }),
  });
  if (!r.ok) return json({ error: 'Could not send the email right now. Please try again in a minute.' }, 502);
  return json({ ok: true });
}
