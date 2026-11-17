<script lang="ts">
  interface Props {
    /** True once location has been requested and no position has arrived yet. */
    locating: boolean;
    /** Asks the browser for the location. Runs from the button, so the prompt follows a tap or click. */
    onlocate: () => void;
    /** Opens the place picker instead. */
    onpick: () => void;
  }

  const { locating, onlocate, onpick }: Props = $props();
</script>

<section class="onboarding" aria-labelledby="onboarding-title">
  <h2 class="onboarding__title" id="onboarding-title">Time for exactly where you are</h2>
  <p class="onboarding__text">
    This clock runs on your longitude: every step east or west moves it. It needs your location to know where you
    stand, and follows you while this page is open.
  </p>
  <p class="onboarding__text">Your last place is saved on this device so the clock is ready on your next visit.</p>
  <div class="onboarding__actions">
    <button class="onboarding__button onboarding__button--primary" type="button" disabled={locating} onclick={onlocate}>
      {locating ? 'Locating…' : 'Use my location'}
    </button>
    <button class="onboarding__button" type="button" onclick={onpick}>Set a place instead</button>
  </div>
</section>

<style>
  .onboarding {
    display: grid;
    gap: 0.75rem;
    box-sizing: border-box;
    width: min(100%, 24rem);
  }

  .onboarding__title {
    margin: 0;
    font-size: 1.5rem;
    line-height: 1.2;
  }

  .onboarding__text {
    margin: 0;
  }

  .onboarding__actions {
    display: grid;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }

  .onboarding__button {
    padding: 0.625rem 1rem;
    border: 1px solid color-mix(in srgb, CanvasText 20%, transparent);
    border-radius: 0.5rem;
    background: Canvas;
    color: CanvasText;
    font: inherit;
    cursor: pointer;
  }

  .onboarding__button--primary {
    border-color: CanvasText;
    background: CanvasText;
    color: Canvas;
    font-weight: 600;
  }

  .onboarding__button:disabled {
    opacity: 0.6;
    cursor: progress;
  }

  .onboarding__button:focus-visible {
    outline: 2px solid Highlight;
    outline-offset: 2px;
  }
</style>
