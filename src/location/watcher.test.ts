import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Place } from './place';
import { locationGranted, startWatcher, type WatchFailure } from './watcher';

const PERMISSION_DENIED = 1;
const POSITION_UNAVAILABLE = 2;

interface Watch {
  success: (position: { coords: { latitude: number; longitude: number; accuracy: number } }) => void;
  error: (error: { code: number; PERMISSION_DENIED: number }) => void;
  options: PositionOptions;
}

let page: EventTarget & { visibilityState: string };
let watches: Map<number, Watch>;
let started: number;
let places: Place[];
let failures: WatchFailure[];

const start = (): (() => void) =>
  startWatcher(
    (place) => {
      places.push(place);
    },
    (failure) => {
      failures.push(failure);
    },
  );

const setVisibility = (state: string): void => {
  page.visibilityState = state;
  page.dispatchEvent(new Event('visibilitychange'));
};

const onlyWatch = (): Watch => {
  expect(watches.size).toBe(1);
  const [watch] = watches.values();
  return watch;
};

const stubPermission = (state: string): void => {
  vi.stubGlobal('navigator', { permissions: { query: () => Promise.resolve({ state }) } });
};

beforeEach(() => {
  page = Object.assign(new EventTarget(), { visibilityState: 'visible' });
  watches = new Map();
  started = 0;
  places = [];
  failures = [];
  vi.stubGlobal('document', page);
  vi.stubGlobal('navigator', {
    geolocation: {
      watchPosition: (success: Watch['success'], error: Watch['error'], options: PositionOptions) => {
        started += 1;
        watches.set(started, { success, error, options });
        return started;
      },
      clearWatch: (id: number) => {
        watches.delete(id);
      },
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('startWatcher', () => {
  it('reports each position as a device place', () => {
    start();
    const watch = onlyWatch();
    expect(watch.options.enableHighAccuracy).toBe(true);
    watch.success({ coords: { latitude: 37.8095, longitude: -122.2426, accuracy: 12 } });
    watch.success({ coords: { latitude: 37.81, longitude: -122.25, accuracy: 8 } });
    expect(places).toEqual([
      { latitude: 37.8095, longitude: -122.2426, accuracy: 12, source: 'device' },
      { latitude: 37.81, longitude: -122.25, accuracy: 8, source: 'device' },
    ]);
  });

  it('stops watching while the tab is hidden and resumes when it is visible', () => {
    start();
    setVisibility('hidden');
    expect(watches.size).toBe(0);
    setVisibility('visible');
    expect(watches.size).toBe(1);
    expect(started).toBe(2);
  });

  it('does not watch when started in a hidden tab', () => {
    page.visibilityState = 'hidden';
    start();
    expect(watches.size).toBe(0);
    setVisibility('visible');
    expect(watches.size).toBe(1);
  });

  it('does not start a second watch when visibility fires twice', () => {
    start();
    setVisibility('visible');
    expect(started).toBe(1);
  });

  it('gives up when permission is denied', () => {
    start();
    onlyWatch().error({ code: PERMISSION_DENIED, PERMISSION_DENIED });
    expect(failures).toEqual(['denied']);
    expect(watches.size).toBe(0);
    setVisibility('visible');
    expect(watches.size).toBe(0);
  });

  it('keeps watching when the position is unavailable', () => {
    start();
    onlyWatch().error({ code: POSITION_UNAVAILABLE, PERMISSION_DENIED });
    expect(failures).toEqual(['unavailable']);
    expect(watches.size).toBe(1);
  });

  it('reports a browser without geolocation', () => {
    vi.stubGlobal('navigator', {});
    const stop = start();
    expect(failures).toEqual(['unsupported']);
    expect(() => {
      stop();
    }).not.toThrow();
  });

  it('stops watching and listening', () => {
    const stop = start();
    stop();
    expect(watches.size).toBe(0);
    setVisibility('visible');
    expect(watches.size).toBe(0);
  });
});

describe('locationGranted', () => {
  it('is true only when permission is granted', async () => {
    stubPermission('granted');
    await expect(locationGranted()).resolves.toBe(true);
    stubPermission('prompt');
    await expect(locationGranted()).resolves.toBe(false);
    stubPermission('denied');
    await expect(locationGranted()).resolves.toBe(false);
  });

  it('is false without the Permissions API', async () => {
    vi.stubGlobal('navigator', {});
    await expect(locationGranted()).resolves.toBe(false);
  });
});
