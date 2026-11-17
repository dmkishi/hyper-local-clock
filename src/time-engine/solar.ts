/**
 * Longitude-based time. Every function here returns a "wall time": a `Date`
 * shifted so that its UTC fields (`getUTCHours()`, or `Intl.DateTimeFormat`
 * with `timeZone: 'UTC'`) read as the local clock. It is not a real instant.
 */

const MS_PER_MINUTE = 60_000;
const MS_PER_DAY = 86_400_000;
/** The mean sun crosses one degree of longitude every 4 minutes. */
const MS_PER_DEGREE = 4 * MS_PER_MINUTE;
/** Days from the Unix epoch to J2000.0 (2000-01-01T12:00Z). */
const J2000_UNIX_DAYS = 10_957.5;

const radians = (degrees: number): number => (degrees * Math.PI) / 180;
const degrees = (rad: number): number => (rad * 180) / Math.PI;

function assertLongitude(longitude: number): void {
  if (!(longitude >= -180 && longitude <= 180)) {
    throw new RangeError(`Longitude must be within -180 and 180 degrees, got ${longitude}`);
  }
}

/** Wraps an angle in degrees into [-180, 180). */
function wrapDegrees(angle: number): number {
  return ((((angle + 180) % 360) + 360) % 360) - 180;
}

/**
 * Local mean time: UTC plus 4 minutes per degree of longitude east.
 *
 * @param utc The instant to convert.
 * @param longitude Degrees, east positive, within [-180, 180].
 * @returns A wall time whose UTC fields read as LMT.
 */
export function lmt(utc: Date, longitude: number): Date {
  assertLongitude(longitude);
  return new Date(utc.getTime() + Math.round(longitude * MS_PER_DEGREE));
}

/**
 * Equation of time: apparent solar time minus mean solar time, in minutes.
 * Positive when the sundial runs ahead of the mean clock.
 *
 * Uses the low-precision solar position formulas from the Astronomical
 * Almanac, good to a few seconds between 1950 and 2050.
 */
export function equationOfTime(date: Date): number {
  const n = date.getTime() / MS_PER_DAY - J2000_UNIX_DAYS;
  const meanLongitude = 280.46 + 0.9856474 * n;
  const meanAnomaly = radians(357.528 + 0.9856003 * n);
  const eclipticLongitude = radians(
    meanLongitude + 1.915 * Math.sin(meanAnomaly) + 0.02 * Math.sin(2 * meanAnomaly),
  );
  const obliquity = radians(23.439 - 0.0000004 * n);
  const rightAscension = degrees(
    Math.atan2(Math.cos(obliquity) * Math.sin(eclipticLongitude), Math.cos(eclipticLongitude)),
  );
  return wrapDegrees(meanLongitude - rightAscension) * 4;
}

/**
 * Apparent solar time: LMT plus the equation of time. At 12:00 the sun is at
 * its highest point.
 *
 * @param utc The instant to convert.
 * @param longitude Degrees, east positive, within [-180, 180].
 * @returns A wall time whose UTC fields read as apparent solar time.
 */
export function apparentSolarTime(utc: Date, longitude: number): Date {
  const mean = lmt(utc, longitude);
  return new Date(mean.getTime() + Math.round(equationOfTime(utc) * MS_PER_MINUTE));
}
