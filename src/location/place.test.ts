import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadPlace, savePlace, type Place } from './place';

const KEY = 'hyper-local-clock:place';
const OAKLAND: Place = { latitude: 37.8095, longitude: -122.2426, accuracy: 12, source: 'device' };

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

describe('saved place', () => {
  it('is absent on a first visit', () => {
    stubStorage();
    expect(loadPlace()).toBeUndefined();
  });

  it('survives to the next visit', () => {
    stubStorage();
    savePlace(OAKLAND);
    expect(loadPlace()).toEqual(OAKLAND);
  });

  it('keeps a place set by hand, which has no accuracy', () => {
    stubStorage();
    const picked: Place = { latitude: -90, longitude: 180, source: 'picked' };
    savePlace(picked);
    expect(loadPlace()).toEqual(picked);
  });

  it.each([
    ['broken JSON', '{'],
    ['a non-object', '"Oakland"'],
    ['null', 'null'],
    ['a missing longitude', '{"latitude":37.8,"source":"device"}'],
    ['an out-of-range longitude', '{"latitude":37.8,"longitude":181,"source":"device"}'],
    ['an out-of-range latitude', '{"latitude":-91,"longitude":10,"source":"device"}'],
    ['a non-numeric coordinate', '{"latitude":"37.8","longitude":10,"source":"device"}'],
    ['an unknown source', '{"latitude":37.8,"longitude":10,"source":"guess"}'],
  ])('ignores %s', (_name, json) => {
    stubStorage({ [KEY]: json });
    expect(loadPlace()).toBeUndefined();
  });

  it('drops a malformed accuracy but keeps the place', () => {
    stubStorage({ [KEY]: '{"latitude":37.8,"longitude":10,"accuracy":-5,"source":"device"}' });
    expect(loadPlace()).toEqual({ latitude: 37.8, longitude: 10, source: 'device' });
  });

  it('does nothing when storage is blocked', () => {
    vi.stubGlobal('localStorage', { getItem: blocked, setItem: blocked });
    expect(loadPlace()).toBeUndefined();
    expect(() => {
      savePlace(OAKLAND);
    }).not.toThrow();
  });
});
