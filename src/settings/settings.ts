/** Which time the main readout shows: local mean time or apparent solar time. */
export type ClockMode = 'mean' | 'solar';
/** Which units distances are shown in. */
export type Units = 'metric' | 'imperial';
/** Light or dark, or whichever the device is set to. */
export type Theme = 'system' | 'light' | 'dark';

export interface Settings {
  mode: ClockMode;
  units: Units;
  theme: Theme;
}

const STORAGE_PREFIX = 'hyper-local-clock:';
/** Regions where distances are customarily given in feet and miles. */
const IMPERIAL_REGIONS = new Set(['US', 'LR', 'MM']);

const MODES: readonly ClockMode[] = ['mean', 'solar'];
const UNITS: readonly Units[] = ['metric', 'imperial'];
const THEMES: readonly Theme[] = ['system', 'light', 'dark'];

/** The units a locale's region customarily uses, or metric when the locale names no region. */
function defaultUnits(locale: string | undefined): Units {
  try {
    const { region } = new Intl.Locale(locale ?? '').maximize();
    return region !== undefined && IMPERIAL_REGIONS.has(region) ? 'imperial' : 'metric';
  } catch {
    return 'metric';
  }
}

/** The stored value for a setting, or the fallback when there is none, it is unknown, or storage is blocked. */
function read<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const stored = localStorage.getItem(STORAGE_PREFIX + key);
    return allowed.find((value) => value === stored) ?? fallback;
  } catch {
    return fallback;
  }
}

/**
 * The remembered settings. A setting that was never chosen defaults to mean
 * time, the units of the given locale's region, and the device's light or dark mode.
 */
export function loadSettings(locale?: string): Settings {
  return {
    mode: read('mode', MODES, 'mean'),
    units: read('units', UNITS, defaultUnits(locale)),
    theme: read('theme', THEMES, 'system'),
  };
}

/** Remembers the settings for the next visit. Does nothing when storage is blocked. */
export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}mode`, settings.mode);
    localStorage.setItem(`${STORAGE_PREFIX}units`, settings.units);
    localStorage.setItem(`${STORAGE_PREFIX}theme`, settings.theme);
  } catch {
    // Private windows and blocked site data: the settings still hold for this visit.
  }
}
