<script lang="ts">
  import ClockReadout from './clock/ClockReadout.svelte';

  // Oakland (37.80947276273161, -122.24258054667955), hard-coded until the
  // location milestone supplies a live position. Only the longitude is used.
  const LONGITUDE = -122.24258054667955;
</script>

<main class="app">
  <h1 class="app__title">Hyper Local Clock</h1>
  <ClockReadout longitude={LONGITUDE} />
</main>

<style>
  .app {
    display: grid;
    place-content: center;
    justify-items: center;
    gap: 1rem;
    min-height: 100dvh;
    padding: 1rem;
  }

  .app__title {
    margin: 0;
    font-size: 1.25rem;
  }
</style>
