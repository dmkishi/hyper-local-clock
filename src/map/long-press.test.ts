import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { watchLongPress } from './long-press';

type Listener = Parameters<Parameters<typeof watchLongPress>[0]['on']>[1];
type PressEvent = Parameters<Listener>[0];

const OAKLAND = { lng: -122.2426, lat: 37.8095 };

let listeners: Map<string, Set<Listener>>;
let presses: { lng: number; lat: number }[];
let stop: () => void;

const emit = (type: string, event: PressEvent = {}): void => {
  for (const listener of listeners.get(type) ?? []) listener(event);
};

beforeEach(() => {
  vi.useFakeTimers();
  listeners = new Map();
  presses = [];
  stop = watchLongPress(
    {
      on: (type, listener) => {
        const set = listeners.get(type) ?? new Set();
        listeners.set(type, set.add(listener));
      },
      off: (type, listener) => {
        listeners.get(type)?.delete(listener);
      },
    },
    (position) => {
      presses.push(position);
    },
  );
});

afterEach(() => {
  vi.useRealTimers();
});

describe('watchLongPress', () => {
  it('reports a mouse button held for half a second', () => {
    emit('mousedown', { lngLat: OAKLAND, originalEvent: { button: 0 } });
    vi.advanceTimersByTime(499);
    expect(presses).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(presses).toEqual([OAKLAND]);
  });

  it('reports a finger held still', () => {
    emit('touchstart', { lngLat: OAKLAND, originalEvent: { touches: { length: 1 } } });
    vi.advanceTimersByTime(500);
    expect(presses).toEqual([OAKLAND]);
  });

  it('reports once, however long the press lasts', () => {
    emit('mousedown', { lngLat: OAKLAND });
    vi.advanceTimersByTime(5_000);
    emit('mouseup');
    expect(presses).toEqual([OAKLAND]);
  });

  it.each(['mouseup', 'mouseout', 'touchend', 'touchcancel'])('ignores a press that ends early with %s', (ending) => {
    emit('mousedown', { lngLat: OAKLAND });
    vi.advanceTimersByTime(300);
    emit(ending);
    vi.advanceTimersByTime(500);
    expect(presses).toEqual([]);
  });

  it('leaves panning and zooming alone', () => {
    emit('touchstart', { lngLat: OAKLAND, originalEvent: { touches: { length: 1 } } });
    vi.advanceTimersByTime(100);
    emit('movestart');
    vi.advanceTimersByTime(500);
    expect(presses).toEqual([]);
  });

  it('ignores a second finger, which starts a pinch', () => {
    emit('touchstart', { lngLat: OAKLAND, originalEvent: { touches: { length: 1 } } });
    emit('touchstart', { lngLat: OAKLAND, originalEvent: { touches: { length: 2 } } });
    vi.advanceTimersByTime(500);
    expect(presses).toEqual([]);
  });

  it.each([
    ['a right click', { button: 2 }],
    ['a Control-click', { button: 0, ctrlKey: true }],
  ])('ignores %s', (_name, originalEvent) => {
    emit('mousedown', { lngLat: OAKLAND, originalEvent });
    vi.advanceTimersByTime(500);
    expect(presses).toEqual([]);
  });

  it('stops listening and drops a press in progress', () => {
    emit('mousedown', { lngLat: OAKLAND });
    stop();
    vi.advanceTimersByTime(500);
    expect(presses).toEqual([]);
    expect([...listeners.values()].every((set) => set.size === 0)).toBe(true);
  });
});
