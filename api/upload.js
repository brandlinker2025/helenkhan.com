import { put } from '@vercel/blob';
import { CATEGORIES, MEDIA_PATH, clean, json, newId, readJSON, session, writeJSON } from './_lib/common.js';

const TYPES = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png' };
const MAX = 4_300_000; // the admin page resizes photos first, so real uploads are far smaller

// Admin: upload one photo (raw body). Headers: x-category, x-title (URI-encoded).
export async function POST(req) {
  const s = session(req);
  if (!s) return json({ error: 'Please sign in again.' }, 401);
  const category = req.headers.get('x-category') || '';
  if (!CATEGORIES.includes(category) || category === 'showreel') return json({ error: 'Choose a category for the photo.' }, 400);
  const type = (req.headers.get('content-type') || '').split(';')[0];
  const ext = TYPES[type];
  if (!ext) return json({ error: 'Only photos (JPG, PNG, WebP) can be uploaded here.' }, 415);
  const buf = Buffer.from(await req.arrayBuffer());
  if (!buf.length) return json({ error: 'The file was empty.' }, 400);
  if (buf.length > MAX) return json({ error: 'This photo is too large. Try a smaller one.' }, 413);

  let title = '';
  try { title = clean(decodeURIComponent(req.headers.get('x-title') || '')); } catch {}

  const blob = await put(`media/${category}/${Date.now()}.${ext}`, buf, {
    access: 'public', addRandomSuffix: true, contentType: type,
  });
  const data = await readJSON(MEDIA_PATH, { items: [] });
  const items = data.items || [];
  const item = { id: newId(), type: 'photo', category, title, url: blob.url, by: s.email, created: Date.now() };
  items.unshift(item);
  await writeJSON(MEDIA_PATH, { items });
  return json({ ok: true, item });
}
