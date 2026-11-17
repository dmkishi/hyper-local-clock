interface TimeFormatOptions {
  /** Include seconds. Defaults to false. */
  seconds?: boolean;
  /** BCP 47 locale. Defaults to the device's, which also picks 12- or 24-hour time. */
  locale?: string;
}

const formatters = new Map<string, Intl.DateTimeFormat>();

/**
 * Formats a wall time from the time engine: a `Date` whose UTC fields read as
 * the local clock.
 */
export function formatWallTime(wall: Date, { seconds = false, locale }: TimeFormatOptions = {}): string {
  const key = `${locale ?? ''}|${seconds}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, {
      timeZone: 'UTC',
      hour: 'numeric',
      minute: '2-digit',
      second: seconds ? '2-digit' : undefined,
    });
    formatters.set(key, formatter);
  }
  return formatter.format(wall);
}

/** The wall time as a machine-readable `HH:MM:SS` string for `<time datetime>`. */
export function wallTimeAttribute(wall: Date): string {
  return wall.toISOString().slice(11, 19);
}

/** Formats the equation of time, given in minutes, as for example "+3 min 41 s". */
export function formatEquationOfTime(minutes: number): string {
  const totalSeconds = Math.round(Math.abs(minutes) * 60);
  let sign = '';
  if (totalSeconds > 0) sign = minutes < 0 ? '−' : '+';
  return `${sign}${Math.floor(totalSeconds / 60)} min ${totalSeconds % 60} s`;
}

/** Formats a longitude in degrees, east positive, as for example "139.6917° E". */
export function formatLongitude(longitude: number): string {
  let hemisphere = '';
  if (longitude !== 0) hemisphere = longitude < 0 ? ' W' : ' E';
  return `${Math.abs(longitude).toFixed(4)}°${hemisphere}`;
}

/** Formats the radius of a position fix, given in meters, as for example "±12 m" or "±1.5 km". */
export function formatAccuracy(meters: number): string {
  const rounded = Math.max(1, Math.round(meters));
  return rounded < 1_000 ? `±${rounded} m` : `±${(rounded / 1_000).toFixed(1)} km`;
}
