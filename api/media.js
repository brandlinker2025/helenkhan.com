import { del } from '@vercel/blob';
import { CATEGORIES, MEDIA_PATH, clean, json, newId, readJSON, session, writeJSON, youtubeId } from './_lib/common.js';

// Public: list of photos/videos Helena has added.
export async function GET() {
  const data = await readJSON(MEDIA_PATH, { items: [] });
  return json({ items: data.items || [] });
}

// Admin: add a YouTube video.
export async function POST(req) {
  const s = session(req);
  if (!s) return json({ error: 'Please sign in again.' }, 401);
  const body = await req.json().catch(() => ({}));
  const category = String(body.category || '');
  if (!CATEGORIES.includes(category)) return json({ error: 'Choose a category.' }, 400);
  const yt = youtubeId(body.url);
  if (!yt) return json({ error: 'That does not look like a YouTube link. Copy the link from YouTube\'s Share button.' }, 400);

  const data = await readJSON(MEDIA_PATH, { items: [] });
  const items = data.items || [];
  if (category === 'showreel') for (const it of items.filter((x) => x.category === 'showreel')) items.splice(items.indexOf(it), 1);
  const item = { id: newId(), type: 'video', category, title: clean(body.title), youtube: yt, by: s.email, created: Date.now() };
  items.unshift(item);
  await writeJSON(MEDIA_PATH, { items });
  return json({ ok: true, item });
}

// Admin: remove a photo or video.
export async function DELETE(req) {
  const s = session(req);
  if (!s) return json({ error: 'Please sign in again.' }, 401);
  const id = new URL(req.url).searchParams.get('id');
  const data = await readJSON(MEDIA_PATH, { items: [] });
  const items = data.items || [];
  const item = items.find((x) => x.id === id);
  if (!item) return json({ error: 'Already removed.' }, 404);
  await writeJSON(MEDIA_PATH, { items: items.filter((x) => x.id !== id) });
  if (item.type === 'photo' && item.url) await del(item.url).catch(() => {});
  return json({ ok: true });
}
