import { json, type RequestHandler } from '@sveltejs/kit';
import { isGoogleMapsUrl, latLngFromMapsUrl } from '$lib/mapLinks';

export const GET: RequestHandler = async ({ url, fetch }) => {
  const rawUrl = url.searchParams.get('url') || '';

  if (!rawUrl || !isGoogleMapsUrl(rawUrl)) {
    return json({ location: null, resolvedUrl: null }, { status: 400 });
  }

  const directLocation = latLngFromMapsUrl(rawUrl);
  if (directLocation) {
    return json({ location: directLocation, resolvedUrl: rawUrl });
  }

  try {
    const response = await fetch(rawUrl, {
      method: 'GET',
      redirect: 'follow'
    });
    const resolvedUrl = response.url || rawUrl;
    const location = latLngFromMapsUrl(resolvedUrl);

    return json({ location, resolvedUrl });
  } catch (error) {
    console.error('Map URL resolution failed', error);
    return json({ location: null, resolvedUrl: rawUrl }, { status: 502 });
  }
};
