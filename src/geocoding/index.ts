import { withFallback, type Geocoder } from './geocoder';
import { nominatim } from './nominatim';
import { photon } from './photon';

export type { GeocoderResult } from './geocoder';
export { createSearch, type SearchState } from './search';

/**
 * The geocoder the app uses. Swapping services means changing this one
 * binding: Photon searches and names places, and Nominatim names a place when
 * Photon cannot.
 */
export const geocoder: Geocoder = {
  search: photon.search,
  reverse: withFallback(photon, nominatim).reverse,
};
