<!--
  The map: a marker on the clock's place, and a long press to move it.

  MapLibre is large, so it loads after the page is up and the clock never
  waits for it. If it cannot load or the browser has no WebGL, the clock and
  the search box carry on without it.
-->
<script lang="ts">
  import 'maplibre-gl/dist/maplibre-gl.css';
  import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
  import type { Map as MapLibreMap, Marker } from 'maplibre-gl';
  import { onMount } from 'svelte';
  import { distanceMeters, type Place } from '../location/place';
  import { watchLongPress } from './long-press';

  interface Props {
    /** Where the clock is set, marked on the map. */
    place?: Place;
    /**
     * Whether the map keeps the place centered as it changes. Dragging the
     * map turns this off; the owner turns it back on.
     */
    tracking: boolean;
    /** A press held still on the map, in degrees. */
    onlongpress: (latitude: number, longitude: number) => void;
  }

  let { place, tracking = $bindable(), onlongpress }: Props = $props();

  const STYLE = 'https://tiles.openfreemap.org/styles/liberty';
  /** Close enough to read street names around the place. */
  const PLACE_ZOOM = 13;
  const WORLD_ZOOM = 1;
  /** Beyond this many meters the camera flies in an arc instead of sliding, so it does not drag across unloaded tiles. */
  const FLIGHT_DISTANCE = 20_000;

  let container: HTMLDivElement;
  let map = $state.raw<MapLibreMap>();
  let marker = $state.raw<Marker>();
  let failed = $state(false);

  onMount(() => {
    let stopLongPress: (() => void) | undefined;
    let removed = false;

    // A long press must not raise the browser's own menu over the map.
    container.addEventListener('contextmenu', (event) => {
      event.preventDefault();
    });

    const load = async (): Promise<void> => {
      const maplibre = await import('maplibre-gl');
      if (removed) return;
      // The bundled library cannot find its worker beside itself, so it is told where the build put it.
      maplibre.setWorkerUrl(workerUrl);

      const created = new maplibre.Map({
        container,
        style: STYLE,
        center: place ? [place.longitude, place.latitude] : [0, 20],
        zoom: place ? PLACE_ZOOM : WORLD_ZOOM,
        // The map stays north-up and flat: one less thing to get lost in.
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
        // The small "i" keeps the OpenStreetMap and OpenFreeMap credit on the map itself.
        attributionControl: { compact: true },
      });
      created.touchZoomRotate.disableRotation();
      created.keyboard.disableRotation();
      created.on('dragstart', () => {
        tracking = false;
      });
      stopLongPress = watchLongPress(created, ({ lat, lng }) => {
        // MapLibre keeps counting past the date line when the world repeats.
        onlongpress(lat, ((((lng + 180) % 360) + 360) % 360) - 180);
      });

      marker = new maplibre.Marker();
      map = created;
    };

    load().catch(() => {
      failed = true;
    });

    return () => {
      removed = true;
      stopLongPress?.();
      map?.remove();
    };
  });

  $effect(() => {
    if (!map || !marker) return;
    if (!place) {
      marker.remove();
      return;
    }
    const center: [number, number] = [place.longitude, place.latitude];
    marker.setLngLat(center).addTo(map);
    if (!tracking) return;

    const { lat, lng } = map.getCenter();
    const camera = { center, zoom: Math.max(map.getZoom(), PLACE_ZOOM) };
    if (distanceMeters({ latitude: lat, longitude: lng }, place) > FLIGHT_DISTANCE) map.flyTo(camera);
    else map.easeTo(camera);
  });
</script>

<div class="map">
  <div class="map__canvas" bind:this={container}></div>
  {#if failed}
    <p class="map__notice" role="status">The map could not load. The clock still runs, and search still sets a place.</p>
  {/if}
</div>

<style>
  .map {
    position: relative;
    width: 100%;
    height: 100%;
    background: color-mix(in srgb, CanvasText 8%, Canvas);
  }

  .map__canvas {
    position: absolute;
    inset: 0;
    /* A held finger should set the place, not select the map or open the callout on iOS. */
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    user-select: none;
  }

  .map__notice {
    position: absolute;
    inset: 50% 1rem auto;
    margin: 0;
    text-align: center;
    translate: 0 -50%;
  }
</style>
