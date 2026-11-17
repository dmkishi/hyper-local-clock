<script lang="ts">
  import { onMount } from 'svelte';
  import ClockReadout from './clock/ClockReadout.svelte';
  import Onboarding from './location/Onboarding.svelte';
  import PlacePicker from './location/PlacePicker.svelte';
  import { loadPlace, savePlace, type Place } from './location/place';
  import { locationGranted, startWatcher, type WatchFailure } from './location/watcher';

  const NOTICES: Record<WatchFailure, string> = {
    denied: 'Location access is off for this site. Set a place here, or allow location in your browser settings.',
    unsupported: 'This browser cannot share its location. Set a place here instead.',
    unavailable: 'Your device cannot find its location right now. It will keep trying.',
  };

  // The saved place puts the clock on screen at once on a repeat visit.
  let place = $state(loadPlace());
  // svelte-ignore state_referenced_locally
  let view = $state<'onboarding' | 'picker' | 'clock'>(place ? 'clock' : 'onboarding');
  /** True while the watcher is running, whether or not it has a position yet. */
  let following = $state(false);
  /** True once the watcher has delivered a position on this visit. */
  let live = $state(false);
  let notice = $state<string>();

  let stopWatcher: (() => void) | undefined;

  const stopFollowing = (): void => {
    stopWatcher?.();
    stopWatcher = undefined;
    following = false;
    live = false;
  };

  const setPlace = (next: Place): void => {
    place = next;
    savePlace(next);
    notice = undefined;
    view = 'clock';
  };

  const follow = (): void => {
    stopFollowing();
    notice = undefined;
    following = true;
    stopWatcher = startWatcher(
      (next) => {
        live = true;
        setPlace(next);
      },
      (failure) => {
        notice = NOTICES[failure];
        if (failure === 'unavailable') return;
        // Without permission the place picker is the only way to set the clock.
        stopFollowing();
        view = 'picker';
      },
    );
  };

  const openPicker = (): void => {
    // A position arriving mid-edit would pull the user back to the clock.
    stopFollowing();
    notice = undefined;
    view = 'picker';
  };

  const pick = (next: Place): void => {
    stopFollowing();
    setPlace(next);
  };

  const closePicker = (): void => {
    notice = undefined;
    view = 'clock';
  };

  const status = $derived.by(() => {
    if (live) return 'Following your location';
    if (following) return 'Showing your last place while locating…';
    return place?.source === 'picked' ? 'Showing the place you set' : 'Showing your last place';
  });

  onMount(() => {
    // Resume following without a tap only when it cannot raise a permission
    // prompt, and only when the user was following on the last visit.
    if (place?.source === 'device') {
      void locationGranted().then((granted) => {
        if (granted && view === 'clock' && !following) follow();
      });
    }
    return stopFollowing;
  });
</script>

<main class="app">
  <h1 class="app__title">Hyper Local Clock</h1>

  {#if notice}
    <p class="app__notice" role="status">{notice}</p>
  {/if}

  {#if view === 'clock' && place}
    <ClockReadout longitude={place.longitude} accuracy={place.accuracy} />
    <p class="app__status">{status}</p>
    <div class="app__actions">
      {#if !following}
        <button class="app__button" type="button" onclick={follow}>Use my location</button>
      {/if}
      <button class="app__button" type="button" onclick={openPicker}>Set a place</button>
    </div>
  {:else if view === 'picker'}
    <PlacePicker initial={place} onpick={pick} oncancel={place ? closePicker : undefined} />
  {:else}
    <Onboarding locating={following} onlocate={follow} onpick={openPicker} />
  {/if}
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

  .app__notice {
    box-sizing: border-box;
    width: min(100%, 24rem);
    margin: 0;
    padding: 0.5rem 0.75rem;
    border: 1px solid color-mix(in srgb, CanvasText 40%, transparent);
    border-radius: 0.5rem;
    font-size: 0.875rem;
  }

  .app__status {
    margin: 0;
    font-size: 0.875rem;
    opacity: 0.75;
  }

  .app__actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.5rem;
  }

  .app__button {
    padding: 0.375rem 0.75rem;
    border: 1px solid color-mix(in srgb, CanvasText 20%, transparent);
    border-radius: 0.5rem;
    background: Canvas;
    color: CanvasText;
    font: inherit;
    font-size: 0.875rem;
    cursor: pointer;
  }

  .app__button:focus-visible {
    outline: 2px solid Highlight;
    outline-offset: 2px;
  }
</style>
