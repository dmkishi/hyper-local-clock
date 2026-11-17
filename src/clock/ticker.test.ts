import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startTicker } from './ticker';

const START = Date.parse('2026-03-20T12:00:00.250Z');

let page: EventTarget & { visibilityState: string };
let ticks: number[];
let stop: () => void;

const start = (offset?: () => number): void => {
  stop = startTicker((now) => {
    ticks.push(now.getTime() - START);
  }, offset);
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(START);
  page = Object.assign(new EventTarget(), { visibilityState: 'visible' });
  vi.stubGlobal('document', page);
  ticks = [];
});

afterEach(() => {
  stop();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('startTicker', () => {
  it('ticks at once, then on every second boundary', () => {
    start();
    expect(ticks).toEqual([0]);
    vi.advanceTimersByTime(2_750);
    expect(ticks).toEqual([0, 750, 1_750, 2_750]);
  });

  it('realigns to the boundary after a late timer', () => {
    start();
    // The timer due at 750 ms is held back, as in a throttled background tab.
    vi.setSystemTime(START + 5_300);
    vi.advanceTimersByTime(750);
    expect(ticks).toEqual([0, 6_050]);
    vi.advanceTimersByTime(700);
    expect(ticks).toEqual([0, 6_050, 6_750]);
  });

  it('does not drift over 24 hours', () => {
    start();
    vi.advanceTimersByTime(86_400_000);
    expect(ticks).toHaveLength(86_401);
    expect(ticks.at(-1)).toBe(86_400_000 - 250);
  });

  it('also ticks on the second boundary of an offset readout', () => {
    // A readout 46.008 s ahead rolls over 8 ms before the device clock does.
    start(() => 46_008);
    vi.advanceTimersByTime(1_750);
    expect(ticks).toEqual([0, 742, 750, 1_742, 1_750]);
  });

  it('handles a negative offset', () => {
    start(() => -1_440);
    vi.advanceTimersByTime(750);
    expect(ticks).toEqual([0, 190, 750]);
  });

  it('ticks when the page becomes visible again', () => {
    start();
    page.visibilityState = 'hidden';
    page.dispatchEvent(new Event('visibilitychange'));
    expect(ticks).toEqual([0]);
    vi.setSystemTime(START + 100);
    page.visibilityState = 'visible';
    page.dispatchEvent(new Event('visibilitychange'));
    expect(ticks).toEqual([0, 100]);
    vi.advanceTimersByTime(650);
    expect(ticks).toEqual([0, 100, 750]);
  });

  it('stops ticking and listening', () => {
    start();
    stop();
    vi.advanceTimersByTime(5_000);
    page.dispatchEvent(new Event('visibilitychange'));
    expect(ticks).toEqual([0]);
  });
});
