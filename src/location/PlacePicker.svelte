<!--
  Sets a place by its coordinates. This is the whole place picker until the
  map and search milestone, which replaces the two fields with a map and a
  search box behind the same `onpick` callback.
-->
<script lang="ts">
  import type { Place } from './place';

  interface Props {
    /** The current place, used to fill the fields. */
    initial?: Place;
    onpick: (place: Place) => void;
    /** Shows a Cancel button when there is somewhere to go back to. */
    oncancel?: () => void;
  }

  const { initial, onpick, oncancel }: Props = $props();

  // The fields start from the place at the moment the picker opens and are the user's from then on.
  // svelte-ignore state_referenced_locally
  let latitude = $state(initial?.latitude);
  // svelte-ignore state_referenced_locally
  let longitude = $state(initial?.longitude);

  const onsubmit = (event: SubmitEvent): void => {
    event.preventDefault();
    // The browser has already enforced `required`, `min`, and `max`; an emptied number field is not a number.
    if (typeof latitude !== 'number' || typeof longitude !== 'number') return;
    onpick({ latitude, longitude, source: 'picked' });
  };
</script>

<form class="picker" aria-labelledby="picker-title" {onsubmit}>
  <h2 class="picker__title" id="picker-title">Set a place</h2>
  <p class="picker__text">Enter coordinates in decimal degrees. Only the longitude moves the clock.</p>
  <label class="picker__field">
    <span class="picker__label">Longitude (east positive, west negative)</span>
    <input
      class="picker__input"
      type="number"
      inputmode="text"
      min="-180"
      max="180"
      step="any"
      required
      placeholder="-122.2426"
      bind:value={longitude}
    />
  </label>
  <label class="picker__field">
    <span class="picker__label">Latitude (north positive, south negative)</span>
    <input
      class="picker__input"
      type="number"
      inputmode="text"
      min="-90"
      max="90"
      step="any"
      required
      placeholder="37.8095"
      bind:value={latitude}
    />
  </label>
  <div class="picker__actions">
    <button class="picker__button picker__button--primary" type="submit">Set place</button>
    {#if oncancel}
      <button class="picker__button" type="button" onclick={oncancel}>Cancel</button>
    {/if}
  </div>
</form>

<style>
  .picker {
    display: grid;
    gap: 0.75rem;
    box-sizing: border-box;
    width: min(100%, 24rem);
  }

  .picker__title {
    margin: 0;
    font-size: 1.5rem;
    line-height: 1.2;
  }

  .picker__text {
    margin: 0;
  }

  .picker__field {
    display: grid;
    gap: 0.25rem;
  }

  .picker__label {
    font-size: 0.875rem;
  }

  .picker__input {
    padding: 0.5rem 0.625rem;
    border: 1px solid color-mix(in srgb, CanvasText 40%, transparent);
    border-radius: 0.5rem;
    background: Canvas;
    color: CanvasText;
    font: inherit;
    font-variant-numeric: tabular-nums;
  }

  .picker__actions {
    display: grid;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }

  .picker__button {
    padding: 0.625rem 1rem;
    border: 1px solid color-mix(in srgb, CanvasText 20%, transparent);
    border-radius: 0.5rem;
    background: Canvas;
    color: CanvasText;
    font: inherit;
    cursor: pointer;
  }

  .picker__button--primary {
    border-color: CanvasText;
    background: CanvasText;
    color: Canvas;
    font-weight: 600;
  }

  .picker__input:focus-visible,
  .picker__button:focus-visible {
    outline: 2px solid Highlight;
    outline-offset: 2px;
  }
</style>
