import { isGoogleMapsUrl, latLngFromMapsUrl } from '$lib/mapLinks';

const MAP_FETCH_TIMEOUT_MS = 5000;

export type ResolvedMapUrl = {
  location: { lat: number; lng: number } | null;
  resolvedUrl: string | null;
};

export async function resolveGoogleMapsUrl(
  mapsUrl: string,
  fetcher: typeof fetch = fetch
): Promise<ResolvedMapUrl> {
  const directLocation = latLngFromMapsUrl(mapsUrl);
  if (directLocation) return { location: directLocation, resolvedUrl: mapsUrl };
  if (!isGoogleMapsUrl(mapsUrl)) return { location: null, resolvedUrl: null };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MAP_FETCH_TIMEOUT_MS);

  try {
    const response = await fetcher(mapsUrl, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal
    });
    const resolvedUrl = response.url || mapsUrl;
    if (!isGoogleMapsUrl(resolvedUrl)) return { location: null, resolvedUrl: mapsUrl };

    return {
      location: latLngFromMapsUrl(resolvedUrl),
      resolvedUrl
    };
  } finally {
    clearTimeout(timeout);
  }
}
