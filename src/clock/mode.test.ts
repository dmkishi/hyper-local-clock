import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadMode, saveMode } from './mode';

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

describe('clock mode', () => {
  it('defaults to mean time', () => {
    stubStorage();
    expect(loadMode()).toBe('mean');
  });

  it('remembers the choice', () => {
    stubStorage();
    saveMode('solar');
    expect(loadMode()).toBe('solar');
    saveMode('mean');
    expect(loadMode()).toBe('mean');
  });

  it('ignores an unknown stored value', () => {
    stubStorage({ 'hyper-local-clock:mode': 'sidereal' });
    expect(loadMode()).toBe('mean');
  });

  it('falls back to mean time when storage is blocked', () => {
    vi.stubGlobal('localStorage', { getItem: blocked, setItem: blocked });
    expect(loadMode()).toBe('mean');
    expect(() => {
      saveMode('solar');
    }).not.toThrow();
  });
});
