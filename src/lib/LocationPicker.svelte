<script lang="ts">
  import { onMount } from 'svelte';
  import 'leaflet/dist/leaflet.css';
  import { latLngFromMapsUrl, mapsUrlFromLatLng } from './mapLinks';
  import type { LatLngExpression, LeafletMouseEvent, Map, Marker } from 'leaflet';

  export let mapsUrl = '';
  export let onSelect: (mapsUrl: string) => void;

  const fallbackLocation = { lat: 8.589, lng: -66.5897 };

  let mapElement: HTMLDivElement;
  let leaflet: typeof import('leaflet') | null = null;
  let map: Map | null = null;
  let marker: Marker | null = null;
  let selected = latLngFromMapsUrl(mapsUrl) || fallbackLocation;
  let status = 'Ubicando tu posicion actual...';
  let locating = false;

  onMount(() => {
    void initializeFromBrowser();

    return () => {
      map?.remove();
      map = null;
      marker = null;
    };
  });

  async function initializeFromBrowser() {
    try {
      leaflet = await import('leaflet');
      const locationFromUrl = latLngFromMapsUrl(mapsUrl);
      const start = locationFromUrl || fallbackLocation;
      initializeMap(start);
      selectLocation(start, false);
      status = locationFromUrl
        ? 'Ubicacion cargada desde el enlace existente.'
        : 'Toca "Usar mi ubicacion" para completar el enlace automaticamente.';

      if (!locationFromUrl) {
        void requestCurrentLocation({ silent: true });
      }
    } catch (error) {
      console.error('Leaflet map error', error);
      status = 'No se pudo cargar el mapa. Puedes pegar el enlace de Google Maps manualmente.';
    }
  }

  $: if (map && mapsUrl) {
    const parsed = latLngFromMapsUrl(mapsUrl);
    if (parsed && (Math.abs(parsed.lat - selected.lat) > 0.000001 || Math.abs(parsed.lng - selected.lng) > 0.000001)) {
      selectLocation(parsed, false);
      map.panTo(parsed);
    }
  }

  function initializeMap(center: { lat: number; lng: number }) {
    if (!leaflet) return;

    map = leaflet.map(mapElement, {
      center: [center.lat, center.lng],
      zoom: 15,
      zoomControl: true,
      attributionControl: true
    });

    leaflet.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    marker = leaflet.marker([center.lat, center.lng], {
      draggable: true,
      title: 'Ubicacion del centro',
      icon: leaflet.divIcon({
        className: 'recolecta-map-marker',
        html: '<span></span>',
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      })
    }).addTo(map);

    map.on('click', (event: LeafletMouseEvent) => {
      selectLocation({ lat: event.latlng.lat, lng: event.latlng.lng }, true);
    });

    marker.on('dragend', () => {
      const position = marker?.getLatLng();
      if (position) selectLocation({ lat: position.lat, lng: position.lng }, true);
    });
  }

  function selectLocation(location: { lat: number; lng: number }, emit: boolean) {
    selected = location;
    marker?.setLatLng([location.lat, location.lng] as LatLngExpression);
    if (emit) onSelect(mapsUrlFromLatLng(location.lat, location.lng));
  }

  async function requestCurrentLocation(options: { silent?: boolean } = {}) {
    locating = true;
    status = 'Solicitando permiso de ubicacion...';

    try {
      const location = await getCurrentLocation();
      selectLocation(location, true);
      map?.setView([location.lat, location.lng], 16);
      status = 'Ubicacion actual cargada. Ajusta el marcador si hace falta.';
    } catch (error) {
      console.error('Geolocation error', error);
      status = options.silent
        ? 'Toca "Usar mi ubicacion" para permitir el acceso en tu telefono.'
        : 'No se pudo obtener tu ubicacion. Revisa permisos del navegador o pega el enlace manualmente.';
    } finally {
      locating = false;
    }
  }

  function getCurrentLocation(): Promise<{ lat: number; lng: number }> {
    return new Promise((resolve, reject) => {
      if (!window.isSecureContext) {
        reject(new Error('La geolocalizacion requiere HTTPS'));
        return;
      }

      if (!navigator.geolocation) {
        reject(new Error('Geolocalizacion no disponible'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) =>
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          }),
        reject,
        {
          enableHighAccuracy: true,
          timeout: 7000,
          maximumAge: 60000
        }
      );
    });
  }
</script>

<div class="location-picker">
  <div bind:this={mapElement} class="map-canvas" aria-label="Selector de ubicacion del centro"></div>
  <div class="map-footer">
    <span>{status}</span>
    <button class="location-button" type="button" disabled={locating} on:click={() => requestCurrentLocation()}>
      {locating ? 'Ubicando...' : 'Usar mi ubicacion'}
    </button>
    <span>{selected.lat.toFixed(5)}, {selected.lng.toFixed(5)}</span>
  </div>
</div>
