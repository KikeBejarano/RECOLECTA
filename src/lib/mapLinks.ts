export function mapsUrlFromLatLng(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat.toFixed(6)},${lng.toFixed(6)}`;
}

export function isValidLatLng(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

export function latLngFromMapsUrl(url: string): { lat: number; lng: number } | null {
  const value = url.trim();
  if (!value) return null;
  const decodedValue = safeDecodeURIComponent(value);

  const values = decodedValue === value ? [value] : [value, decodedValue];
  const precisePatterns = [
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/i,
    /%213d(-?\d+(?:\.\d+)?)%214d(-?\d+(?:\.\d+)?)/i
  ];
  const fallbackPatterns = [
    /[?&]query=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/i,
    /\/place\/(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/i,
    /@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/i
  ];

  return findLatLng(values, precisePatterns) || findLatLng(values, fallbackPatterns);
}

function findLatLng(values: string[], patterns: RegExp[]): { lat: number; lng: number } | null {
  for (const value of values) {
    for (const pattern of patterns) {
      const match = value.match(pattern);
      if (!match) continue;

      const lat = Number(match[1]);
      const lng = Number(match[2]);
      if (isValidLatLng(lat, lng)) return { lat, lng };
    }
  }

  return null;
}

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function isGoogleMapsUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const pathname = parsed.pathname.toLowerCase();

    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
    if (host === 'maps.app.goo.gl') return true;
    if (host === 'goo.gl') return pathname.startsWith('/maps');

    if (isGoogleHost(host, 'google.com') || isGoogleHost(host, 'google.com.ve')) {
      return host.startsWith('maps.') || pathname.startsWith('/maps');
    }

    return false;
  } catch {
    return false;
  }
}

function isGoogleHost(host: string, root: string): boolean {
  return host === root || host.endsWith(`.${root}`);
}
