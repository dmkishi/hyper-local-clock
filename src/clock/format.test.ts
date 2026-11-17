import { describe, expect, it } from 'vitest';
import { formatEquationOfTime, formatLongitude, formatWallTime, wallTimeAttribute } from './format';

const wall = new Date('2026-03-20T21:18:46.008Z');
// Some locales put a narrow no-break space before AM and PM.
const plain = (text: string): string => text.replaceAll(/\s/gu, ' ');

describe('formatWallTime', () => {
  it('uses 12-hour time where the locale does', () => {
    expect(plain(formatWallTime(wall, { locale: 'en-US' }))).toBe('9:18 PM');
    expect(plain(formatWallTime(wall, { locale: 'en-US', seconds: true }))).toBe('9:18:46 PM');
  });

  it('uses 24-hour time where the locale does', () => {
    expect(formatWallTime(wall, { locale: 'en-GB' })).toBe('21:18');
    expect(formatWallTime(wall, { locale: 'en-GB', seconds: true })).toBe('21:18:46');
  });

  it('reads the UTC fields whatever the device zone', () => {
    expect(formatWallTime(new Date('2026-03-20T00:00:00Z'), { locale: 'en-GB', seconds: true })).toBe('0:00:00');
  });

  it('truncates to the second instead of rounding', () => {
    expect(formatWallTime(new Date('2026-03-20T21:18:46.999Z'), { locale: 'en-GB', seconds: true })).toBe('21:18:46');
  });
});

describe('wallTimeAttribute', () => {
  it('returns a 24-hour time for the datetime attribute', () => {
    expect(wallTimeAttribute(wall)).toBe('21:18:46');
  });
});

describe('formatEquationOfTime', () => {
  it('signs the value and splits it into minutes and seconds', () => {
    expect(formatEquationOfTime(16.45)).toBe('+16 min 27 s');
    expect(formatEquationOfTime(-14.2)).toBe('−14 min 12 s');
    expect(formatEquationOfTime(0.5)).toBe('+0 min 30 s');
  });

  it('carries rounded seconds into the minute', () => {
    expect(formatEquationOfTime(2.999)).toBe('+3 min 0 s');
  });

  it('leaves zero unsigned', () => {
    expect(formatEquationOfTime(-0.001)).toBe('0 min 0 s');
  });
});

describe('formatLongitude', () => {
  it('names the hemisphere', () => {
    expect(formatLongitude(139.6917)).toBe('139.6917° E');
    expect(formatLongitude(-74.006)).toBe('74.0060° W');
    expect(formatLongitude(0)).toBe('0.0000°');
  });
});
