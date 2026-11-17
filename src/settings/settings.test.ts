import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadSettings, saveSettings } from './settings';

const stubStorage = (initial: Record<string, string> = {}): void => {
  const items = new Map(Object.entries(initial));
  vi.stubGlobal('localStorage', {
    // oxlint-disable-next-line unicorn/no-null -- `Storage.getItem` returns null for a missing key.
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => {
      items.set(key, value);
    },
  });
};

const blocked = (): never => {
  throw new DOMException('Blocked', 'SecurityError');
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('settings', () => {
  it('defaults to mean time and the device theme', () => {
    stubStorage();
    expect(loadSettings('en-GB')).toEqual({ mode: 'mean', units: 'metric', theme: 'system' });
  });

  it('defaults the units to the custom of the region', () => {
    stubStorage();
    expect(loadSettings('en-US').units).toBe('imperial');
    expect(loadSettings('es-US').units).toBe('imperial');
    expect(loadSettings('en-CA').units).toBe('metric');
    expect(loadSettings('ja').units).toBe('metric');
  });

  it('defaults to metric when the locale is missing or malformed', () => {
    stubStorage();
    expect(loadSettings().units).toBe('metric');
    expect(loadSettings('not a locale').units).toBe('metric');
  });

  it('remembers each choice', () => {
    stubStorage();
    saveSettings({ mode: 'solar', units: 'metric', theme: 'dark' });
    expect(loadSettings('en-US')).toEqual({ mode: 'solar', units: 'metric', theme: 'dark' });
    saveSettings({ mode: 'mean', units: 'imperial', theme: 'light' });
    expect(loadSettings('en-GB')).toEqual({ mode: 'mean', units: 'imperial', theme: 'light' });
  });

  it('reads the mode saved before there were other settings', () => {
    stubStorage({ 'hyper-local-clock:mode': 'solar' });
    expect(loadSettings('en-GB').mode).toBe('solar');
  });

  it('ignores unknown stored values', () => {
    stubStorage({
      'hyper-local-clock:mode': 'sidereal',
      'hyper-local-clock:units': 'nautical',
      'hyper-local-clock:theme': 'sepia',
    });
    expect(loadSettings('en-GB')).toEqual({ mode: 'mean', units: 'metric', theme: 'system' });
  });

  it('falls back to the defaults when storage is blocked', () => {
    vi.stubGlobal('localStorage', { getItem: blocked, setItem: blocked });
    expect(loadSettings('en-GB')).toEqual({ mode: 'mean', units: 'metric', theme: 'system' });
    expect(() => {
      saveSettings({ mode: 'solar', units: 'imperial', theme: 'dark' });
    }).not.toThrow();
  });
});
