<script lang="ts">
  import Modal from '../ui/Modal.svelte';

  interface Props {
    open: boolean;
  }

  let { open = $bindable() }: Props = $props();
</script>

<Modal title="Help" bind:open>
  <div class="help">
    <section class="help__section">
      <h3 class="help__heading">The three times</h3>
      <dl class="help__terms">
        <div>
          <dt class="help__term">Mean time</dt>
          <dd class="help__definition">
            Local mean time: UTC plus 4 minutes for every degree of longitude east. It is the time your spot on the
            map would keep if there were no time zones.
          </dd>
        </div>
        <div>
          <dt class="help__term">Solar time</dt>
          <dd class="help__definition">
            Apparent solar time: mean time plus the equation of time, which swings about 16 minutes either way over
            the year. At solar noon the sun is at its highest.
          </dd>
        </div>
        <div>
          <dt class="help__term">Zone time</dt>
          <dd class="help__definition">The time this device shows, with the name of its time zone.</dd>
        </div>
      </dl>
    </section>

    <section class="help__section">
      <h3 class="help__heading">Setting the place</h3>
      <ul class="help__list">
        <li>The locate button on the map follows this device's location while the page is open.</li>
        <li>Long press the map, or click and hold with a mouse, to set the clock to that spot.</li>
        <li>Search for a place by name and pick a result.</li>
      </ul>
      <p class="help__text">
        Only longitude changes the time: 0.004° east or west is one second. The accuracy shown is the one the
        browser reports for its fix.
      </p>
    </section>

    <section class="help__section">
      <h3 class="help__heading">Privacy</h3>
      <p class="help__text">
        The time is worked out on this device, and the last place and your settings are saved only in this browser.
        There are no accounts and no analytics.
      </p>
      <p class="help__text">
        Three things use the network: the map loads its tiles from OpenFreeMap, search sends what you type to
        Photon, and naming a place sends its position to Photon, or to Nominatim when Photon cannot answer.
      </p>
    </section>

    <section class="help__section">
      <h3 class="help__heading">Credits</h3>
      <ul class="help__list">
        <li>
          Map data ©
          <a class="help__link" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener"
            >OpenStreetMap contributors</a
          >
        </li>
        <li>
          Map tiles and style by
          <a class="help__link" href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a>
          ©
          <a class="help__link" href="https://www.openmaptiles.org" target="_blank" rel="noopener">OpenMapTiles</a>
        </li>
        <li>
          Map drawn with
          <a class="help__link" href="https://maplibre.org" target="_blank" rel="noopener">MapLibre GL JS</a>
        </li>
        <li>
          Place search and place names by
          <a class="help__link" href="https://photon.komoot.io" target="_blank" rel="noopener">Photon</a>
          from komoot, with
          <a class="help__link" href="https://nominatim.org" target="_blank" rel="noopener">Nominatim</a>
          as a fallback for place names; both use OpenStreetMap data
        </li>
      </ul>
    </section>
  </div>
</Modal>

<style>
  .help {
    display: grid;
    gap: 1.25rem;
    font-size: 0.9375rem;
  }

  .help__section {
    display: grid;
    gap: 0.5rem;
  }

  .help__heading {
    margin: 0;
    font-size: 1rem;
  }

  .help__terms {
    display: grid;
    gap: 0.5rem;
    margin: 0;
  }

  .help__term {
    font-weight: 600;
  }

  .help__definition {
    margin: 0;
  }

  .help__list {
    display: grid;
    gap: 0.25rem;
    margin: 0;
    padding-left: 1.25rem;
  }

  .help__text {
    margin: 0;
  }

  .help__link {
    color: inherit;
  }

  .help__link:focus-visible {
    outline: var(--focus-ring);
    outline-offset: 2px;
    border-radius: 0.125rem;
  }
</style>
