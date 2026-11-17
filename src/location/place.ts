/** Where the clock is set: a fix from the device, or a place the user set by hand. */
export interface Place {
  /** Degrees, north positive, within [-90, 90]. */
  latitude: number;
  /** Degrees, east positive, within [-180, 180]. */
  longitude: number;
  /** Radius in meters that the device reports for its fix. Absent for a place set by hand. */
  accuracy?: number;
  source: 'device' | 'picked';
}

const STORAGE_KEY = 'hyper-local-clock:place';

const within = (value: unknown, limit: number): value is number => typeof value === 'number' && Math.abs(value) <= limit;

function parsePlace(json: string): Place | undefined {
  const data: unknown = JSON.parse(json);
  if (typeof data !== 'object' || !data) return undefined;
  const fields = new Map<string, unknown>(Object.entries(data));
  const latitude = fields.get('latitude');
  const longitude = fields.get('longitude');
  const accuracy = fields.get('accuracy');
  const source = fields.get('source');
  if (!within(latitude, 90) || !within(longitude, 180)) return undefined;
  if (source !== 'device' && source !== 'picked') return undefined;
  const place: Place = { latitude, longitude, source };
  if (typeof accuracy === 'number' && accuracy >= 0) place.accuracy = accuracy;
  return place;
}

/** The place saved on the last visit, or nothing when there is none, it is malformed, or storage is blocked. */
export function loadPlace(): Place | undefined {
  try {
    const json = localStorage.getItem(STORAGE_KEY);
    return typeof json === 'string' ? parsePlace(json) : undefined;
  } catch {
    return undefined;
  }
}

/** Remembers the place for the next visit. Does nothing when storage is blocked. */
export function savePlace(place: Place): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(place));
  } catch {
    // Private windows and blocked site data: the clock still runs for this visit.
  }
}
