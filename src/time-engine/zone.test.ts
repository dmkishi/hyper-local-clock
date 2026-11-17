import { describe, expect, it } from 'vitest';
import { zoneTime } from './index';

const at = (iso: string, timeZone: string) => {
  const { time, zoneName } = zoneTime(new Date(iso), { timeZone, locale: 'en-US' });
  return `${time.toISOString()} ${zoneName}`;
};

describe('zoneTime', () => {
  it('returns standard time and its zone name', () => {
    expect(at('2026-01-15T18:42:07Z', 'America/Los_Angeles')).toBe('2026-01-15T10:42:07.000Z PST');
  });

  it('follows daylight saving time', () => {
    expect(at('2026-07-15T17:42:07Z', 'America/Los_Angeles')).toBe('2026-07-15T10:42:07.000Z PDT');
  });

  it('switches at the daylight saving transition', () => {
    // US clocks spring forward at 2026-03-08T10:00Z in the Pacific zone.
    expect(at('2026-03-08T09:59:59Z', 'America/Los_Angeles')).toBe('2026-03-08T01:59:59.000Z PST');
    expect(at('2026-03-08T10:00:00Z', 'America/Los_Angeles')).toBe('2026-03-08T03:00:00.000Z PDT');
  });

  it('handles zones off the whole hour', () => {
    expect(at('2026-01-15T12:00:00Z', 'Asia/Kolkata')).toMatch(/^2026-01-15T17:30:00\.000Z /u);
    expect(at('2026-01-15T12:00:00Z', 'Asia/Kathmandu')).toMatch(/^2026-01-15T17:45:00\.000Z /u);
  });

  it('reads midnight as 00, not 24', () => {
    expect(at('2026-01-15T00:00:00Z', 'UTC')).toBe('2026-01-15T00:00:00.000Z UTC');
  });

  it('keeps sub-second precision', () => {
    const { time } = zoneTime(new Date('2026-01-15T18:42:07.250Z'), { timeZone: 'Asia/Tokyo' });
    expect(time.toISOString()).toBe('2026-01-16T03:42:07.250Z');
  });

  it('covers both sides of the date line, 26 hours apart at the extremes', () => {
    const instant = '2026-01-15T10:30:00Z';
    expect(at(instant, 'Pacific/Kiritimati')).toMatch(/^2026-01-16T00:30:00\.000Z /u);
    expect(at(instant, 'Etc/GMT+12')).toMatch(/^2026-01-14T22:30:00\.000Z /u);
  });

  it('covers the South Pole, which keeps New Zealand time', () => {
    expect(at('2026-01-15T12:00:00Z', 'Antarctica/South_Pole')).toMatch(/^2026-01-16T01:00:00\.000Z /u);
    expect(at('2026-07-15T12:00:00Z', 'Antarctica/South_Pole')).toMatch(/^2026-07-16T00:00:00\.000Z /u);
  });

  it('reports the resolved time zone', () => {
    expect(zoneTime(new Date(), { timeZone: 'Asia/Tokyo' }).timeZone).toBe('Asia/Tokyo');
  });

  it('defaults to the device zone and locale', () => {
    const now = new Date('2026-01-15T18:42:07Z');
    const { time, zoneName, timeZone } = zoneTime(now);
    expect(timeZone).toBe(new Intl.DateTimeFormat().resolvedOptions().timeZone);
    expect(zoneName).not.toBe('');
    expect(time.getTime() - now.getTime()).toBe(-now.getTimezoneOffset() * 60_000);
  });

  it('rejects an unknown time zone', () => {
    expect(() => zoneTime(new Date(), { timeZone: 'Mars/Olympus_Mons' })).toThrow(RangeError);
  });
});
