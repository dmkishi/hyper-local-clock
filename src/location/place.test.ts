import { afterEach, describe, expect, it, vi } from 'vitest';
import { distanceMeters, loadPlace, savePlace, type Place } from './place';

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

describe('distanceMeters', () => {
  it('is zero for the same position', () => {
    expect(distanceMeters(OAKLAND, OAKLAND)).toBe(0);
  });

  it('measures a degree of latitude as about 111 km', () => {
    expect(distanceMeters({ latitude: 0, longitude: 0 }, { latitude: 1, longitude: 0 })).toBeCloseTo(111_195, -1);
  });

  it('shrinks a degree of longitude toward the poles', () => {
    const atEquator = distanceMeters({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 1 });
    const at60 = distanceMeters({ latitude: 60, longitude: 0 }, { latitude: 60, longitude: 1 });
    expect(atEquator).toBeCloseTo(111_195, -1);
    expect(at60 / atEquator).toBeCloseTo(0.5, 5);
  });

  it('takes the short way across the date line', () => {
    const across = distanceMeters({ latitude: 0, longitude: 179.5 }, { latitude: 0, longitude: -179.5 });
    expect(across).toBeCloseTo(111_195, -1);
  });
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

  it('keeps the name a geocoder gave the place', () => {
    stubStorage();
    const named: Place = { ...OAKLAND, name: 'Lakeshore, Oakland' };
    savePlace(named);
    expect(loadPlace()).toEqual(named);
  });

  it('drops a malformed name but keeps the place', () => {
    stubStorage({ [KEY]: '{"latitude":37.8,"longitude":10,"name":7,"source":"picked"}' });
    expect(loadPlace()).toEqual({ latitude: 37.8, longitude: 10, source: 'picked' });
  });

  it('does nothing when storage is blocked', () => {
    vi.stubGlobal('localStorage', { getItem: blocked, setItem: blocked });
    expect(loadPlace()).toBeUndefined();
    expect(() => {
      savePlace(OAKLAND);
    }).not.toThrow();
  });
});
