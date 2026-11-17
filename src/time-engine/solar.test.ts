import { describe, expect, it } from 'vitest';
import { apparentSolarTime, equationOfTime, lmt } from './index';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

const utc = (iso: string): Date => new Date(iso);
const iso = (date: Date): string => date.toISOString();
const lmtAt = (date: string, longitude: number): string => iso(lmt(utc(date), longitude));
const eotSeconds = (date: string): number => equationOfTime(utc(date)) * 60;
const START_2024 = Date.parse('2024-01-01T12:00:00Z');
const START_2026 = Date.parse('2026-01-01T12:00:00Z');

describe('lmt', () => {
  it('equals UTC at Greenwich', () => {
    expect(lmtAt('2026-03-20T12:00:00Z', 0)).toBe('2026-03-20T12:00:00.000Z');
  });

  it('adds 4 minutes per degree east and subtracts them west', () => {
    const noon = utc('2026-03-20T12:00:00Z');
    expect(iso(lmt(noon, 1))).toBe('2026-03-20T12:04:00.000Z');
    expect(iso(lmt(noon, -1))).toBe('2026-03-20T11:56:00.000Z');
    expect(iso(lmt(noon, 15))).toBe('2026-03-20T13:00:00.000Z');
    expect(iso(lmt(noon, -90))).toBe('2026-03-20T06:00:00.000Z');
  });

  it('matches reference values at fixed longitudes', () => {
    const noon = utc('2026-03-20T12:00:00Z');
    // Tokyo, 139.6917° E: +9 h 18 min 46.008 s.
    expect(iso(lmt(noon, 139.6917))).toBe('2026-03-20T21:18:46.008Z');
    // New York, 74.006° W: -4 h 56 min 1.44 s.
    expect(iso(lmt(noon, -74.006))).toBe('2026-03-20T07:03:58.560Z');
  });

  it('moves 1 second for every 1/240 of a degree', () => {
    const noon = utc('2026-03-20T12:00:00Z');
    expect(lmt(noon, 1 / 240).getTime() - noon.getTime()).toBe(1_000);
  });

  it('keeps sub-second precision', () => {
    expect(lmtAt('2026-03-20T12:00:00.250Z', 15)).toBe('2026-03-20T13:00:00.250Z');
  });

  describe('at the date line', () => {
    it('runs 12 hours ahead of UTC just west of the line', () => {
      expect(lmtAt('2026-03-20T12:00:00Z', 180)).toBe('2026-03-21T00:00:00.000Z');
    });

    it('runs 12 hours behind UTC just east of the line', () => {
      expect(lmtAt('2026-03-20T12:00:00Z', -180)).toBe('2026-03-20T00:00:00.000Z');
    });

    it('shows the same clock on both sides, one calendar day apart', () => {
      const instant = utc('2026-12-31T18:30:15Z');
      const west = lmt(instant, 180);
      const east = lmt(instant, -180);
      expect(west.getTime() - east.getTime()).toBe(DAY);
      expect(iso(west)).toBe('2027-01-01T06:30:15.000Z');
      expect(iso(east)).toBe('2026-12-31T06:30:15.000Z');
    });

    it('is continuous up to the line', () => {
      const instant = utc('2026-03-20T12:00:00Z');
      expect(lmt(instant, 180).getTime() - lmt(instant, 179.999).getTime()).toBe(240);
      expect(lmt(instant, -179.999).getTime() - lmt(instant, -180).getTime()).toBe(240);
    });
  });

  // LMT depends on longitude alone, so the poles are where every meridian,
  // and so every LMT, meets. The engine takes no latitude and must work for
  // any longitude a receiver reports there.
  describe('at the poles', () => {
    it('spans exactly 24 hours across all meridians', () => {
      const instant = utc('2026-06-21T00:00:00Z');
      for (let longitude = -180; longitude < 180; longitude += 15) {
        const step = lmt(instant, longitude + 15).getTime() - lmt(instant, longitude).getTime();
        expect(step).toBe(HOUR);
      }
      expect(lmt(instant, 180).getTime() - lmt(instant, -180).getTime()).toBe(DAY);
    });
  });

  it('rejects longitudes outside [-180, 180] and non-numbers', () => {
    const now = utc('2026-03-20T12:00:00Z');
    expect(() => lmt(now, 180.001)).toThrow(RangeError);
    expect(() => lmt(now, -180.001)).toThrow(RangeError);
    expect(() => lmt(now, Number.NaN)).toThrow(RangeError);
    expect(() => lmt(now, Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });
});

describe('equationOfTime', () => {
  // The spec allows 30 s against a reference ephemeris.
  const TOLERANCE = 30;

  // Standard almanac figures for the four yearly extremes.
  it.each([
    ['2026-02-11T12:00:00Z', -(14 * 60 + 14)],
    ['2026-05-14T12:00:00Z', 3 * 60 + 40],
    ['2026-07-26T12:00:00Z', -(6 * 60 + 32)],
    ['2026-11-03T12:00:00Z', 16 * 60 + 26],
  ])('matches the extreme on %s', (date, expected) => {
    expect(Math.abs(eotSeconds(date) - expected)).toBeLessThan(TOLERANCE);
  });

  // The four dates where the sundial and the mean clock agree.
  it.each(['2026-04-15T12:00:00Z', '2026-06-13T12:00:00Z', '2026-09-01T12:00:00Z', '2026-12-25T12:00:00Z'])(
    'is near zero on %s',
    (date) => {
      expect(Math.abs(eotSeconds(date))).toBeLessThan(TOLERANCE);
    },
  );

  it('stays within about ±16.5 minutes all year', () => {
    for (let day = 0; day < 366; day += 1) {
      const minutes = equationOfTime(new Date(START_2026 + day * DAY));
      expect(minutes).toBeGreaterThan(-14.5);
      expect(minutes).toBeLessThan(16.6);
    }
  });

  it('has no jumps from one day to the next', () => {
    // Guards the angle wrap: the daily change never exceeds about 30 s.
    for (let day = 0; day < 366 * 4; day += 1) {
      const today = equationOfTime(new Date(START_2024 + day * DAY));
      const tomorrow = equationOfTime(new Date(START_2024 + (day + 1) * DAY));
      expect(Math.abs(tomorrow - today)).toBeLessThan(0.6);
    }
  });
});

describe('apparentSolarTime', () => {
  it('is LMT plus the equation of time', () => {
    const instant = utc('2026-11-03T12:00:00Z');
    const offset = apparentSolarTime(instant, 139.6917).getTime() - lmt(instant, 139.6917).getTime();
    expect(offset).toBe(Math.round(equationOfTime(instant) * 60_000));
  });

  it('runs ahead of LMT in early November and behind in mid-February', () => {
    const november = utc('2026-11-03T12:00:00Z');
    const february = utc('2026-02-11T12:00:00Z');
    expect(iso(apparentSolarTime(november, 0))).toMatch(/^2026-11-03T12:16:/u);
    expect(iso(apparentSolarTime(february, 0))).toMatch(/^2026-02-11T11:45:/u);
  });

  it('applies the same offset at the date line and across the poles', () => {
    const instant = utc('2026-02-11T12:00:00Z');
    const offset = Math.round(equationOfTime(instant) * 60_000);
    for (const longitude of [-180, -90, 0, 90, 180]) {
      const apparent = apparentSolarTime(instant, longitude).getTime();
      expect(apparent - lmt(instant, longitude).getTime()).toBe(offset);
    }
    expect(apparentSolarTime(instant, 180).getTime() - apparentSolarTime(instant, -180).getTime()).toBe(DAY);
  });

  it('rejects an out-of-range longitude', () => {
    expect(() => apparentSolarTime(utc('2026-03-20T12:00:00Z'), 181)).toThrow(RangeError);
  });
});
