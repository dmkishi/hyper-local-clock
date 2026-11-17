<script lang="ts">
  import { onMount } from 'svelte';
  import { apparentSolarTime, equationOfTime, lmt, zoneTime } from '../time-engine';
  import { formatEquationOfTime, formatLongitude, formatWallTime, wallTimeAttribute } from './format';
  import { loadMode, saveMode, type ClockMode } from './mode';
  import { startTicker } from './ticker';

  interface Props {
    /** Degrees, east positive, within [-180, 180]. */
    longitude: number;
  }

  const { longitude }: Props = $props();

  const MODES: { value: ClockMode; label: string }[] = [
    { value: 'mean', label: 'Mean' },
    { value: 'solar', label: 'Solar' },
  ];

  let now = $state(new Date());
  let mode = $state(loadMode());

  const main = $derived(mode === 'solar' ? apparentSolarTime(now, longitude) : lmt(now, longitude));
  const mainLabel = $derived(mode === 'solar' ? 'Solar time' : 'Mean time');
  const zone = $derived(zoneTime(now));

  // The main readout rarely shares the device clock's second boundary, so the
  // ticker is told how far apart they are and lands on both.
  onMount(() =>
    startTicker(
      (date) => {
        now = date;
      },
      () => main.getTime() - now.getTime(),
    ),
  );

  $effect(() => {
    saveMode(mode);
  });
</script>

<section class="readout" aria-label="Clock">
  <!--
    The ticking digits are hidden from screen readers, which get the label and
    the time to the minute as one phrase instead. Nothing here is a live
    region, so the time is read on demand and not announced every second.
  -->
  <p class="readout__main">
    <span class="readout__label" aria-hidden="true">{mainLabel}</span>
    <time class="readout__time" datetime={wallTimeAttribute(main)} aria-hidden="true">
      {formatWallTime(main, { seconds: true })}
    </time>
    <span class="readout__spoken">{mainLabel}: {formatWallTime(main)}</span>
  </p>

  <fieldset class="readout__toggle">
    <legend class="readout__spoken">Main readout</legend>
    {#each MODES as { value, label } (value)}
      <label class="readout__option">
        <input class="readout__radio" type="radio" name="clock-mode" {value} bind:group={mode} />
        <span class="readout__option-label">{label}</span>
      </label>
    {/each}
  </fieldset>

  <dl class="readout__details">
    <div class="readout__detail">
      <dt class="readout__term">Zone time</dt>
      <dd class="readout__value">
        <time datetime={wallTimeAttribute(zone.time)}>{formatWallTime(zone.time)}</time>
        {zone.zoneName}
      </dd>
    </div>
    {#if mode === 'solar'}
      <div class="readout__detail">
        <dt class="readout__term">Equation of time</dt>
        <dd class="readout__value">{formatEquationOfTime(equationOfTime(now))}</dd>
      </div>
    {/if}
    <div class="readout__detail">
      <dt class="readout__term">Longitude</dt>
      <dd class="readout__value">{formatLongitude(longitude)}</dd>
    </div>
  </dl>
</section>

<style>
  .readout {
    display: grid;
    gap: 0.75rem;
    box-sizing: border-box;
    width: min(100%, 20rem);
    padding: 1rem 1.25rem;
    border: 1px solid color-mix(in srgb, CanvasText 20%, transparent);
    border-radius: 0.75rem;
    background: Canvas;
    color: CanvasText;
    font-variant-numeric: tabular-nums;
  }

  .readout__main {
    display: grid;
    margin: 0;
  }

  .readout__label {
    font-size: 0.8125rem;
    opacity: 0.75;
  }

  .readout__time {
    font-size: 2.25rem;
    font-weight: 600;
    line-height: 1.2;
    white-space: nowrap;
  }

  .readout__spoken {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  .readout__toggle {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.125rem;
    margin: 0;
    padding: 0.125rem;
    border: 1px solid color-mix(in srgb, CanvasText 20%, transparent);
    border-radius: 0.5rem;
  }

  .readout__option {
    position: relative;
    display: grid;
    cursor: pointer;
  }

  .readout__radio {
    position: absolute;
    inset: 0;
    margin: 0;
    opacity: 0;
    cursor: pointer;
  }

  .readout__option-label {
    padding: 0.25rem 0.5rem;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    text-align: center;
  }

  .readout__radio:checked + .readout__option-label {
    background: CanvasText;
    color: Canvas;
  }

  .readout__radio:focus-visible + .readout__option-label {
    outline: 2px solid Highlight;
    outline-offset: 2px;
  }

  .readout__details {
    display: grid;
    gap: 0.125rem;
    margin: 0;
    font-size: 0.875rem;
  }

  .readout__detail {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
  }

  .readout__term {
    opacity: 0.75;
  }

  .readout__value {
    margin: 0;
    white-space: nowrap;
  }
</style>
