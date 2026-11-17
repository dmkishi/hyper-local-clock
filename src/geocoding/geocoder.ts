/** A place a geocoder found for a search. */
export interface GeocoderResult {
  /** What the place is called, for example "Oakland". */
  name: string;
  /** Where it is, for example "California, United States". Absent when the service gives nothing more. */
  detail?: string;
  /** Degrees, north positive. */
  latitude: number;
  /** Degrees, east positive. */
  longitude: number;
}

/**
 * The seam between the app and a geocoding service. The app talks only to
 * this, so one service can be swapped for another without touching the UI.
 *
 * Both methods reject when the service cannot be reached or refuses, and when
 * the signal aborts.
 */
export interface Geocoder {
  /** Places matching free text, best match first. */
  search: (query: string, signal?: AbortSignal) => Promise<GeocoderResult[]>;
  /** A short name for a position, such as "Lakeshore, Oakland", or nothing when the service knows none. */
  reverse: (latitude: number, longitude: number, signal?: AbortSignal) => Promise<string | undefined>;
}

/** A service used only to name positions. */
export type ReverseGeocoder = Pick<Geocoder, 'reverse'>;

/**
 * Asks each geocoder in turn and returns the first name. A geocoder that
 * fails or knows no name hands over to the next one.
 *
 * Rejects only when none gave a name and at least one failed, so "nowhere
 * with a name" and "could not ask" stay distinct.
 */
export function withFallback(...geocoders: ReverseGeocoder[]): ReverseGeocoder {
  return {
    async reverse(latitude, longitude, signal): Promise<string | undefined> {
      let failure: Error | undefined;
      for (const geocoder of geocoders) {
        try {
          // oxlint-disable-next-line no-await-in-loop -- The next service is asked only after this one has come up empty.
          const name = await geocoder.reverse(latitude, longitude, signal);
          if (name !== undefined) return name;
        } catch (error) {
          failure = error instanceof Error ? error : new Error(String(error));
          if (signal?.aborted === true) break;
        }
      }
      if (failure) throw failure;
      return undefined;
    },
  };
}
