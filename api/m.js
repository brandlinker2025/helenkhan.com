import { head } from '@vercel/blob';

// Serves uploaded photos from helenkhan.com/m/... so the storage address is never shown.
export async function GET(req) {
  const p = new URL(req.url).searchParams.get('p') || '';
  if (!/^media\/(wedding|birthday|biker|food)\/[A-Za-z0-9._-]+$/.test(p)) return new Response('Not found', { status: 404 });
  try {
    const h = await head(p);
    const r = await fetch(h.url);
    if (!r.ok) return new Response('Not found', { status: 404 });
    return new Response(r.body, {
      status: 200,
      headers: {
        'content-type': h.contentType || 'image/webp',
        'cache-control': 'public, max-age=31536000, immutable',
        'x-content-type-options': 'nosniff',
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
