/** Where the clock is set: a fix from the device, or a place the user set by hand. */
export interface Place {
  /** Degrees, north positive, within [-90, 90]. */
  latitude: number;
  /** Degrees, east positive, within [-180, 180]. */
  longitude: number;
  /** Radius in meters that the device reports for its fix. Absent for a place set by hand. */
  accuracy?: number;
  /** What the place is called, such as "Lakeshore, Oakland". Absent until a geocoder has named it. */
  name?: string;
  source: 'device' | 'picked';
}

const STORAGE_KEY = 'hyper-local-clock:place';
const EARTH_RADIUS = 6_371_000;
const RADIANS = Math.PI / 180;

/**
 * Meters between two positions, treating the ground between them as flat.
 * Good to a fraction of a percent over a city, and cruder beyond that, which
 * is enough to tell "nearby" from "elsewhere".
 */
export function distanceMeters(
  from: Pick<Place, 'latitude' | 'longitude'>,
  to: Pick<Place, 'latitude' | 'longitude'>,
): number {
  // The shorter way around, so two places either side of the date line are close.
  const turn = (((to.longitude - from.longitude) % 360) + 540) % 360 - 180;
  const east = turn * RADIANS * Math.cos(((from.latitude + to.latitude) / 2) * RADIANS);
  const north = (to.latitude - from.latitude) * RADIANS;
  return EARTH_RADIUS * Math.hypot(east, north);
}

const within = (value: unknown, limit: number): value is number => typeof value === 'number' && Math.abs(value) <= limit;

function parsePlace(json: string): Place | undefined {
  const data: unknown = JSON.parse(json);
  if (typeof data !== 'object' || !data) return undefined;
  const fields = new Map<string, unknown>(Object.entries(data));
  const latitude = fields.get('latitude');
  const longitude = fields.get('longitude');
  const accuracy = fields.get('accuracy');
  const name = fields.get('name');
  const source = fields.get('source');
  if (!within(latitude, 90) || !within(longitude, 180)) return undefined;
  if (source !== 'device' && source !== 'picked') return undefined;
  const place: Place = { latitude, longitude, source };
  if (typeof accuracy === 'number' && accuracy >= 0) place.accuracy = accuracy;
  if (typeof name === 'string' && name) place.name = name;
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
