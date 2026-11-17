<script lang="ts">
  import Modal from '../ui/Modal.svelte';
  import SegmentedControl from '../ui/SegmentedControl.svelte';
  import type { ClockMode, Theme, Units } from './settings';
  import { settings } from './state.svelte';

  interface Props {
    open: boolean;
  }

  let { open = $bindable() }: Props = $props();

  const MODES: { value: ClockMode; label: string }[] = [
    { value: 'mean', label: 'Mean' },
    { value: 'solar', label: 'Solar' },
  ];
  const UNITS: { value: Units; label: string }[] = [
    { value: 'metric', label: 'Metric' },
    { value: 'imperial', label: 'Imperial' },
  ];
  const THEMES: { value: Theme; label: string }[] = [
    { value: 'system', label: 'System' },
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
  ];
</script>

<Modal title="Settings" bind:open>
  <div class="settings">
    <div class="settings__item">
      <SegmentedControl legend="Main readout" name="settings-mode" options={MODES} bind:value={settings.mode} />
      <p class="settings__hint">
        {settings.mode === 'solar'
          ? 'Solar time follows the real sun, which runs up to 16 minutes ahead of or behind mean time over the year.'
          : 'Mean time runs at an even pace, 4 minutes for every degree of longitude.'}
      </p>
    </div>
    <div class="settings__item">
      <SegmentedControl legend="Units" name="settings-units" options={UNITS} bind:value={settings.units} />
      <p class="settings__hint">
        {settings.units === 'imperial'
          ? 'Location accuracy is shown in feet and miles.'
          : 'Location accuracy is shown in meters and kilometers.'}
      </p>
    </div>
    <div class="settings__item">
      <SegmentedControl legend="Appearance" name="settings-theme" options={THEMES} bind:value={settings.theme} />
      <p class="settings__hint">
        {settings.theme === 'system' ? 'Light or dark, whichever this device is set to.' : 'Stays this way on this device.'}
      </p>
    </div>
  </div>
</Modal>

<style>
  .settings {
    display: grid;
    gap: 1rem;
  }

  .settings__item {
    display: grid;
    gap: 0.25rem;
  }

  .settings__hint {
    margin: 0;
    color: var(--text-muted);
    font-size: 0.875rem;
  }
</style>
