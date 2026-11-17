/** Which time the main readout shows: local mean time or apparent solar time. */
export type ClockMode = 'mean' | 'solar';

const STORAGE_KEY = 'hyper-local-clock:mode';

/** The remembered mode, or mean time when there is none or storage is blocked. */
export function loadMode(): ClockMode {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'solar' ? 'solar' : 'mean';
  } catch {
    return 'mean';
  }
}

/** Remembers the mode for the next visit. Does nothing when storage is blocked. */
export function saveMode(mode: ClockMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // Private windows and blocked site data: the toggle still works for this visit.
  }
}
