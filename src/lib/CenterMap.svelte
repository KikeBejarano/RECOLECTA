<script lang="ts">
  import { onMount } from 'svelte';
  import 'leaflet/dist/leaflet.css';
  import { latLngFromMapsUrl } from './mapLinks';
  import type { LatLngExpression, Map, Marker } from 'leaflet';

  export let mapsUrl: string | null = null;
  export let title = 'Ubicacion del centro';

  let mapElement: HTMLDivElement;
  let leaflet: typeof import('leaflet') | null = null;
  let map: Map | null = null;
  let marker: Marker | null = null;
  let location = mapsUrl ? latLngFromMapsUrl(mapsUrl) : null;
  let resolvedUrl = mapsUrl;
  let status = location ? '' : 'Resolviendo ubicacion...';

  onMount(() => {
    void initializeMap();

    return () => {
      map?.remove();
      map = null;
      marker = null;
    };
  });

  async function initializeMap() {
    if (!location) {
      location = await resolveLocation();
    }

    if (!location) {
      status = 'No se pudieron extraer coordenadas de este enlace.';
      return;
    }

    status = '';

    leaflet = await import('leaflet');

    map = leaflet.map(mapElement, {
      center: [location.lat, location.lng],
      zoom: 15,
      dragging: true,
      scrollWheelZoom: false,
      doubleClickZoom: true,
      boxZoom: false,
      keyboard: false,
      attributionControl: true
    });

    leaflet.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    marker = leaflet
      .marker([location.lat, location.lng] as LatLngExpression, {
        title,
        icon: leaflet.divIcon({
          className: 'recolecta-map-marker',
          html: '<span></span>',
          iconSize: [30, 30],
          iconAnchor: [15, 15]
        })
      })
      .addTo(map);
  }

  async function resolveLocation(): Promise<{ lat: number; lng: number } | null> {
    if (!mapsUrl) return null;

    try {
      const response = await fetch(`/api/resolve-map-url?url=${encodeURIComponent(mapsUrl)}`);
      if (!response.ok) return null;

      const data = (await response.json()) as {
        location?: { lat: number; lng: number } | null;
        resolvedUrl?: string | null;
      };

      resolvedUrl = data.resolvedUrl || mapsUrl;
      return data.location || null;
    } catch (error) {
      console.error('Map URL resolution failed', error);
      return null;
    }
  }
</script>

<div class="center-map-card">
  {#if location}
    <div bind:this={mapElement} class="center-map" aria-label={`Mapa de ${title}`}></div>
    <div class="center-map-meta">
      <span>{location.lat.toFixed(5)}, {location.lng.toFixed(5)}</span>
      {#if resolvedUrl}
        <a href={resolvedUrl} target="_blank" rel="noreferrer">Abrir en Google Maps</a>
      {/if}
    </div>
  {:else}
    <div class="center-map-empty">
      <span>{status}</span>
      {#if mapsUrl}
        <a href={mapsUrl} target="_blank" rel="noreferrer">Abrir enlace en Google Maps</a>
      {/if}
    </div>
  {/if}
</div>
