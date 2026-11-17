import { MediaQuery } from 'svelte/reactivity';
import { loadSettings } from './settings';

/** The settings in use. Components read and write them here; the app saves them when they change. */
export const settings = $state(loadSettings(navigator.language));

const deviceDark = new MediaQuery('(prefers-color-scheme: dark)');

/** Whether the app is showing in dark mode, by choice or because the device is. */
export function isDark(): boolean {
  return settings.theme === 'system' ? deviceDark.current : settings.theme === 'dark';
}
