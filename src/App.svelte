<script lang="ts">
  import { onMount } from 'svelte';
  import ClockReadout from './clock/ClockReadout.svelte';
  import { geocoder, type GeocoderResult } from './geocoding';
  import HelpModal from './help/HelpModal.svelte';
  import Onboarding from './location/Onboarding.svelte';
  import { distanceMeters, loadPlace, savePlace, type Place } from './location/place';
  import { locationGranted, startWatcher, type WatchFailure } from './location/watcher';
  import MapView from './map/MapView.svelte';
  import SearchBox from './map/SearchBox.svelte';
  import { saveSettings } from './settings/settings';
  import SettingsModal from './settings/SettingsModal.svelte';
  import { isDark, settings } from './settings/state.svelte';

  const NOTICES: Record<WatchFailure, string> = {
    denied: 'Location access is off for this site. Search for a place or long press the map to set one.',
    unsupported: 'This browser cannot share its location. Search for a place or long press the map to set one.',
    unavailable: 'Your device cannot find its location right now. It will keep trying.',
  };
  /** Meters the place may move before its name is looked up again. */
  const NAME_RADIUS = 500;
  /** Milliseconds to leave the geocoders alone after a lookup fails. */
  const NAME_RETRY_DELAY = 60_000;

  // The saved place puts the clock on screen at once on a repeat visit.
  let place = $state(loadPlace());
  // svelte-ignore state_referenced_locally
  let view = $state<'onboarding' | 'map'>(place ? 'map' : 'onboarding');
  /** True while the watcher is running, whether or not it has a position yet. */
  let following = $state(false);
  /** True once the watcher has delivered a position on this visit. */
  let live = $state(false);
  /** True while the map keeps the place centered. Dragging the map turns it off. */
  let tracking = $state(true);
  let notice = $state<string>();
  let settingsOpen = $state(false);
  let helpOpen = $state(false);

  let stopWatcher: (() => void) | undefined;
  /** The position the place's name was last looked up for. */
  let named: Place | undefined;
  let naming = false;
  /** When a failed lookup may be tried again, in milliseconds since the epoch. */
  let nameRetryAt = 0;

  const stopFollowing = (): void => {
    stopWatcher?.();
    stopWatcher = undefined;
    following = false;
    live = false;
  };

  const setPlace = (next: Place): void => {
    place = next;
    savePlace(next);
    view = 'map';
  };

  /**
   * Names the place from its position. One lookup runs at a time, and a
   * device that is moving asks again only after it has gone some distance,
   * which keeps the free geocoders to a request every few hundred meters.
   */
  const refreshName = async (target: Place): Promise<void> => {
    if (naming || Date.now() < nameRetryAt) return;
    if (named && distanceMeters(named, target) <= NAME_RADIUS) return;
    naming = true;
    let name: string | undefined;
    try {
      name = await geocoder.reverse(target.latitude, target.longitude);
    } catch {
      // Offline, or both services are down or throttling. The clock does not
      // need the name, and a device reporting every second must not keep asking.
      naming = false;
      nameRetryAt = Date.now() + NAME_RETRY_DELAY;
      return;
    }
    naming = false;
    if (!place) return;
    if (distanceMeters(place, target) > NAME_RADIUS) {
      // The place moved on while the lookup was out.
      void refreshName(place);
      return;
    }
    named = target;
    const { name: _stale, ...rest } = place;
    setPlace(name === undefined ? rest : { ...rest, name });
  };

  const follow = (): void => {
    tracking = true;
    if (following) return;
    notice = undefined;
    following = true;
    stopWatcher = startWatcher(
      (fix) => {
        live = true;
        notice = undefined;
        // The old name stands in while the device stays near where it was named.
        const name = place?.source === 'device' ? place.name : undefined;
        if (place?.source !== 'device') named = undefined;
        const next = name === undefined ? fix : { ...fix, name };
        setPlace(next);
        void refreshName(next);
      },
      (failure) => {
        notice = NOTICES[failure];
        if (failure === 'unavailable') return;
        // Without permission, search and the map are the only ways to set the clock.
        stopFollowing();
        view = 'map';
      },
    );
  };

  const showMap = (): void => {
    notice = undefined;
    view = 'map';
  };

  const pickPosition = (latitude: number, longitude: number): void => {
    stopFollowing();
    notice = undefined;
    // The user is already looking at the spot, so the map stays where it is.
    tracking = false;
    named = undefined;
    nameRetryAt = 0;
    const next: Place = { latitude, longitude, source: 'picked' };
    setPlace(next);
    void refreshName(next);
  };

  const pickResult = ({ name, detail, latitude, longitude }: GeocoderResult): void => {
    stopFollowing();
    notice = undefined;
    tracking = true;
    const next: Place = { latitude, longitude, name: detail ? `${name}, ${detail}` : name, source: 'picked' };
    named = next;
    setPlace(next);
  };

  const status = $derived.by(() => {
    if (live) return 'Following your location';
    if (following) return place ? 'Showing your last place while locating…' : 'Locating…';
    return place?.source === 'picked' ? 'Showing the place you set' : 'Showing your last place';
  });

  $effect(() => {
    saveSettings(settings);
  });

  $effect(() => {
    // No attribute leaves light or dark to the device.
    if (settings.theme === 'system') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = settings.theme;
  });

  onMount(() => {
    // Resume following without a tap only when it cannot raise a permission
    // prompt, and only when the user was following on the last visit.
    if (place?.source === 'device') {
      void locationGranted().then((granted) => {
        if (granted && view === 'map' && !following) follow();
      });
    }
    return stopFollowing;
  });
</script>

{#if view === 'onboarding'}
  <main class="app app--onboarding">
    <h1 class="app__title">Hyper Local Clock</h1>
    {#if notice}
      <p class="app__notice" role="status">{notice}</p>
    {/if}
    <Onboarding locating={following} onlocate={follow} onpick={showMap} />
  </main>
{:else}
  <main class="app app--map">
    <div class="app__map">
      <MapView {place} bind:tracking dark={isDark()} onlongpress={pickPosition} />
      <div class="app__search">
        <SearchBox onpick={pickResult} />
      </div>
      <button
        class="app__button app__button--locate"
        type="button"
        aria-label="Go to my location"
        title="Go to my location"
        aria-pressed={following && tracking}
        onclick={follow}
      >
        <svg class="app__icon" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="7" />
          <circle class="app__locate-dot" cx="12" cy="12" r="3" />
          <path d="M12 1v4M12 19v4M1 12h4M19 12h4" />
        </svg>
      </button>
    </div>

    <div class="app__panel">
      <header class="app__header">
        <h1 class="app__title">Hyper Local Clock</h1>
        <div class="app__actions">
          <button
            class="app__button"
            type="button"
            aria-label="Help"
            title="Help"
            onclick={() => {
              helpOpen = true;
            }}
          >
            <svg class="app__icon" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.25 9.25a2.75 2.75 0 1 1 4.1 2.4c-.85.5-1.35 1.1-1.35 2.1" />
              <path d="M12 17.25v.01" />
            </svg>
          </button>
          <button
            class="app__button"
            type="button"
            aria-label="Settings"
            title="Settings"
            onclick={() => {
              settingsOpen = true;
            }}
          >
            <svg class="app__icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M3 7h9M18 7h3M3 17h3M12 17h9" />
              <circle cx="15" cy="7" r="3" />
              <circle cx="9" cy="17" r="3" />
            </svg>
          </button>
        </div>
      </header>
      {#if notice}
        <p class="app__notice" role="status">{notice}</p>
      {/if}
      {#if place}
        <ClockReadout longitude={place.longitude} accuracy={place.accuracy} />
        <p class="app__status">
          {#if place.name}
            <span class="app__place">{place.name}</span>
          {/if}
          <span>{status}</span>
        </p>
      {:else}
        <p class="app__hint">
          {following ? 'Locating…' : 'Search for a place or long press the map to start the clock.'}
        </p>
      {/if}
    </div>
  </main>
  <SettingsModal bind:open={settingsOpen} />
  <HelpModal bind:open={helpOpen} />
{/if}

<style>
  .app {
    box-sizing: border-box;
    height: 100dvh;
  }

  .app--onboarding {
    display: grid;
    place-content: center;
    justify-items: center;
    gap: 1rem;
    height: auto;
    min-height: 100dvh;
    padding: 1rem;
  }

  /* The map takes whatever the clock does not need: above it on a phone, beside it on a wide screen. */
  .app--map {
    display: grid;
    grid-template-rows: minmax(0, 1fr) auto;
  }

  .app__map {
    position: relative;
    min-height: 0;
  }

  .app__search {
    position: absolute;
    inset: 0.75rem 0.75rem auto;
    max-width: 24rem;
  }

  .app__button {
    display: grid;
    flex: none;
    place-content: center;
    width: 2.75rem;
    height: 2.75rem;
    padding: 0;
    border: 1px solid var(--border-control);
    border-radius: 50%;
    background: Canvas;
    color: CanvasText;
    cursor: pointer;
  }

  .app__button:hover {
    background: color-mix(in srgb, CanvasText 12%, Canvas);
  }

  .app__button:focus-visible {
    outline: var(--focus-ring);
    outline-offset: 2px;
  }

  .app__button--locate {
    position: absolute;
    /* Clear of the map's attribution button in the corner below. */
    inset: auto 0.75rem 3rem auto;
    box-shadow: 0 1px 4px rgb(0 0 0 / 20%);
  }

  .app__icon {
    width: 1.5rem;
    height: 1.5rem;
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
  }

  /* The dot fills in while the map is following the device. */
  .app__locate-dot {
    stroke: none;
  }

  .app__button[aria-pressed='true'] .app__locate-dot {
    fill: currentColor;
  }

  .app__panel {
    display: grid;
    justify-items: center;
    /* One column no wider than the panel, so nothing in it can spill off screen. */
    grid-template-columns: minmax(0, 1fr);
    gap: 0.5rem;
    box-sizing: border-box;
    /* Under large text the panel scrolls before it squeezes the map out. */
    max-height: 60dvh;
    padding: 0.75rem 1rem;
    /* Keeps the clock above the home indicator on a phone. */
    padding-bottom: max(0.75rem, env(safe-area-inset-bottom));
    overflow-y: auto;
  }

  .app__header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    box-sizing: border-box;
    width: min(100%, 20rem);
  }

  .app__actions {
    display: flex;
    gap: 0.5rem;
  }

  .app__title {
    margin: 0;
    font-size: 1.25rem;
  }

  .app--map .app__title {
    font-size: 1rem;
  }

  .app__notice {
    box-sizing: border-box;
    width: min(100%, 24rem);
    margin: 0;
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--border-control);
    border-radius: 0.5rem;
    font-size: 0.875rem;
  }

  .app__status,
  .app__hint {
    display: grid;
    justify-items: center;
    margin: 0;
    font-size: 0.875rem;
    text-align: center;
  }

  .app__status > :not(.app__place) {
    color: var(--text-muted);
  }

  .app__hint {
    max-width: 20rem;
    padding-block: 1rem;
  }

  /*
    Beside the map on a tablet or desktop, and on a phone held sideways, where
    a panel along the bottom would leave the map a sliver.
  */
  @media (min-width: 48rem), (orientation: landscape) and (max-height: 30rem) {
    .app--map {
      grid-template-rows: minmax(0, 1fr);
      grid-template-columns: minmax(0, 1fr) minmax(17rem, 38%);
    }

    .app__panel {
      align-content: safe center;
      max-height: none;
    }
  }

  @media (min-width: 48rem) {
    .app--map {
      grid-template-columns: minmax(0, 1fr) 22rem;
    }
  }

  @media (min-width: 75rem) {
    .app--map {
      grid-template-columns: minmax(0, 1fr) 26rem;
    }
  }
</style>
