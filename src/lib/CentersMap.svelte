<script lang="ts">
  import { onMount } from 'svelte';
  import 'leaflet/dist/leaflet.css';
  import { latLngFromMapsUrl } from './mapLinks';
  import type { Center } from './centers';
  import type { LatLngExpression, Map, Marker } from 'leaflet';

  export let centers: Center[] = [];
  export let onSelect: (center: Center) => void;

  const fallbackCenter = { lat: 8.589, lng: -66.5897 };

  let mapElement: HTMLDivElement;
  let leaflet: typeof import('leaflet') | null = null;
  let map: Map | null = null;
  let markers: Marker[] = [];
  let status = 'Preparando mapa...';

  $: if (map && leaflet && centers) {
    void renderMarkers();
  }

  onMount(() => {
    void initializeMap();

    return () => {
      clearMarkers();
      map?.remove();
      map = null;
    };
  });

  async function initializeMap() {
    leaflet = await import('leaflet');
    map = leaflet.map(mapElement, {
      center: [fallbackCenter.lat, fallbackCenter.lng],
      zoom: 6,
      scrollWheelZoom: false,
      attributionControl: true
    });

    leaflet.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    await renderMarkers();
  }

  async function renderMarkers() {
    if (!map || !leaflet) return;

    clearMarkers();
    const entries = await Promise.all(centers.map(async (center) => ({
      center,
      location: await getCenterLocation(center)
    })));
    const located = entries.filter(
      (entry): entry is { center: Center; location: { lat: number; lng: number } } => Boolean(entry.location)
    );

    for (const { center, location } of located) {
      const marker = leaflet
        .marker([location.lat, location.lng] as LatLngExpression, {
          title: center.nombre,
          icon: leaflet.divIcon({
            className: `recolecta-map-marker ${center.urgencia === 'alta' ? 'urgent' : ''}`,
            html: '<span></span>',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
          })
        })
        .addTo(map);

      marker.bindPopup(popupHtml(center));
      marker.on('click', () => onSelect(center));
      markers.push(marker);
    }

    if (located.length > 0) {
      const bounds = leaflet.latLngBounds(located.map((entry) => [entry.location.lat, entry.location.lng]));
      map.fitBounds(bounds, { padding: [28, 28], maxZoom: 14 });
      status = `${located.length} centro${located.length === 1 ? '' : 's'} con ubicacion en el mapa.`;
    } else {
      map.setView([fallbackCenter.lat, fallbackCenter.lng], 6);
      status = 'No hay centros con coordenadas disponibles para mostrar.';
    }
  }

  function clearMarkers() {
    for (const marker of markers) {
      marker.remove();
    }
    markers = [];
  }

  async function getCenterLocation(center: Center): Promise<{ lat: number; lng: number } | null> {
    if (typeof center.lat === 'number' && typeof center.lng === 'number') {
      return { lat: center.lat, lng: center.lng };
    }

    if (!center.mapsUrl) return null;

    const directLocation = latLngFromMapsUrl(center.mapsUrl);
    if (directLocation) return directLocation;

    return resolveShortenedLocation(center.mapsUrl);
  }

  async function resolveShortenedLocation(mapsUrl: string): Promise<{ lat: number; lng: number } | null> {
    try {
      const response = await fetch(`/api/resolve-map-url?url=${encodeURIComponent(mapsUrl)}`);
      if (!response.ok) return null;
      const data = (await response.json()) as { location?: { lat: number; lng: number } | null };
      return data.location || null;
    } catch (error) {
      console.error('Center map URL resolution failed', error);
      return null;
    }
  }

  function popupHtml(center: Center): string {
    const urgency = center.urgencia === 'alta' ? 'Urgencia alta' : center.urgencia === 'media' ? 'Urgencia media' : 'Normal';
    const mapsLink = center.mapsUrl
      ? `<a href="${escapeAttribute(center.mapsUrl)}" target="_blank" rel="noreferrer">Abrir en Google Maps</a>`
      : '';

    return `
      <div class="global-map-popup">
        <strong>${escapeHtml(center.nombre)}</strong>
        <span>${escapeHtml(center.estado)} · ${escapeHtml(center.direccion)}</span>
        <em>${urgency}</em>
        ${mapsLink}
      </div>
    `;
  }

  function escapeHtml(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function escapeAttribute(value: string): string {
    return escapeHtml(value);
  }
</script>

<section class="global-map-shell" aria-label="Mapa global de centros">
  <div class="global-map-heading">
    <div>
      <p class="section-label">Mapa de centros</p>
      <h2>Ubicaciones registradas</h2>
    </div>
    <span>{status}</span>
  </div>
  <div bind:this={mapElement} class="global-map"></div>
</section>
