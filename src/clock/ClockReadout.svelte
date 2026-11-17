<script lang="ts">
  import { onMount } from 'svelte';
  import { apparentSolarTime, equationOfTime, lmt, zoneTime } from '../time-engine';
  import {
    formatAccuracy,
    formatEquationOfTime,
    formatLongitude,
    formatWallTime,
    wallTimeAttribute,
  } from './format';
  import type { ClockMode } from '../settings/settings';
  import { settings } from '../settings/state.svelte';
  import SegmentedControl from '../ui/SegmentedControl.svelte';
  import { startTicker } from './ticker';

  interface Props {
    /** Degrees, east positive, within [-180, 180]. */
    longitude: number;
    /** Radius in meters that the browser reports for the position, when it reports one. */
    accuracy?: number;
  }

  const { longitude, accuracy }: Props = $props();

  const MODES: { value: ClockMode; label: string }[] = [
    { value: 'mean', label: 'Mean' },
    { value: 'solar', label: 'Solar' },
  ];

  let now = $state(new Date());

  const main = $derived(settings.mode === 'solar' ? apparentSolarTime(now, longitude) : lmt(now, longitude));
  const mainLabel = $derived(settings.mode === 'solar' ? 'Solar time' : 'Mean time');
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

  <SegmentedControl legend="Main readout" legendHidden name="clock-mode" options={MODES} bind:value={settings.mode} />

  <dl class="readout__details">
    <div class="readout__detail">
      <dt class="readout__term">Zone time</dt>
      <dd class="readout__value">
        <time datetime={wallTimeAttribute(zone.time)}>{formatWallTime(zone.time)}</time>
        {zone.zoneName}
      </dd>
    </div>
    {#if settings.mode === 'solar'}
      <div class="readout__detail">
        <dt class="readout__term">Equation of time</dt>
        <dd class="readout__value">{formatEquationOfTime(equationOfTime(now))}</dd>
      </div>
    {/if}
    <div class="readout__detail">
      <dt class="readout__term">Longitude</dt>
      <dd class="readout__value">{formatLongitude(longitude)}</dd>
    </div>
    {#if accuracy !== undefined}
      <div class="readout__detail">
        <dt class="readout__term">Accuracy</dt>
        <dd class="readout__value">{formatAccuracy(accuracy, settings.units)}</dd>
      </div>
    {/if}
  </dl>
</section>

<style>
  .readout {
    display: grid;
    gap: 0.75rem;
    box-sizing: border-box;
    width: min(100%, 20rem);
    padding: 1rem 1.25rem;
    border: 1px solid var(--border);
    border-radius: 0.75rem;
    background: Canvas;
    color: CanvasText;
    font-variant-numeric: tabular-nums;
  }

  .readout__main {
    display: grid;
    margin: 0;
    container-type: inline-size;
  }

  .readout__label {
    color: var(--text-muted);
    font-size: 0.8125rem;
  }

  .readout__time {
    /* Under large text the digits stop growing where they would outgrow the readout. */
    font-size: min(2.25rem, 14cqi);
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

  .readout__details {
    display: grid;
    gap: 0.125rem;
    margin: 0;
    font-size: 0.875rem;
  }

  /* A value too long for its row, as under large text, drops below its term. */
  .readout__detail {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    column-gap: 1rem;
  }

  .readout__term {
    color: var(--text-muted);
  }

  .readout__value {
    margin: 0;
    white-space: nowrap;
  }
</style>
