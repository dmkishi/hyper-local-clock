<!--
  Place search as a combobox: type, then pick a result with the pointer or with
  the arrow keys and Enter.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { createSearch, geocoder, type GeocoderResult, type SearchState } from '../geocoding';

  interface Props {
    onpick: (result: GeocoderResult) => void;
  }

  const { onpick }: Props = $props();

  let query = $state('');
  let search = $state.raw<SearchState>({ status: 'idle' });
  /** Index of the result the arrow keys are on, or -1 for none. */
  let active = $state(-1);
  /** False once the list is dismissed, until the text changes again. */
  let open = $state(false);

  const results = $derived(search.status === 'done' ? search.results : []);
  const message = $derived.by((): string | undefined => {
    if (search.status === 'loading') return 'Searching…';
    if (search.status === 'failed') return 'Search is not available right now. Long press the map instead.';
    if (search.status === 'done' && results.length === 0) return 'No places found.';
    return undefined;
  });
  const listed = $derived(open && results.length > 0);

  const searcher = createSearch(geocoder, (state) => {
    search = state;
    active = -1;
  });

  onMount(() => searcher.cancel);

  const oninput = (): void => {
    open = true;
    searcher.input(query);
  };

  const choose = (result: GeocoderResult): void => {
    open = false;
    query = result.name;
    onpick(result);
  };

  const onkeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      open = false;
      return;
    }
    if (!listed) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      active = (active + step + results.length) % results.length;
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const result = results[Math.max(active, 0)];
      if (result) choose(result);
    }
  };
</script>

<div class="search">
  <label class="search__label" for="search-input">Search for a place</label>
  <input
    class="search__input"
    id="search-input"
    type="search"
    role="combobox"
    autocomplete="off"
    spellcheck="false"
    enterkeyhint="search"
    placeholder="Search for a place"
    aria-autocomplete="list"
    aria-controls="search-results"
    aria-expanded={listed}
    aria-activedescendant={listed && active >= 0 ? `search-result-${active}` : undefined}
    bind:value={query}
    {oninput}
    {onkeydown}
    onfocus={() => {
      open = true;
    }}
    onblur={() => {
      open = false;
    }}
  />
  <ul class="search__results" id="search-results" role="listbox" aria-label="Places" hidden={!listed}>
    {#each results as result, index (index)}
      <!--
        The input keeps the focus and drives the list with the arrow keys, so
        an option needs no key handler of its own. Pressing one must not blur
        the input, which would close the list before the click lands.
      -->
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <li
        class={['search__result', index === active && 'search__result--active']}
        id="search-result-{index}"
        role="option"
        tabindex="-1"
        aria-selected={index === active}
        onpointerdown={(event) => {
          event.preventDefault();
        }}
        onclick={() => {
          choose(result);
        }}
      >
        <span class="search__name">{result.name}</span>
        {#if result.detail}
          <span class="search__detail">{result.detail}</span>
        {/if}
      </li>
    {/each}
  </ul>
  {#if open && message}
    <p class="search__message" role="status">{message}</p>
  {/if}
</div>

<style>
  .search {
    display: grid;
    gap: 0.25rem;
  }

  .search__label {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  .search__input,
  .search__results,
  .search__message {
    box-sizing: border-box;
    width: 100%;
    margin: 0;
    border: 1px solid color-mix(in srgb, CanvasText 20%, transparent);
    border-radius: 0.5rem;
    background: Canvas;
    color: CanvasText;
    box-shadow: 0 1px 4px rgb(0 0 0 / 20%);
  }

  .search__input {
    padding: 0.625rem 0.75rem;
    /* Below 16px, iOS Safari zooms the page when the field takes focus. */
    font: inherit;
    font-size: 1rem;
  }

  .search__input:focus-visible {
    outline: 2px solid Highlight;
    outline-offset: 2px;
  }

  .search__results {
    padding: 0.25rem;
    list-style: none;
  }

  .search__result {
    display: grid;
    padding: 0.375rem 0.5rem;
    border-radius: 0.375rem;
    cursor: pointer;
  }

  .search__result:hover,
  .search__result--active {
    background: color-mix(in srgb, CanvasText 12%, transparent);
  }

  .search__detail {
    font-size: 0.8125rem;
    opacity: 0.75;
  }

  .search__message {
    padding: 0.5rem 0.75rem;
    font-size: 0.875rem;
  }
</style>
