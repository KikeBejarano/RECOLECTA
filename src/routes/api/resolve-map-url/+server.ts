import { json, type RequestHandler } from '@sveltejs/kit';
import { isGoogleMapsUrl } from '$lib/mapLinks';
import { resolveGoogleMapsUrl } from '$lib/server/mapResolver';

export const GET: RequestHandler = async ({ url, fetch }) => {
  const rawUrl = url.searchParams.get('url') || '';

  if (!rawUrl || !isGoogleMapsUrl(rawUrl)) {
    return json({ location: null, resolvedUrl: null }, { status: 400 });
  }

  try {
    return json(await resolveGoogleMapsUrl(rawUrl, fetch));
  } catch (error) {
    console.error('Map URL resolution failed', error);
    return json({ location: null, resolvedUrl: rawUrl }, { status: 502 });
  }
};
