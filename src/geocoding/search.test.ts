import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GeocoderResult } from './geocoder';
import { createSearch, type SearchState } from './search';

const OAKLAND: GeocoderResult = { name: 'Oakland', detail: 'California, United States', latitude: 37.8, longitude: -122.27 };

let queries: string[];
let signals: AbortSignal[];
let states: SearchState[];
let answer: (query: string) => Promise<GeocoderResult[]>;

const start = (): ReturnType<typeof createSearch> =>
  createSearch(
    {
      search: (query, signal) => {
        queries.push(query);
        if (signal) signals.push(signal);
        return answer(query);
      },
    },
    (state) => {
      states.push(state);
    },
  );

beforeEach(() => {
  vi.useFakeTimers();
  queries = [];
  signals = [];
  states = [];
  answer = () => Promise.resolve([OAKLAND]);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('createSearch', () => {
  it('searches 300 ms after the typing stops', async () => {
    const search = start();
    search.input('oak');
    await vi.advanceTimersByTimeAsync(299);
    expect(queries).toEqual([]);
    expect(states).toEqual([{ status: 'loading' }]);
    await vi.advanceTimersByTimeAsync(1);
    expect(queries).toEqual(['oak']);
    expect(states.at(-1)).toEqual({ status: 'done', results: [OAKLAND] });
  });

  it('sends one request for a burst of keystrokes', async () => {
    const search = start();
    for (const text of ['oak', 'oakl', 'oakla']) {
      search.input(text);
      // oxlint-disable-next-line no-await-in-loop -- Each keystroke lands before the last one's pause is over.
      await vi.advanceTimersByTimeAsync(200);
    }
    await vi.advanceTimersByTimeAsync(300);
    expect(queries).toEqual(['oakla']);
  });

  it('does not search for fewer than 3 characters', async () => {
    const search = start();
    search.input('oa');
    search.input('  o  ');
    await vi.advanceTimersByTimeAsync(1_000);
    expect(queries).toEqual([]);
    expect(states).toEqual([{ status: 'idle' }, { status: 'idle' }]);
  });

  it('answers a repeat from the cache, at once and whatever its case or padding', async () => {
    const search = start();
    search.input('Oakland');
    await vi.advanceTimersByTimeAsync(300);
    search.input('oak');
    await vi.advanceTimersByTimeAsync(300);
    states = [];
    search.input(' oakland ');
    expect(states).toEqual([{ status: 'done', results: [OAKLAND] }]);
    expect(queries).toEqual(['Oakland', 'oak']);
  });

  it('abandons a request once newer text replaces it', async () => {
    const pending = new Map<string, (results: GeocoderResult[]) => void>();
    answer = (query) =>
      new Promise((resolve) => {
        pending.set(query, resolve);
      });
    const search = start();
    search.input('oak');
    await vi.advanceTimersByTimeAsync(300);
    search.input('oakland');
    expect(signals[0]?.aborted).toBe(true);
    await vi.advanceTimersByTimeAsync(300);

    states = [];
    pending.get('oak')?.([]);
    await vi.advanceTimersByTimeAsync(0);
    expect(states).toEqual([]);
    pending.get('oakland')?.([OAKLAND]);
    await vi.advanceTimersByTimeAsync(0);
    expect(states).toEqual([{ status: 'done', results: [OAKLAND] }]);
  });

  it('reports a failure and does not cache it', async () => {
    answer = () => Promise.reject(new Error('throttled'));
    const search = start();
    search.input('oakland');
    await vi.advanceTimersByTimeAsync(300);
    expect(states.at(-1)).toEqual({ status: 'failed' });

    answer = () => Promise.resolve([OAKLAND]);
    search.input('oakland');
    await vi.advanceTimersByTimeAsync(300);
    expect(states.at(-1)).toEqual({ status: 'done', results: [OAKLAND] });
    expect(queries).toHaveLength(2);
  });

  it('reports nothing after it is cancelled', async () => {
    const search = start();
    search.input('oakland');
    search.cancel();
    await vi.advanceTimersByTimeAsync(1_000);
    expect(queries).toEqual([]);
    expect(states).toEqual([{ status: 'loading' }]);
  });
});
